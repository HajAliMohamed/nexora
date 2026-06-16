import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SerpService {
  private readonly logger = new Logger(SerpService.name);
  private readonly provider: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get('SERP_PROVIDER', 'dataforseo');
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
        case 'searxng': return this.getFromSearxng(params);
        default: return this.getFromDataForSeo(params);
      }
    } catch (error) {
      this.logger.error(`SERP API error for "${params.keyword}": ${(error as Error).message}`);
      return { position: null };
    }
  }

  private async getFromDataForSeo(params: {
    keyword: string; domain: string; countryCode: string; languageCode: string; device: 'desktop' | 'mobile';
  }): Promise<{ position: number | null; url?: string }> {
    const login = this.configService.get('SERP_API_LOGIN');
    const password = this.configService.get('SERP_API_PASSWORD');
    if (!login || !password) {
      this.logger.warn('SERP_API_LOGIN/PASSWORD not configured, returning mock data');
      return { position: Math.floor(Math.random() * 20) + 1 };
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
      this.logger.warn('SERP_API_KEY not configured, returning mock data');
      return { position: Math.floor(Math.random() * 20) + 1 };
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

  private async getFromSearxng(params: {
    keyword: string; domain: string; countryCode: string; languageCode: string;
  }): Promise<{ position: number | null; url?: string }> {
    const baseUrl = this.configService.get('SEARXNG_BASE_URL', 'http://localhost:8888');
    const url = `${baseUrl}/search?q=${encodeURIComponent(params.keyword)}&format=json&language=${params.languageCode}&categories=general`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      this.logger.warn(`SearXNG returned ${res.status}, falling back`);
      return { position: null };
    }

    const body = await res.json();
    const results: { url: string; title: string; positions?: number[] }[] = body.results || [];
    const domain = params.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      if (item.url && item.url.includes(domain)) {
        return { position: i + 1, url: item.url };
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
