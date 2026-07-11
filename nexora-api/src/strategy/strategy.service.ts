import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { StrategyRoadmap } from './strategy-roadmap.entity';
import { Project } from '../projects/entities/project.entity';
import { SiteAudit } from '../audits/entities/site-audit.entity';
import { AuditIssue } from '../audits/entities/audit-issue.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { Competitor } from '../projects/entities/competitor.entity';
import { AiSearchSnapshot } from '../ai-search/entities/ai-search-snapshot.entity';

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  constructor(
    @InjectRepository(StrategyRoadmap)
    private readonly roadmapRepo: Repository<StrategyRoadmap>,
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
    @InjectRepository(Competitor)
    private readonly competitorRepo: Repository<Competitor>,
    @InjectRepository(AiSearchSnapshot)
    private readonly snapshotRepo: Repository<AiSearchSnapshot>,
    private readonly configService: ConfigService,
  ) {}

  async generateStrategy(
    projectId: string,
    opts?: { businessGoal?: string; horizonDays?: number },
  ): Promise<StrategyRoadmap> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new Error('Projet introuvable');

    const businessGoal = opts?.businessGoal || 'traffic';
    const horizonDays = opts?.horizonDays || 90;

    const contextData = await this.gatherContext(project);

    const groqApiKey = this.configService.get('GROQ_API_KEY');
    let content: Record<string, unknown>;

    if (!groqApiKey) {
      content = this.generateFallbackStrategy(project, businessGoal, horizonDays);
    } else {
      content = await this.callGroqForStrategy(project, contextData, businessGoal, horizonDays, groqApiKey);
    }

    const roadmap = this.roadmapRepo.create({
      projectId,
      content,
      horizonDays,
      businessGoal,
    });

    return this.roadmapRepo.save(roadmap);
  }

  async getLatestStrategy(projectId: string): Promise<StrategyRoadmap | null> {
    return this.roadmapRepo.findOne({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  private async gatherContext(project: Project): Promise<string> {
    const parts: string[] = [];
    parts.push(`Site: ${project.name} (${project.domain}), pays: ${project.countryCode}, langue: ${project.languageCode}`);

    const latestAudit = await this.auditRepo.findOne({
      where: { projectId: project.id, status: 'done' },
      order: { createdAt: 'DESC' },
    });

    if (latestAudit) {
      parts.push(`Score SEO: ${latestAudit.score}/100, pages crawlées: ${latestAudit.pagesCrawled}`);
      const criticalIssues = await this.issueRepo.count({ where: { auditId: latestAudit.id, severity: 'critical' } });
      const highIssues = await this.issueRepo.count({ where: { auditId: latestAudit.id, severity: 'high' } });
      const mediumIssues = await this.issueRepo.count({ where: { auditId: latestAudit.id, severity: 'medium' } });
      parts.push(`Problèmes: ${criticalIssues} critiques, ${highIssues} élevés, ${mediumIssues} moyens.`);
    }

    const keywords = await this.keywordRepo.find({ where: { projectId: project.id }, take: 20 });
    if (keywords.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      let top3Count = 0, top10Count = 0;
      for (const kw of keywords) {
        const pos = await this.positionRepo.findOne({ where: { keywordId: kw.id, date: todayStr } });
        if (pos && pos.position !== null && pos.position !== undefined) {
          if (pos.position <= 3) top3Count++;
          else if (pos.position <= 10) top10Count++;
        }
      }
      parts.push(`${keywords.length} mots-clés suivis: ${top3Count} dans le top 3, ${top10Count} dans le top 10.`);
    }

    const competitors = await this.competitorRepo.find({ where: { projectId: project.id } });
    if (competitors.length > 0) {
      parts.push(`${competitors.length} concurrents suivis: ${competitors.map(c => c.domain).join(', ')}`);
    }

    const snapshots = await this.snapshotRepo.find({
      where: { projectId: project.id },
      order: { snapshotDate: 'DESC' },
      take: 50,
    });
    if (snapshots.length > 0) {
      const presentCount = snapshots.filter(s => s.present).length;
      const aiScore = Math.round((presentCount / snapshots.length) * 100);
      parts.push(`Visibilité IA Search: ${aiScore}/100 (${presentCount}/${snapshots.length} prompts)`);
    }

    return parts.join('\n');
  }

  private async callGroqForStrategy(
    project: Project,
    contextData: string,
    businessGoal: string,
    horizonDays: number,
    apiKey: string,
  ): Promise<Record<string, unknown>> {
    const systemPrompt = `Tu es un stratège SEO senior pour la plateforme Nexora.
Tu génères des feuilles de route SEO stratégiques sur ${horizonDays} jours.
Réponds en français avec un JSON structéré contenant:
- "summary": résumé de la stratégie (2-3 phrases)
- "phases": tableau de 3 phases, chaque phase ayant: name, days (["D1-D15", "D16-D45", etc.]), goal, actions (tableau de strings)
- "kpis": tableau d'objectifs chiffrés, chaque objet ayant: metric, targetValue, timeframe
- "priorities": tableau de 3-5 actions prioritaires classées par impact`;

    const userPrompt = `Génère une stratégie SEO ${businessGoal === 'leads' ? 'orientée génération de leads' : businessGoal === 'authority' ? 'orientée autorité' : 'orientée trafic'} pour le site suivant:

${contextData}

Retourne UNIQUEMENT le JSON, sans texte avant ou après.`;

    try {
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
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2048,
          temperature: 0.5,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) throw new Error(`Groq API returned ${response.status}`);
      const data = await response.json() as any;
      const rawContent = data.choices?.[0]?.message?.content || '{}';
      return JSON.parse(rawContent);
    } catch (err) {
      this.logger.error(`Groq strategy generation failed: ${(err as Error).message}`);
      return this.generateFallbackStrategy(project, businessGoal, horizonDays) as Record<string, unknown>;
    }
  }

  private generateFallbackStrategy(
    project: Project,
    businessGoal: string,
    horizonDays: number,
  ): Record<string, unknown> {
    return {
      summary: `Stratégie SEO ${businessGoal === 'leads' ? 'génération de leads' : businessGoal === 'authority' ? 'autorité' : 'trafic'} pour ${project.name} sur ${horizonDays} jours.`,
      phases: [
        {
          name: 'Audit & fondations',
          days: 'D1-D15',
          goal: 'Identifier et corriger les blocages techniques',
          actions: [
            'Audit technique complet du site',
            'Correction des erreurs critiques',
            'Optimisation des pages existantes',
          ],
        },
        {
          name: 'Production & optimisation',
          days: 'D16-D45',
          goal: 'Produire du contenu optimisé et renforcer les signaux SEO',
          actions: [
            'Création de contenu ciblé sur les mots-clés à fort potentiel',
            'Optimisation on-page des pages stratégiques',
            'Mise en place d\'une stratégie de maillage interne',
          ],
        },
        {
          name: 'Scaling & monitoring',
          days: `D46-D${horizonDays}`,
          goal: 'Passer à l\'échelle et surveiller les performances',
          actions: [
            'Déploiement de contenu additionnel',
            'Surveillance des positions et ajustements',
            'Rapport de performance et recommandations',
          ],
        },
      ],
      kpis: [
        { metric: 'Pages crawlées', targetValue: 200, timeframe: '30 jours' },
        { metric: 'Mots-clés dans le top 10', targetValue: 15, timeframe: '60 jours' },
      ],
      priorities: [
        'Corriger les erreurs techniques critiques',
        'Optimiser les pages à fort potentiel',
        'Produire du contenu régulier',
      ],
    };
  }
}
