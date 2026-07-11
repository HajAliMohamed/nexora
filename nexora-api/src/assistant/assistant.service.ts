import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { SiteAudit } from '../audits/entities/site-audit.entity';
import { AuditIssue } from '../audits/entities/audit-issue.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(SiteAudit)
    private readonly auditRepo: Repository<SiteAudit>,
    @InjectRepository(AuditIssue)
    private readonly issueRepo: Repository<AuditIssue>,
    @InjectRepository(Keyword)
    private readonly keywordRepo: Repository<Keyword>,
    @InjectRepository(KeywordPosition)
    private readonly positionRepo: Repository<KeywordPosition>,
  ) {}

  async askQuestion(projectId: string, question: string): Promise<{
    answer: string;
    context: Record<string, unknown>;
  }> {
    const groqApiKey = this.configService.get('GROQ_API_KEY');

    if (!groqApiKey) {
      return {
        answer: 'Service IA non configuré. Ajoutez une clé GROQ_API_KEY dans le fichier .env.',
        context: { source: 'error', projectId },
      };
    }

    try {
      return await this.callGroq(projectId, question, groqApiKey);
    } catch (error) {
      this.logger.error(`Groq API error: ${error.message}`);
      return {
        answer: 'Service IA temporairement indisponible. Réessayez plus tard.',
        context: { source: 'error', projectId },
      };
    }
  }

  async askWithContext(projectId: string, question: string): Promise<{
    answer: string;
    context: Record<string, unknown>;
  }> {
    const groqApiKey = this.configService.get('GROQ_API_KEY');

    if (!groqApiKey) {
      return {
        answer: 'Service IA non configuré. Ajoutez une clé GROQ_API_KEY dans le fichier .env.',
        context: { source: 'error', projectId },
      };
    }

    try {
      const contextData = await this.gatherProjectContext(projectId);
      return await this.callGroqWithContext(projectId, question, contextData, groqApiKey);
    } catch (error) {
      this.logger.error(`Groq copilot error: ${error.message}`);
      return {
        answer: 'Service IA temporairement indisponible. Réessayez plus tard.',
        context: { source: 'error', projectId },
      };
    }
  }

  private async gatherProjectContext(projectId: string): Promise<string> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) return 'Projet introuvable.';

    const parts: string[] = [];
    parts.push(`Site: ${project.name} (${project.domain}), pays: ${project.countryCode}, langue: ${project.languageCode}`);

    const latestAudit = await this.auditRepo.findOne({
      where: { projectId, status: 'done' },
      order: { createdAt: 'DESC' },
    });
    if (latestAudit) {
      parts.push(`Dernier audit SEO: score ${latestAudit.score ?? 'N/A'}/100, ${latestAudit.pagesCrawled} pages crawlées.`);
      const criticalIssues = await this.issueRepo.count({ where: { auditId: latestAudit.id, severity: 'critical' } });
      const highIssues = await this.issueRepo.count({ where: { auditId: latestAudit.id, severity: 'high' } });
      const mediumIssues = await this.issueRepo.count({ where: { auditId: latestAudit.id, severity: 'medium' } });
      if (criticalIssues + highIssues + mediumIssues > 0) {
        parts.push(`Problèmes détectés: ${criticalIssues} critiques, ${highIssues} élevés, ${mediumIssues} moyens.`);
      }
    }

    const keywords = await this.keywordRepo.find({ where: { projectId } });
    if (keywords.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      let positionSum = 0;
      let positionCount = 0;
      let top10Count = 0;
      for (const kw of keywords) {
        const pos = await this.positionRepo.findOne({ where: { keywordId: kw.id, date: todayStr } });
        if (pos && pos.position !== null && pos.position !== undefined) {
          positionSum += pos.position;
          positionCount++;
          if (pos.position <= 10) top10Count++;
        }
      }
      parts.push(`${keywords.length} mots-clés suivis.`);
      if (positionCount > 0) {
        parts.push(`Position moyenne: ${(positionSum / positionCount).toFixed(1)}, ${top10Count} dans le top 10.`);
      }
    }

    return parts.join('\n');
  }

  private async callGroq(projectId: string, question: string, apiKey: string): Promise<{
    answer: string;
    context: Record<string, unknown>;
  }> {
    const systemPrompt = `Tu es un assistant SEO expert pour la plateforme Nexora. 
Tu aides les agences marketing à analyser les performances SEO de leurs clients.
Réponds en français, sois concis et donne des recommandations actionnables.
Projet ID: ${projectId}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned ${response.status}`);
    }

    const data = await response.json() as any;
    const answer = data.choices?.[0]?.message?.content || 'Réponse non disponible';

    return {
      answer,
      context: {
        source: 'groq',
        model: 'llama-3.3-70b-versatile',
        projectId,
      },
    };
  }

  private async callGroqWithContext(
    projectId: string,
    question: string,
    contextData: string,
    apiKey: string,
  ): Promise<{
    answer: string;
    context: Record<string, unknown>;
  }> {
    const systemPrompt = `Tu es un copilote SEO personnalisé pour les clients de Nexora.
Tu aides les clients à comprendre les performances SEO de leur site.
Réponds en français, sois pédagogique et donne des explications claires.
Utilise les données ci-dessous pour contextualiser ta réponse.

DONNÉES DU PROJET:
${contextData}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 1024,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned ${response.status}`);
    }

    const data = await response.json() as any;
    const answer = data.choices?.[0]?.message?.content || 'Réponse non disponible';

    return {
      answer,
      context: {
        source: 'groq',
        model: 'llama-3.3-70b-versatile',
        projectId,
        mode: 'copilot',
      },
    };
  }
}
