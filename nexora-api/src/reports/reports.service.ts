import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteAudit } from '../audits/entities/site-audit.entity';
import { AuditIssue } from '../audits/entities/audit-issue.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(SiteAudit)
    private readonly auditRepo: Repository<SiteAudit>,
    @InjectRepository(AuditIssue)
    private readonly issueRepo: Repository<AuditIssue>,
    @InjectRepository(Keyword)
    private readonly keywordRepo: Repository<Keyword>,
    @InjectRepository(KeywordPosition)
    private readonly positionRepo: Repository<KeywordPosition>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async generateAuditPdf(auditId: string): Promise<Buffer> {
    const audit = await this.auditRepo.findOne({ where: { id: auditId }, relations: ['project'] });
    if (!audit || !audit.project) throw new Error('Audit not found');

    const project = audit.project;
    const issues = await this.issueRepo.find({ where: { auditId }, order: { createdAt: 'DESC' }, take: 50 });
    const critical = issues.filter(i => i.severity === 'critical').length;
    const high = issues.filter(i => i.severity === 'high').length;
    const medium = issues.filter(i => i.severity === 'medium').length;
    const low = issues.filter(i => i.severity === 'low').length;

    const cats = audit.categoryScores || {};
    const catRows = [
      ['Technical', `${cats['technical'] ?? 0}/30`],
      ['On-page', `${cats['onpage'] ?? 0}/25`],
      ['Performance', `${cats['performance'] ?? 0}/20`],
      ['Crawlability', `${cats['crawlability'] ?? 0}/15`],
      ['Content', `${cats['content'] ?? 0}/10`],
    ];

    const issueRows = issues.slice(0, 50).map(i =>
      `<tr><td>${i.url}</td><td>${i.type}</td><td>${i.severity}</td><td>${i.message}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #333; padding: 40px; }
  h1 { font-size: 22px; margin: 0; }
  .subtitle { color: #666; margin: 4px 0 20px; }
  .score { font-size: 48px; font-weight: bold; margin: 20px 0; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; }
  th { background: #f5f5f5; font-weight: 600; }
  .section { font-size: 14px; font-weight: 600; margin: 24px 0 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
</style></head><body>
  <h1>Nexora — SEO Audit Report</h1>
  <p class="subtitle">Project: ${project.name} (${project.domain})<br>Date: ${audit.createdAt.toISOString().split('T')[0]}</p>

  <div class="score">${audit.score ?? '-'}/100</div>

  <div class="section">Category Scores</div>
  <table><tr><th>Category</th><th>Score</th></tr>
    ${catRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}
  </table>

  <div class="section">Issues by Severity</div>
  <table><tr><th>Severity</th><th>Count</th></tr>
    <tr><td>Critical</td><td>${critical}</td></tr>
    <tr><td>High</td><td>${high}</td></tr>
    <tr><td>Medium</td><td>${medium}</td></tr>
    <tr><td>Low</td><td>${low}</td></tr>
  </table>

  <div class="section">Top Issues</div>
  <table><tr><th>URL</th><th>Type</th><th>Severity</th><th>Message</th></tr>
    ${issueRows}
  </table>
</body></html>`;

    const puppeteerMod = await import('puppeteer');
    const browser = await puppeteerMod.launch({ channel: 'chrome', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async generateRankingsPdf(projectId: string): Promise<Buffer> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const keywords = await this.keywordRepo.find({ where: { projectId } });
    let positionSum = 0;
    let positionCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const rows: string[] = [];
    for (const kw of keywords) {
      const todayPos = await this.positionRepo.findOne({ where: { keywordId: kw.id, date: todayStr } });
      const pastPos = await this.positionRepo.findOne({ where: { keywordId: kw.id, date: sevenDaysAgoStr } });
      const current = todayPos?.position;
      if (current !== null && current !== undefined) {
        positionSum += current;
        positionCount++;
      }
      const change = current !== null && current !== undefined && pastPos?.position
        ? pastPos.position - current
        : null;
      rows.push(`<tr>
        <td>${kw.keyword}</td>
        <td>${kw.countryCode}</td>
        <td>${kw.device}</td>
        <td>${current !== null && current !== undefined ? `#${current}` : '-'}</td>
        <td>${change !== null ? (change > 0 ? `+${change}` : `${change}`) : '-'}</td>
      </tr>`);
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #333; padding: 40px; }
  h1 { font-size: 22px; margin: 0; }
  .subtitle { color: #666; margin: 4px 0 20px; }
  .kpi { font-size: 14px; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; }
  th { background: #f5f5f5; font-weight: 600; }
  .section { font-size: 14px; font-weight: 600; margin: 24px 0 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
</style></head><body>
  <h1>Nexora — Rankings Report</h1>
  <p class="subtitle">Project: ${project.name} (${project.domain})<br>Date: ${todayStr}</p>

  <div class="kpi"><strong>Keywords Tracked:</strong> ${keywords.length}</div>
  <div class="kpi"><strong>Average Position:</strong> ${positionCount > 0 ? (positionSum / positionCount).toFixed(1) : '-'}</div>

  <div class="section">Keywords</div>
  <table><tr><th>Keyword</th><th>Country</th><th>Device</th><th>Position</th><th>7d Change</th></tr>
    ${rows.join('')}
  </table>
</body></html>`;

    const puppeteerMod2 = await import('puppeteer');
    const browser = await puppeteerMod2.launch({ channel: 'chrome', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
