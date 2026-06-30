import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { SiteAudit } from '../audits/entities/site-audit.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { Report } from './entities/report.entity';
import { AiSearchSnapshot } from '../ai-search/entities/ai-search-snapshot.entity';
import { GrowthSignal } from '../growth-engine/entities/growth-signal.entity';
import { ConfigService } from '@nestjs/config';

export interface ReportData {
  projectId: string;
  period: { from: Date; to: Date };
  project: Project;
  seo: {
    globalScore: number;
    categoryScores: Record<string, number>;
    totalKeywords: number;
    avgPosition: number | null;
    issuesCount: number;
  };
  ai: {
    visibilityScore: number;
    snapshots: any[];
    opportunities: { prompt: string; source: string }[];
  };
  growth: {
    pages: { url: string; delta: number; status: string }[];
    keywords: { keyword: string; position: number; change: number }[];
    backlinks: { source: string; impact: number; type: string }[];
    potentialScore: number;
  };
  recommendations: { title: string; description: string; priority: string; impact: string }[];
  narrative: string;
  scores: {
    seoHealth: number;
    aiVisibility: number;
    growthPotential: number;
  };
}

@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(SiteAudit)
    private readonly auditRepo: Repository<SiteAudit>,
    @InjectRepository(Keyword)
    private readonly keywordRepo: Repository<Keyword>,
    @InjectRepository(KeywordPosition)
    private readonly positionRepo: Repository<KeywordPosition>,
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(AiSearchSnapshot)
    private readonly aiSnapshotRepo: Repository<AiSearchSnapshot>,
    @InjectRepository(GrowthSignal)
    private readonly growthSignalRepo: Repository<GrowthSignal>,
    private readonly configService: ConfigService,
  ) {}

  async buildReport(projectId: string, periodType: 'weekly' | 'monthly' | 'quarterly'): Promise<ReportData> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const now = new Date();
    const from = this.getPeriodStart(now, periodType);

    const [seo, ai, growth] = await Promise.all([
      this.getSeoMetrics(projectId),
      this.getAiVisibility(projectId),
      this.getGrowthSignals(projectId),
    ]);

    const recommendations = this.generateRecommendations(seo, ai, growth);
    const narrative = await this.generateNarrative(project.name, seo, ai, growth, periodType);

    const scores = {
      seoHealth: seo.globalScore,
      aiVisibility: ai.visibilityScore,
      growthPotential: growth.potentialScore,
    };

    return {
      projectId,
      period: { from, to: now },
      project,
      seo,
      ai,
      growth,
      recommendations,
      narrative,
      scores,
    };
  }

  async saveReport(data: ReportData): Promise<Report> {
    return this.reportRepo.save({
      projectId: data.projectId,
      periodType: 'monthly',
      seoScore: data.scores.seoHealth,
      aiScore: data.scores.aiVisibility,
      growthScore: data.scores.growthPotential,
      narrative: data.narrative,
      recommendations: data.recommendations,
      scores: data.scores,
    } as any);
  }

  private getPeriodStart(to: Date, periodType: string): Date {
    const from = new Date(to);
    if (periodType === 'weekly') {
      from.setDate(from.getDate() - 7);
    } else if (periodType === 'monthly') {
      from.setMonth(from.getMonth() - 1);
    } else {
      from.setMonth(from.getMonth() - 3);
    }
    return from;
  }

  private async getSeoMetrics(projectId: string) {
    const lastAudit = await this.auditRepo.findOne({
      where: { projectId, status: 'done' as any },
      order: { createdAt: 'DESC' },
    });

    const keywords = await this.keywordRepo.find({ where: { projectId } });

    let positionSum = 0;
    let positionCount = 0;
    for (const kw of keywords) {
      const pos = await this.positionRepo.findOne({
        where: { keywordId: kw.id },
        order: { date: 'DESC' },
      });
      if (pos?.position) {
        positionSum += pos.position;
        positionCount++;
      }
    }

    return {
      globalScore: lastAudit?.score ?? 0,
      categoryScores: (lastAudit?.categoryScores as any) ?? {},
      totalKeywords: keywords.length,
      avgPosition: positionCount > 0 ? Math.round(positionSum / positionCount * 10) / 10 : null,
      issuesCount: 0,
    };
  }

  private async getAiVisibility(projectId: string) {
    const snapshots = await this.aiSnapshotRepo.find({
      where: { projectId },
      order: { snapshotDate: 'DESC' },
      take: 50,
    });

    if (snapshots.length === 0) {
      return {
        visibilityScore: 0,
        snapshots: [],
        opportunities: [],
      };
    }

    const present = snapshots.filter(s => s.present).length;
    const visibilityScore = Math.round((present / snapshots.length) * 100);
    const opportunities = snapshots
      .filter(s => !s.present)
      .map(s => ({ prompt: s.prompt, source: s.source }));

    return { visibilityScore, snapshots, opportunities };
  }

  private async getGrowthSignals(projectId: string) {
    const signals = await this.growthSignalRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: 30,
    });

    const pages = signals
      .filter(s => s.type === 'page')
      .map(s => s.data as any);
    const keywords = signals
      .filter(s => s.type === 'keyword')
      .map(s => s.data as any);
    const backlinks = signals
      .filter(s => s.type === 'backlink')
      .map(s => s.data as any);

    const potentialScore = Math.min(100, Math.round(
      (pages.filter((p: any) => p.status === 'rising').length * 8) +
      (keywords.length * 10) +
      (backlinks.length * 12)
    ));

    return { pages, keywords, backlinks, potentialScore };
  }

  private generateRecommendations(seo: any, ai: any, growth: any) {
    const recs: { title: string; description: string; priority: string; impact: string }[] = [];

    if (seo.globalScore < 50) {
      recs.push({
        title: 'Améliorer le score SEO technique',
        description: 'Le score technique est en dessous de 50. Corrigez les erreurs critiques détectées lors de l\'audit.',
        priority: 'high',
        impact: '+20 points SEO',
      });
    }

    if (ai.visibilityScore < 50) {
      recs.push({
        title: 'Optimiser pour la visibilité IA',
        description: 'Structuredz votre contenu avec des balises sitemap, FAQ schema et réponses directes pour les AI Overviews.',
        priority: 'high',
        impact: '+15 points visibilité IA',
      });
    }

    if (growth.potentialScore > 60) {
      recs.push({
        title: 'Capitaliser sur les signaux de croissance',
        description: `${growth.pages.length} pages montrent une croissance. Renforcez le maillage interne vers ces pages.`,
        priority: 'medium',
        impact: '+10 points potentiel',
      });
    }

    recs.push({
      title: 'Publier du contenu régulièrement',
      description: 'Maintenez une cadence de 2-4 articles par mois ciblant vos mots-clés à fort potentiel.',
      priority: 'medium',
      impact: '+12% trafic organique',
    });

    recs.push({
      title: 'Surveiller les concurrents',
      description: 'Analysez mensuellement les nouvelles stratégies de vos concurrents pour rester compétitif.',
      priority: 'low',
      impact: 'Avantage compétitif',
    });

    return recs;
  }

  private async generateNarrative(
    projectName: string,
    seo: any,
    ai: any,
    growth: any,
    periodType: string,
  ): Promise<string> {
    const groqApiKey = this.configService.get('GROQ_API_KEY');

    if (groqApiKey) {
      try {
        const periodLabel = periodType === 'weekly' ? 'cette semaine' : periodType === 'monthly' ? 'ce mois-ci' : 'ce trimestre';
        const prompt = `Tu es un expert SEO rédigeant un rapport narratif pour le projet "${projectName}".
Voici les données du rapport ${periodType} :

SEO
- Score global: ${seo.globalScore}/100
- Mots-clés suivis: ${seo.totalKeywords}
- Position moyenne: ${seo.avgPosition ?? 'N/A'}
- Catégories: ${JSON.stringify(seo.categoryScores)}

IA Visibility
- Score de visibilité: ${ai.visibilityScore}%
- Opportunités identifiées: ${ai.opportunities.length}
- Thèmes: ${ai.opportunities.slice(0, 3).map((o: any) => o.prompt).join(', ')}

Growth
- Potentiel de croissance: ${growth.potentialScore}/100
- Pages en progression: ${growth.pages.length}
- Mots-clés proches du top 3: ${growth.keywords.length}

Rédige un rapport narratif en français, direct et professionnel (3-4 paragraphes max). 
Inclus les chiffres clés, une analyse de la tendance, et 2-3 recommandations actionnables.
Termine par une phrase d'encouragement ou de défi.
N'utilise PAS de markdown ni d'emojis.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Tu es un expert SEO qui rédige des rapports narratifs en français.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 512,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json() as any;
          const answer = data.choices?.[0]?.message?.content;
          if (answer) return answer;
        }
      } catch (err) {
        this.logger.warn(`Failed to generate AI narrative: ${(err as Error).message}`);
      }
    }

    return 'Analyse narrative non disponible pour cette période.';
  }
}
