import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { ReportBuilderService } from '../../reports/report-builder.service';

@Injectable()
export class MonthlyReportsCron {
  private readonly logger = new Logger(MonthlyReportsCron.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly reportBuilder: ReportBuilderService,
  ) {}

  @Cron('0 7 1 * *')
  async generateMonthlyReports() {
    this.logger.log('Generating monthly reports for all agency projects...');
    const projects = await this.projectRepo.find({ where: { agencyId: Not(IsNull()) } });

    for (const project of projects) {
      try {
        const data = await this.reportBuilder.buildReport(project.id, 'monthly');
        await this.reportBuilder.saveReport(data);
        this.logger.log(`Monthly report generated for project ${project.id}`);
      } catch (err) {
        this.logger.error(`Failed monthly report for ${project.id}: ${(err as Error).message}`);
      }
    }
    this.logger.log(`Monthly reports done: ${projects.length} projects`);
  }

  @Cron('0 7 1 */3 *')
  async generateQuarterlyReports() {
    this.logger.log('Generating quarterly reports for all agency projects...');
    const projects = await this.projectRepo.find({ where: { agencyId: Not(IsNull()) } });

    for (const project of projects) {
      try {
        const data = await this.reportBuilder.buildReport(project.id, 'quarterly');
        await this.reportBuilder.saveReport(data);
        this.logger.log(`Quarterly report generated for project ${project.id}`);
      } catch (err) {
        this.logger.error(`Failed quarterly report for ${project.id}: ${(err as Error).message}`);
      }
    }
    this.logger.log(`Quarterly reports done: ${projects.length} projects`);
  }
}
