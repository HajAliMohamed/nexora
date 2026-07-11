import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ContentBrief } from './entities/content-brief.entity';
import { ContentArticle } from './entities/content-article.entity';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectRepository(ContentBrief)
    private readonly briefRepo: Repository<ContentBrief>,
    @InjectRepository(ContentArticle)
    private readonly articleRepo: Repository<ContentArticle>,
    private readonly configService: ConfigService,
  ) {}

  async generateBrief(projectId: string, userId: string, topic: string, keywords: string[]): Promise<ContentBrief> {
    const groqApiKey = this.configService.get('GROQ_API_KEY');
    let briefText = `Brief SEO pour: ${topic}\nMots-clés: ${keywords.join(', ')}\n\n`;

    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Tu es un rédacteur SEO expert. Génère un brief éditorial détaillé en français avec: angle éditorial, structure (H2, H3), mots-clés secondaires, recommandations longueur, appel à l\'action.' },
              { role: 'user', content: `Génère un brief SEO pour un article sur "${topic}". Mots-clés cibles: ${keywords.join(', ')}.` },
            ],
            max_tokens: 1024,
          }),
        });
        if (response.ok) {
          const data = await response.json() as any;
          briefText = data.choices?.[0]?.message?.content || briefText;
        }
      } catch (err) {
        this.logger.warn(`Groq brief generation failed: ${(err as Error).message}`);
      }
    }

    const brief = this.briefRepo.create({ projectId, userId, title: topic, brief: briefText, keywords, targetWordCount: 1000 });
    return this.briefRepo.save(brief);
  }

  async generateArticle(briefId: string): Promise<ContentArticle> {
    const brief = await this.briefRepo.findOne({ where: { id: briefId } });
    if (!brief) throw new Error('Brief introuvable');

    const groqApiKey = this.configService.get('GROQ_API_KEY');
    let content = `Article: ${brief.title}\n\n`;

    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Tu es un rédacteur SEO expert. Rédige un article optimisé SEO en français avec titre, introduction, sections H2/H3, conclusion. Retourne uniquement le HTML.' },
              { role: 'user', content: `Rédige un article SEO basé sur ce brief:\n${brief.brief}` },
            ],
            max_tokens: 2048,
          }),
        });
        if (response.ok) {
          const data = await response.json() as any;
          content = data.choices?.[0]?.message?.content || content;
        }
      } catch (err) {
        this.logger.warn(`Groq article generation failed: ${(err as Error).message}`);
      }
    }

    const article = this.articleRepo.create({ projectId: brief.projectId, briefId, title: brief.title, content, status: 'draft' });
    await this.articleRepo.save(article);
    brief.generatedArticleId = article.id;
    await this.briefRepo.save(brief);
    return article;
  }

  async listBriefs(projectId: string): Promise<ContentBrief[]> {
    return this.briefRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async listArticles(projectId: string): Promise<ContentArticle[]> {
    return this.articleRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }
}
