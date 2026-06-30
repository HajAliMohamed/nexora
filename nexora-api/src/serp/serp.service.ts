import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';

@Injectable()
export class SerpService {
  private readonly logger = new Logger(SerpService.name);
  private readonly provider: string;
  private browser: any = null;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get('SERP_PROVIDER', 'google');
  }

  async getRanking(params: {
    keyword: string;
    domain: string;
    countryCode: string;
    languageCode: string;
    device: 'desktop' | 'mobile';
  }): Promise<{ position: number | null; url?: string }> {
    try {
      switch (this.provider) {
        case 'serpapi': return this.getFromSerpApi(params);
        case 'searxng': return this.getFromGoogle(params);
        case 'google': return this.getFromGoogle(params);
        default: return this.getFromDataForSeo(params);
      }
    } catch (error) {
      this.logger.error(`SERP API error for "${params.keyword}": ${(error as Error).message}`);
      return { position: null };
    } finally {
      await this.closeBrowser();
    }
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

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      try { await this.browser.close(); } catch { /* ignore */ }
      this.browser = null;
    }
  }

  private async getFromGoogle(params: {
    keyword: string; domain: string; countryCode: string; languageCode: string;
  }): Promise<{ position: number | null; url?: string }> {
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
        `https://www.google.com/search?q=${encodeURIComponent(params.keyword)}&hl=${params.languageCode}&gl=${params.countryCode}&num=50`,
        { waitUntil: 'networkidle2', timeout: 20000 },
      );
      const html = await page.content();
      const $ = cheerio.load(html);

      const domain = params.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      let position = 0;

      const results: { url: string; position: number }[] = [];
      $('div.MjjYud').each((_, el) => {
        position++;
        const link = $(el).find('a').first();
        const href = link.attr('href');
        if (href && href.startsWith('http')) {
          results.push({ url: href, position });
        }
      });

      for (const item of results) {
        if (item.url.includes(domain)) {
          return { position: item.position, url: item.url };
        }
      }

      return { position: null };
    } catch (err) {
      this.logger.warn(`Google scrape failed for "${params.keyword}": ${(err as Error).message}`);
      return { position: null };
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  private async getFromDataForSeo(params: {
    keyword: string; domain: string; countryCode: string; languageCode: string; device: 'desktop' | 'mobile';
  }): Promise<{ position: number | null; url?: string }> {
    const login = this.configService.get('SERP_API_LOGIN');
    const password = this.configService.get('SERP_API_PASSWORD');
    if (!login || !password) {
      this.logger.warn('SERP_API_LOGIN/PASSWORD not configured');
      return { position: null };
    }

    const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
      },
      body: JSON.stringify([{
        keyword: params.keyword,
        location_code: this.mapCountryToLocation(params.countryCode),
        language_code: params.languageCode,
        device: params.device,
        os: 'windows',
        depth: 50,
      }]),
    });

    const body = await res.json();
    const items = body?.tasks?.[0]?.result?.[0]?.items || [];
    const domain = params.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    for (const item of items) {
      if (item.url && item.url.includes(domain)) {
        return { position: item.rank_absolute, url: item.url };
      }
    }
    return { position: null };
  }

  private async getFromSerpApi(params: {
    keyword: string; domain: string; countryCode: string; languageCode: string;
  }): Promise<{ position: number | null; url?: string }> {
    const apiKey = this.configService.get('SERP_API_KEY');
    if (!apiKey) {
      this.logger.warn('SERP_API_KEY not configured');
      return { position: null };
    }

    const searchParams = new URLSearchParams({
      engine: 'google',
      q: params.keyword,
      gl: params.countryCode,
      hl: params.languageCode,
      num: '50',
      api_key: apiKey,
    });

    const res = await fetch(`https://serpapi.com/search?${searchParams}`);
    const body = await res.json();
    const results = body.organic_results || [];
    const domain = params.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    for (const item of results) {
      if (item.link && item.link.includes(domain)) {
        return { position: item.position, url: item.link };
      }
    }
    return { position: null };
  }

  private mapCountryToLocation(code: string): number {
    const map: Record<string, number> = {
      US: 2840, FR: 2250, GB: 2826, DE: 2824, ES: 2328,
      IT: 2276, CA: 2124, AU: 2036, BR: 2076, JP: 2392,
    };
    return map[code.toUpperCase()] || 2840;
  }
}
