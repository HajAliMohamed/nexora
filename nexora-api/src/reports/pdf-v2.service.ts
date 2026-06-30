import { Injectable, Logger } from '@nestjs/common';
import { ReportData } from './report-builder.service';
import { S3Service } from '../common/s3.service';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class PdfV2Service {
  private readonly logger = new Logger(PdfV2Service.name);
  private readonly uploadDir: string;

  constructor(private readonly s3Service: S3Service) {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'reports');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async generatePdf(data: ReportData): Promise<Buffer> {
    const html = this.renderHtml(data);

    const puppeteerMod = await import('puppeteer');
    const browser = await puppeteerMod.launch({
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async savePdf(buffer: Buffer, reportId: string): Promise<string> {
    if (this.s3Service.isEnabled) {
      const key = `reports/${reportId}.pdf`;
      try {
        await this.s3Service.upload(key, buffer);
        this.logger.log(`PDF uploaded to S3: ${key}`);
        return `s3:${key}`;
      } catch (err) {
        this.logger.error(`S3 upload failed, falling back to local: ${(err as Error).message}`);
      }
    }

    const filePath = path.join(this.uploadDir, `${reportId}.pdf`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  async getPdfBuffer(pdfPath: string): Promise<Buffer | null> {
    if (pdfPath.startsWith('s3:')) {
      if (!this.s3Service.isEnabled) return null;
      try {
        return await this.s3Service.download(pdfPath.slice(3));
      } catch {
        return null;
      }
    }

    if (!fs.existsSync(pdfPath)) return null;
    return fs.readFileSync(pdfPath);
  }

  private renderHtml(data: ReportData): string {
    const seoScore = data.scores.seoHealth;
    const aiScore = data.scores.aiVisibility;
    const growthScore = data.scores.growthPotential;
    const overallScore = Math.round((seoScore + aiScore + growthScore) / 3);

    const catScores = data.seo.categoryScores;
    const catRows = [
      ['Technique', `${catScores['technical'] ?? 0}/30`],
      ['On-page', `${catScores['onpage'] ?? 0}/25`],
      ['Performance', `${catScores['performance'] ?? 0}/20`],
      ['Crawlabilité', `${catScores['crawlability'] ?? 0}/15`],
      ['Contenu', `${catScores['content'] ?? 0}/10`],
    ];

    const recRows = data.recommendations.map(r =>
      `<tr>
        <td><span class="priority-badge priority-${r.priority}">${r.priority}</span></td>
        <td><strong>${r.title}</strong><br><small>${r.description}</small></td>
        <td>${r.impact}</td>
      </tr>`
    ).join('');

    const aiOppRows = data.ai.opportunities.map(o =>
      `<tr><td>${o.prompt}</td><td>${o.source === 'google_ai' ? 'Google AI' : 'ChatGPT'}</td></tr>`
    ).join('');

    const growthPageRows = data.growth.pages.map(p =>
      `<tr><td>${p.url}</td><td>${p.delta > 0 ? '+' : ''}${p.delta}</td><td>${p.status}</td></tr>`
    ).join('');

    const growthKeywordRows = data.growth.keywords.map(k =>
      `<tr><td>${k.keyword}</td><td>#${k.position}</td><td>${k.change > 0 ? '+' : ''}${k.change}</td></tr>`
    ).join('');

    const narrativeParagraphs = data.narrative
      .split('\n')
      .filter(l => l.trim())
      .map(l => `<p>${l}</p>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a2e; margin: 0; padding: 0; }
  .cover { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 80px 40px; text-align: center; page-break-after: always; }
  .cover h1 { font-size: 32px; margin: 0 0 8px; }
  .cover .subtitle { font-size: 16px; opacity: 0.9; margin: 0 0 24px; }
  .cover .date { font-size: 12px; opacity: 0.7; }
  .section { page-break-inside: avoid; margin: 24px 0; }
  h2 { font-size: 16px; color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 4px; margin: 24px 0 12px; }
  .score-grid { display: flex; gap: 16px; margin: 16px 0; }
  .score-card { flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
  .score-value { font-size: 36px; font-weight: 700; color: #6366f1; }
  .score-label { font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
  .overall-score { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; }
  .overall-score .score-value { color: white; }
  .overall-score .score-label { color: rgba(255,255,255,0.8); }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
  th { background: #f1f5f9; font-weight: 600; color: #475569; }
  .priority-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
  .priority-high { background: #fef2f2; color: #dc2626; }
  .priority-medium { background: #fffbeb; color: #d97706; }
  .priority-low { background: #f0fdf4; color: #16a34a; }
  .narrative { background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
  .narrative p { margin: 4px 0; line-height: 1.6; }
  .footer { text-align: center; color: #94a3b8; font-size: 9px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
</style></head><body>

<div class="cover">
  <h1>Rapport SEO</h1>
  <p class="subtitle">${data.project.name} — ${data.project.domain}</p>
  <p class="date">Période : ${data.period.from.toLocaleDateString('fr-FR')} — ${data.period.to.toLocaleDateString('fr-FR')}</p>
</div>

<div style="padding: 20px 40px;">
  <div class="section">
    <h2>Scores globaux</h2>
    <div class="score-grid">
      <div class="score-card overall-score">
        <div class="score-value">${overallScore}</div>
        <div class="score-label">Score global</div>
      </div>
      <div class="score-card">
        <div class="score-value">${seoScore}</div>
        <div class="score-label">SEO Health</div>
      </div>
      <div class="score-card">
        <div class="score-value">${aiScore}%</div>
        <div class="score-label">Visibilité IA</div>
      </div>
      <div class="score-card">
        <div class="score-value">${growthScore}</div>
        <div class="score-label">Potentiel croissance</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Résumé exécutif</h2>
    <div class="narrative">${narrativeParagraphs}</div>
  </div>

  <div class="section">
    <h2>Scores SEO par catégorie</h2>
    <table><tr><th>Catégorie</th><th>Score</th></tr>
      ${catRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}
    </table>
  </div>

  <div class="section">
    <h2>Visibilité IA</h2>
    <p><strong>Score :</strong> ${aiScore}% — ${aiOppRows.length > 0 ? 'Opportunités à exploiter' : 'Excellente couverture'}</p>
    ${aiOppRows.length > 0 ? `
    <table><tr><th>Prompt</th><th>Source</th></tr>${aiOppRows}</table>
    ` : ''}
  </div>

  <div class="section">
    <h2>Signaux de croissance</h2>
    <p><strong>Potentiel :</strong> ${growthScore}/100</p>
    <h3 style="font-size:12px; margin:12px 0 8px;">Pages en croissance</h3>
    <table><tr><th>URL</th><th>Variation</th><th>Statut</th></tr>${growthPageRows}</table>
    <h3 style="font-size:12px; margin:12px 0 8px;">Mots-clés proches du top 3</h3>
    <table><tr><th>Mot-clé</th><th>Position</th><th>Variation</th></tr>${growthKeywordRows}</table>
  </div>

  <div class="section">
    <h2>Recommandations</h2>
    <table><tr><th>Priorité</th><th>Action</th><th>Impact attendu</th></tr>${recRows}</table>
  </div>

  <div class="footer">
    Rapport généré par Nexora — ${new Date().toLocaleDateString('fr-FR')}
  </div>
</div>

</body></html>`;
  }
}
