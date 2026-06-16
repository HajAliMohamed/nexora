import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { SiteAudit } from './entities/site-audit.entity';
import { AuditIssue } from './entities/audit-issue.entity';
import { Project } from '../projects/entities/project.entity';

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
}
