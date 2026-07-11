import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import { AiSearchSnapshot } from './entities/ai-search-snapshot.entity';
import { Project } from '../projects/entities/project.entity';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private browser: any = null;

  constructor(
    @InjectRepository(AiSearchSnapshot)
    private readonly snapshotRepo: Repository<AiSearchSnapshot>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly configService: ConfigService,
    private readonly alertsService: AlertsService,
  ) {}

  async computeVisibility(projectId: string): Promise<{
    visibilityScore: number;
    snapshots: AiSearchSnapshot[];
    opportunities: { prompt: string; source: string }[];
  }> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      return { visibilityScore: 0, snapshots: [], opportunities: [] };
    }

    const existing = await this.snapshotRepo.find({
      where: { projectId },
      order: { snapshotDate: 'DESC' },
      take: 50,
    });

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    if (existing.length === 0 || existing[0].snapshotDate < oneDayAgo) {
      const newSnapshots = await this.scrapeAiVisibility(project.domain, projectId);
      if (newSnapshots.length > 0) {
        await this.snapshotRepo.save(newSnapshots);
        const all = await this.snapshotRepo.find({
          where: { projectId },
          order: { snapshotDate: 'DESC' },
          take: 50,
        });
        return this.computeFromSnapshots(all);
      }
    }

    return this.computeFromSnapshots(existing);
  }

  private async getBrowser(): Promise<any> {
    if (this.browser) return this.browser;
    const { default: puppeteer } = await import('puppeteer');
    const envPath = this.configService.get('PUPPETEER_EXECUTABLE_PATH');
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: envPath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    return this.browser;
  }

  private async scrapeGoogle(query: string): Promise<{ url: string; snippet: string }[]> {
    let page: any = null;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' });
      await page.goto(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=fr&gl=fr&num=10`,
        { waitUntil: 'networkidle2', timeout: 20000 },
      );
      const html = await page.content();
      const $ = cheerio.load(html);

      const results: { url: string; snippet: string }[] = [];
      $('div.MjjYud').each((_, el) => {
        const link = $(el).find('a').first();
        const href = link.attr('href');
        const snippet = $(el).find('div[data-sncf], div.VwiC3b, span.aCOpRe, span[role="text"]').text().trim();
        if (href && href.startsWith('http')) {
          results.push({ url: href, snippet: snippet.substring(0, 500) });
        }
      });

      return results;
    } catch (err) {
      this.logger.warn(`Google scrape failed for "${query}": ${(err as Error).message}`);
      return [];
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  private async scrapeAiVisibility(domain: string, projectId: string): Promise<Partial<AiSearchSnapshot>[]> {
    const topics = await this.extractHomepageTopics(domain);
    const prompts = this.getRelevantPrompts(domain, topics);
    const domainLower = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');

    const results = await Promise.all(
      prompts.map(async (prompt) => {
        try {
          const searchResults = await this.scrapeGoogle(prompt);

          const matched = searchResults.find(
            (r) =>
              r.url.toLowerCase().includes(domainLower) ||
              r.snippet.toLowerCase().includes(domainLower),
          );

          if (matched) {
            this.logger.debug(`"${prompt}" → domain found in ${matched.url}`);
          }

          return {
            projectId,
            prompt,
            present: !!matched,
            source: 'google_ai',
            extra: {
              snippet: matched ? matched.snippet : '',
              scrapedAt: new Date().toISOString(),
            },
          } satisfies Partial<AiSearchSnapshot>;
        } catch (err) {
          this.logger.warn(`Google search failed for "${prompt}": ${(err as Error).message}`);
          return this.emptySnapshot(projectId, prompt);
        }
      }),
    );

    await this.closeBrowser();
    return results;
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      try { await this.browser.close(); } catch { /* ignore */ }
      this.browser = null;
    }
  }

  private computeFromSnapshots(snapshots: AiSearchSnapshot[]) {
    const present = snapshots.filter(s => s.present).length;
    const visibilityScore = snapshots.length > 0
      ? Math.round((present / snapshots.length) * 100)
      : 0;
    const opportunities = snapshots
      .filter(s => !s.present)
      .map(s => ({ prompt: s.prompt, source: s.source }));

    return { visibilityScore, snapshots, opportunities };
  }

  private getRelevantPrompts(domain: string, topics: string[]): string[] {
    const brand = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0];
    const prompts: string[] = [
      `${brand} avis`,
      `agence seo ${brand}`,
    ];
    for (const topic of topics) {
      if (prompts.length < 8) {
        prompts.push(`${brand} ${topic}`);
      }
    }
    return prompts;
  }

  private async extractHomepageTopics(domain: string): Promise<string[]> {
    const stopWords = new Set([
      'le','la','les','de','des','du','un','une','et','est','sont','dans','pour','sur','avec',
      'par','pas','plus','que','qui','quoi','dont','ou','où','il','elle','on','nous','vous',
      'ils','elles','ce','cet','cette','ces','mon','ton','son','ma','ta','sa','mes','tes','ses',
      'notre','votre','leur','nos','vos','leurs','au','aux','en','y','a','ai','as','avez',
      'ont','avait','étaient','sera','si','the','and','for','are','but','not','you','all',
      'can','had','her','was','one','our','out','has','have','been','from','they','this',
      'that','with','what','your','their','will','would','could','should','about','which',
      'accueil','home','page','index','html','php','www','http','https','com','net','org',
      'fr','cookies','politique','confidentialité','mentions','légales','contact','blog',
      'news','shop','store','login','signup','inscription','connexion','search','recherche',
    ]);

    let page: any = null;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(`https://${domain}`, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const html = await page.content();
      const $ = cheerio.load(html);

      const textParts: string[] = [];
      textParts.push($('title').first().text());
      textParts.push($('h1').first().text());
      $('meta[name="description"]').each((_, el) => {
        const content = $(el).attr('content');
        if (content) textParts.push(content);
      });

      const text = textParts.filter(Boolean).join(' ').toLowerCase();
      const words = text
        .replace(/[^a-zéèêëàâäôöûüùîïç0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      const freq = new Map<string, number>();
      for (const w of words) {
        freq.set(w, (freq.get(w) || 0) + 1);
      }

      return [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([word]) => word);
    } catch (err) {
      this.logger.warn(`Failed to extract homepage topics for ${domain}: ${(err as Error).message}`);
      return [];
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  async computeDefense(projectId: string, userId?: string): Promise<{
    visibilityScore: number;
    trend: 'up' | 'down' | 'stable';
    lostPrompts: { prompt: string; source: string }[];
    gainedPrompts: { prompt: string; source: string }[];
    fixSuggestions: string[];
  }> {
    const snapshots = await this.snapshotRepo.find({
      where: { projectId },
      order: { snapshotDate: 'DESC' },
      take: 100,
    });

    if (snapshots.length === 0) {
      return { visibilityScore: 0, trend: 'stable', lostPrompts: [], gainedPrompts: [], fixSuggestions: [] };
    }

    const latestDate = snapshots[0].snapshotDate;
    const weekAgo = new Date(latestDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentSnapshots = snapshots.filter(s => s.snapshotDate >= weekAgo);
    const olderSnapshots = snapshots.filter(s => s.snapshotDate < weekAgo && s.snapshotDate >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000));

    const current = this.computeFromSnapshots(recentSnapshots);
    const previous = olderSnapshots.length > 0 ? this.computeFromSnapshots(olderSnapshots) : null;

    const currentPresentPrompts = new Set(recentSnapshots.filter(s => s.present).map(s => s.prompt));
    const previousPresentPrompts = new Set(olderSnapshots.filter(s => s.present).map(s => s.prompt));

    const lostPrompts = [...previousPresentPrompts].filter(p => !currentPresentPrompts.has(p)).map(p => ({
      prompt: p, source: 'google_ai',
    }));
    const gainedPrompts = [...currentPresentPrompts].filter(p => !previousPresentPrompts.has(p)).map(p => ({
      prompt: p, source: 'google_ai',
    }));

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (previous && current.visibilityScore < previous.visibilityScore - 5) trend = 'down';
    else if (previous && current.visibilityScore > previous.visibilityScore + 5) trend = 'up';

    let fixSuggestions: string[] = [];
    if (trend === 'down' || lostPrompts.length > 0) {
      fixSuggestions = await this.generateFixSuggestions(projectId, lostPrompts, current.visibilityScore);

      if (userId) {
        for (const lost of lostPrompts) {
          await this.alertsService.createAlert({
            userId,
            projectId,
            type: 'ai_search_loss',
            payload: {
              prompt: lost.prompt,
              visibilityScore: current.visibilityScore,
              previousScore: previous?.visibilityScore ?? null,
            },
          });
        }
      }
    }

    return {
      visibilityScore: current.visibilityScore,
      trend,
      lostPrompts,
      gainedPrompts,
      fixSuggestions,
    };
  }

  private async generateFixSuggestions(
    projectId: string,
    lostPrompts: { prompt: string; source: string }[],
    currentScore: number,
  ): Promise<string[]> {
    if (lostPrompts.length === 0) return [];

    const groqApiKey = this.configService.get('GROQ_API_KEY');
    if (!groqApiKey) return ['Configurez GROQ_API_KEY pour obtenir des suggestions de correction.'];

    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) return [];

    const promptsList = lostPrompts.map(p => `- "${p.prompt}"`).join('\n');

    const systemPrompt = `Tu es un expert SEO spécialisé dans la visibilité sur les moteurs de recherche IA (Google AI Overviews, SearchGPT, etc.).
Tu aides les agences à reconquérir la visibilité perdue dans les résultats IA.
Réponds en français avec des recommandations concrètes et actionnables.
Sois synthétique : 2-4 suggestions maximum.`;

    const userPrompt = `Le site ${project.domain} a perdu de la visibilité dans les résultats de recherche IA.
Score de visibilité actuel : ${currentScore}/100.
Prompts où le site n'apparaît plus :\n${promptsList}\n\nQuelles actions concrètes recommandes-tu pour réapparaître dans ces résultats IA ?`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 512,
          temperature: 0.5,
        }),
      });

      if (!response.ok) throw new Error(`Groq API returned ${response.status}`);

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';
      return content.split('\n').filter((l: string) => l.trim().length > 0 && !l.trim().startsWith('#'));

    } catch (err) {
      this.logger.warn(`Failed to generate fix suggestions: ${(err as Error).message}`);
      return ['Analyse en cours - revenez plus tard pour des suggestions détaillées.'];
    }
  }

  private emptySnapshot(projectId: string, prompt: string): Partial<AiSearchSnapshot> {
    return {
      projectId,
      prompt,
      present: false,
      source: 'google_ai',
      extra: { error: true },
    };
  }
}
