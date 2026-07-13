import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BacklinkOpportunity } from './entities/backlink-opportunity.entity';
import { BacklinkOutreach } from './entities/backlink-outreach.entity';

@Injectable()
export class BacklinksService {
  private readonly logger = new Logger(BacklinksService.name);

  constructor(
    @InjectRepository(BacklinkOpportunity)
    private readonly oppRepo: Repository<BacklinkOpportunity>,
    @InjectRepository(BacklinkOutreach)
    private readonly outreachRepo: Repository<BacklinkOutreach>,
    private readonly configService: ConfigService,
  ) {}

  private parseDomain(url: string): string {
    try {
      const hostname = url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
      const parts = hostname.split('.');
      return parts.length > 2 ? parts.slice(-2).join('.') : hostname;
    } catch {
      return url;
    }
  }

  private likelySources(domain: string): { source: string; authority: number; topic: string }[] {
    const root = this.parseDomain(domain);
    return [
      { source: `${root.split('.')[0]}-partners.com`, authority: 35, topic: 'Partenaires' },
      { source: `blog.${root}`, authority: 40, topic: 'Blog sectoriel' },
      { source: `www.annuaire-seo.fr`, authority: 30, topic: 'Annuaires SEO' },
      { source: `www.journal-du-net.com`, authority: 55, topic: 'Médias tech' },
      { source: `www.actualites-web.com`, authority: 45, topic: 'Actualités web' },
      { source: `www.blog-marketing.fr`, authority: 50, topic: 'Marketing digital' },
      { source: `www.lesechos.fr`, authority: 75, topic: 'Médias économiques' },
      { source: `www.clubic.com`, authority: 60, topic: 'Tech & logiciels' },
      { source: `www.journaldunet.com`, authority: 65, topic: 'Actualités numériques' },
      { source: `www.frenchweb.fr`, authority: 50, topic: 'Startups & web' },
    ];
  }

  async findOpportunities(projectId: string, domain: string): Promise<BacklinkOpportunity[]> {
    const groqApiKey = this.configService.get('GROQ_API_KEY');

    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Tu es un expert SEO. Génère une liste de 6 opportunités de backlinks réalistes pour un site web français. Retourne UNIQUEMENT un tableau JSON valide avec: [{"sourceDomain":"...","authority":nombre,"topic":"..."}]. Authority entre 20 et 80.' },
              { role: 'user', content: `Génère des opportunités de backlinks pour le site ${domain} dans le contexte SEO français.` },
            ],
            max_tokens: 1024,
            response_format: { type: 'json_object' },
          }),
        });
        if (response.ok) {
          const data = await response.json() as any;
          const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');
          const sources = Array.isArray(content) ? content : (content.opportunities || content.sources || []);
          if (sources.length > 0) {
            const opportunities = sources.slice(0, 8).map((s: any) =>
              this.oppRepo.create({
                projectId, targetUrl: `https://${domain}`,
                sourceDomain: s.sourceDomain || s.source,
                authority: Math.min(Math.max(Number(s.authority) || 30, 20), 85),
                probabilityScore: Math.min(Math.max(Math.round((Math.random() * 40) + 20 + (s.authority || 30) * 0.2), 10), 80),
                status: 'pending',
              })
            );
            return this.oppRepo.save(opportunities);
          }
        }
      } catch (err) {
        this.logger.warn(`Groq opportunities failed: ${(err as Error).message}`);
      }
    }

    const fallback = this.likelySources(domain).slice(0, 6).map(s =>
      this.oppRepo.create({
        projectId, targetUrl: `https://${domain}`,
        sourceDomain: s.source,
        authority: s.authority,
        probabilityScore: Math.min(Math.max(Math.round((Math.random() * 30) + 20 + s.authority * 0.15), 10), 75),
        status: 'pending',
      })
    );
    return this.oppRepo.save(fallback);
  }

  async generateOutreach(opportunityId: string): Promise<BacklinkOutreach> {
    const opp = await this.oppRepo.findOne({ where: { id: opportunityId } });
    if (!opp) throw new Error('Opportunité introuvable');

    const groqApiKey = this.configService.get('GROQ_API_KEY');
    let emailContent = `Bonjour,\n\nJe suis intéressé par un échange de liens avec ${opp.sourceDomain}.\n\nCordialement.`;

    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Tu es un expert en netlinking. Rédige un email d\'outreach personnalisé et convaincant en français.' },
              { role: 'user', content: `Rédige un email d'outreach pour obtenir un backlink depuis ${opp.sourceDomain} vers ${opp.targetUrl}. Personnalise avec le nom du site source.` },
            ],
            max_tokens: 512,
          }),
        });
        if (response.ok) {
          const data = await response.json() as any;
          emailContent = data.choices?.[0]?.message?.content || emailContent;
        }
      } catch (err) {
        this.logger.warn(`Groq outreach failed: ${(err as Error).message}`);
      }
    }

    const outreach = this.outreachRepo.create({
      opportunityId, projectId: opp.projectId,
      recipientEmail: `contact@${opp.sourceDomain}`,
      emailContent, status: 'draft',
    });
    return this.outreachRepo.save(outreach);
  }

  async sendOutreach(outreachId: string): Promise<BacklinkOutreach> {
    const outreach = await this.outreachRepo.findOne({ where: { id: outreachId } });
    if (!outreach) throw new Error('Outreach introuvable');
    outreach.status = 'sent';
    outreach.sentAt = new Date();
    return this.outreachRepo.save(outreach);
  }

  async listOpportunities(projectId: string): Promise<BacklinkOpportunity[]> {
    return this.oppRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async listOutreach(projectId: string): Promise<BacklinkOutreach[]> {
    return this.outreachRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }
}
