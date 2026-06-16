import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

export type CrawlResult = {
  url: string;
  statusCode: number;
  title?: string;
  metaDescription?: string;
  h1?: string;
  html?: string;
  outgoingLinks: string[];
  wordCount?: number;
  canonical?: string;
  isNoindex?: boolean;
};

const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|svg|webp|css|js|ico|xml|json|zip|gz|tar|mp4|mp3|avi|mov|doc|docx|xls|xlsx|ppt|pptx)$/i;

@Injectable()
export class CrawlerService {
  async crawlDomain(domain: string, maxPages: number): Promise<CrawlResult[]> {
    const normalizedDomain = domain.startsWith('http') ? domain : `https://${domain}`;
    const rootUrl = normalizedDomain.replace(/\/$/, '');
    const hostname = new URL(rootUrl).hostname;

    const visited = new Set<string>();
    const queue: string[] = [rootUrl];
    const results: CrawlResult[] = [];

    while (queue.length > 0 && results.length < maxPages) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      const result = await this.fetchPage(url, hostname);
      if (result) {
        results.push(result);

        for (const link of result.outgoingLinks) {
          if (!visited.has(link) && !queue.includes(link) && results.length + queue.length < maxPages) {
            queue.push(link);
          }
        }
      }
    }

    return results;
  }

  private async fetchPage(url: string, hostname: string): Promise<CrawlResult | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'NexoraBot/1.0' },
        redirect: 'manual',
        signal: controller.signal,
      } as RequestInit);

      clearTimeout(timeout);

      const statusCode = response.status;
      const contentType = response.headers.get('content-type') || '';

      let html = '';
      if (statusCode >= 200 && statusCode < 400 && contentType.includes('text/html')) {
        html = await response.text();
      }

      const $ = html ? cheerio.load(html) : null;

      const title = $ ? $('title').text().trim() || undefined : undefined;
      const metaDescription = $ ? $('meta[name="description"]').attr('content')?.trim() || undefined : undefined;
      const h1 = $ ? $('h1').first().text().trim() || undefined : undefined;
      const canonical = $ ? $('link[rel="canonical"]').attr('href')?.trim() || undefined : undefined;
      const robotsMeta = $ ? $('meta[name="robots"]').attr('content') || '' : '';
      const isNoindex = robotsMeta.includes('noindex');
      const bodyText = $ ? $('body').text() : '';
      const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

      const outgoingLinks: string[] = [];
      if ($) {
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href')?.trim();
          if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

          try {
            const resolved = new URL(href, url);
            if (resolved.hostname === hostname) {
              const cleanUrl = resolved.origin + resolved.pathname;
              if (!SKIP_EXTENSIONS.test(cleanUrl) && !outgoingLinks.includes(cleanUrl)) {
                outgoingLinks.push(cleanUrl);
              }
            }
          } catch {
            // invalid URL
          }
        });
      }

      return {
        url,
        statusCode,
        title,
        metaDescription,
        h1,
        html: html || undefined,
        outgoingLinks,
        wordCount,
        canonical,
        isNoindex,
      };
    } catch {
      return { url, statusCode: 0, outgoingLinks: [] };
    }
  }
}
