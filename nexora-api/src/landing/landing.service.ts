import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { LandingPage } from './entities/landing-page.entity';

@Injectable()
export class LandingService {
  private readonly logger = new Logger(LandingService.name);

  constructor(
    @InjectRepository(LandingPage)
    private readonly landingRepo: Repository<LandingPage>,
    private readonly configService: ConfigService,
  ) {}

  async generateLanding(projectId: string, userId: string, topic: string, keywords: string[]): Promise<LandingPage> {
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'landing';
    const groqApiKey = this.configService.get('GROQ_API_KEY');
    let html = `<h1>${topic}</h1><p>Landing page générée pour: ${topic}</p>`;

    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Tu es un expert SEO et web designer. Génère le HTML complet d\'une landing page optimisée IA Search en français. Inclus: header, hero section, features, FAQ schema, CTA, footer. CSS intégré. Design moderne et professionnel.' },
              { role: 'user', content: `Génère une landing page SEO pour "${topic}". Mots-clés: ${keywords.join(', ')}.` },
            ],
            max_tokens: 2048,
          }),
        });
        if (response.ok) {
          const data = await response.json() as any;
          html = data.choices?.[0]?.message?.content || html;
        }
      } catch (err) {
        this.logger.warn(`Groq landing generation failed: ${(err as Error).message}`);
      }
    }

    const landing = this.landingRepo.create({ projectId, userId, title: topic, slug, content: topic, html, status: 'draft' });
    return this.landingRepo.save(landing);
  }

  async listLandings(projectId: string): Promise<LandingPage[]> {
    return this.landingRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async publishLanding(landingId: string): Promise<LandingPage> {
    const landing = await this.landingRepo.findOne({ where: { id: landingId } });
    if (!landing) throw new Error('Landing page introuvable');
    landing.status = 'published';
    return this.landingRepo.save(landing);
  }
}
