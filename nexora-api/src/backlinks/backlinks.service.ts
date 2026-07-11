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

  async findOpportunities(projectId: string, domain: string): Promise<BacklinkOpportunity[]> {
    const opportunities = this.oppRepo.create([
      { projectId, targetUrl: `https://${domain}`, sourceDomain: 'example-blog.com', authority: 45, probabilityScore: 35, status: 'pending' },
      { projectId, targetUrl: `https://${domain}`, sourceDomain: 'industry-news.org', authority: 60, probabilityScore: 50, status: 'pending' },
    ]);
    return this.oppRepo.save(opportunities);
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
    return this.outreachRepo.save(outreach);
  }

  async listOpportunities(projectId: string): Promise<BacklinkOpportunity[]> {
    return this.oppRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async listOutreach(projectId: string): Promise<BacklinkOutreach[]> {
    return this.outreachRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }
}
