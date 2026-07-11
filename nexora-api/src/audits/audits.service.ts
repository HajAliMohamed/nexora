import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { SiteAudit } from './entities/site-audit.entity';
import { AuditIssue } from './entities/audit-issue.entity';
import { Project } from '../projects/entities/project.entity';

const FIX_SUGGESTIONS: Record<string, string> = {
  'missing_title': 'Ajoutez une balise title unique et descriptive (50-60 caractères) contenant le mot-clé principal.',
  'missing_meta_description': 'Ajoutez une meta description pertinente (150-160 caractères) avec un appel à l\'action.',
  'duplicate_title': 'Rendez chaque balise title unique en incluant le nom de la page ou une variante du mot-clé.',
  'missing_h1': 'Ajoutez une balise H1 contenant le mot-clé principal, une seule par page.',
  'multiple_h1': 'Conservez une seule balise H1 par page; transformez les H1 supplémentaires en H2.',
  'missing_alt': 'Ajoutez des attributs alt descriptifs à toutes les images en incluant les mots-clés pertinents.',
  'slow_loading': 'Optimisez le temps de chargement: compressez les images, activez la mise en cache et minifiez CSS/JS.',
  'missing_canonical': 'Ajoutez une balise canonique pointant vers l\'URL principale pour éviter le contenu dupliqué.',
  'broken_link': 'Corrigez ou supprimez le lien brisé; redirigez vers une page existante pertinente.',
  'missing_schema': 'Ajoutez un balisage schema.org (Article, Product, LocalBusiness, FAQ selon le type de contenu).',
  'low_word_count': 'Augmentez le contenu à au moins 300 mots pour donner plus de valeur et améliorer le classement.',
  'missing_open_graph': 'Ajoutez les balises Open Graph (og:title, og:description, og:image) pour optimiser le partage social.',
  'http_not_https': 'Redirigez tout le trafic HTTP vers HTTPS via une redirection 301 permanente dans le fichier .htaccess ou la configuration serveur.',
  'missing_robots': 'Créez un fichier robots.txt autorisant les robots à explorer tout le contenu pertinent.',
  'missing_sitemap': 'Générez un sitemap XML et soumettez-le à Google Search Console.',
};

@Injectable()
export class AuditsService {
  constructor(
    @InjectRepository(SiteAudit)
    private readonly auditRepo: Repository<SiteAudit>,
    @InjectRepository(AuditIssue)
    private readonly issueRepo: Repository<AuditIssue>,
  ) {}

  async createAudit(projectId: string): Promise<SiteAudit> {
    const audit = this.auditRepo.create({ projectId });
    return this.auditRepo.save(audit);
  }

  async markRunning(auditId: string): Promise<void> {
    await this.auditRepo.update(auditId, {
      status: 'running',
      startedAt: new Date(),
    });
  }

  async markDone(
    auditId: string,
    score: number,
    categoryScores: Record<string, number>,
    pagesCrawled: number,
  ): Promise<void> {
    await this.auditRepo.update(auditId, {
      status: 'done',
      score,
      categoryScores,
      pagesCrawled,
      finishedAt: new Date(),
    });
  }

  async markFailed(auditId: string): Promise<void> {
    await this.auditRepo.update(auditId, {
      status: 'failed',
      finishedAt: new Date(),
    });
  }

  async addIssue(
    auditId: string,
    data: { url: string; type: string; severity: string; message: string; extra?: Record<string, unknown> },
  ): Promise<AuditIssue> {
    const issue = this.issueRepo.create({ auditId, ...data });
    return this.issueRepo.save(issue);
  }

  async getAudit(auditId: string): Promise<SiteAudit> {
    const audit = await this.auditRepo.findOne({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit introuvable');
    return audit;
  }

  async getAuditIssues(
    auditId: string,
    filters?: { severity?: string; type?: string },
  ): Promise<AuditIssue[]> {
    const where: any = { auditId };
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.type) where.type = filters.type;
    return this.issueRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async listAuditsForProject(projectId: string): Promise<SiteAudit[]> {
    return this.auditRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLastAuditWithScores(projectId: string): Promise<SiteAudit | null> {
    return this.auditRepo.findOne({
      where: { projectId, status: 'done' },
      order: { createdAt: 'DESC' },
    });
  }

  async countAuditsThisMonth(projectId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return this.auditRepo.count({
      where: { projectId, createdAt: MoreThanOrEqual(startOfMonth) },
    });
  }

  async countAuditsThisMonthForUser(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return this.auditRepo
      .createQueryBuilder('audit')
      .innerJoin(Project, 'project', 'project.id = audit.projectId')
      .where('project.userId = :userId', { userId })
      .andWhere('audit.createdAt >= :start', { start: startOfMonth })
      .getCount();
  }

  async getAutoFixes(auditId: string): Promise<{ issueId: string; type: string; severity: string; message: string; fix: string }[]> {
    const issues = await this.issueRepo.find({ where: { auditId } });
    return issues.map(issue => ({
      issueId: issue.id,
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
      fix: FIX_SUGGESTIONS[issue.type] || `Analysez manuellement: "${issue.message}". Consultez la documentation Nexora pour les bonnes pratiques.`,
    }));
  }
}
