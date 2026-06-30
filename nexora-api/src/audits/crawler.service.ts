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
const SPA_PATTERNS = /(id=["'](root|app|__next|react-root)["']|__NUXT__|__NEXT_DATA__|<div[^>]*><\/div>\s*<script)/i;

@Injectable()
export class CrawlerService {
  private browser: any = null;
  private browserPromise: Promise<any> | null = null;

  async crawlDomain(domain: string, maxPages: number, maxDepth = 5): Promise<CrawlResult[]> {
    const normalizedDomain = domain.startsWith('http') ? domain : `https://${domain}`;
    const rootUrl = normalizedDomain.replace(/\/$/, '');
    let hostname = new URL(rootUrl).hostname;

    const visited = new Set<string>();
    const queue: { url: string; depth: number }[] = [{ url: rootUrl, depth: 0 }];
    const results: CrawlResult[] = [];

    try {
      while (queue.length > 0 && results.length < maxPages) {
        const { url, depth } = queue.shift()!;
        if (visited.has(url)) continue;
        visited.add(url);

        if (depth > maxDepth) continue;

        console.log(`[Crawler] ${results.length + 1}/${maxPages} depth=${depth} queue=${queue.length} fetching: ${url}`);
        const result = await this.fetchPage(url, hostname);
        if (result) {
          // Update hostname from the first successful response (handles www redirects)
          if (results.length === 0 && result.statusCode >= 200 && result.statusCode < 400) {
            try {
              hostname = new URL(result.url).hostname;
            } catch { /* keep original */ }
          }

          results.push(result);
          console.log(`[Crawler] ${result.statusCode} links=${result.outgoingLinks.length} ${url}`);

          for (const link of result.outgoingLinks) {
            if (!visited.has(link) && !queue.some(q => q.url === link) && results.length + queue.length < maxPages) {
              queue.push({ url: link, depth: depth + 1 });
            }
          }
        } else {
          console.log(`[Crawler] null result for ${url}`);
        }
      }
    } finally {
      await this.closeBrowser();
    }

    return results;
  }

  private needsJsRendering(html: string): boolean {
    return SPA_PATTERNS.test(html);
  }

  private async getBrowser(): Promise<any> {
    if (this.browser) return this.browser;
    if (this.browserPromise) return this.browserPromise;

    this.browserPromise = (async () => {
      try {
        const { default: puppeteer } = await import('puppeteer');
        const b = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        this.browser = b;
        return b;
      } finally {
        this.browserPromise = null;
      }
    })();

    return this.browserPromise;
  }

  private async renderWithPuppeteer(url: string): Promise<string | null> {
    let page: any = null;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const html = await page.content();
      return html;
    } catch {
      return null;
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      try { await this.browser.close(); } catch { /* ignore */ }
      this.browser = null;
    }
  }

  private stripWww(h: string): string {
    return h.replace(/^www\./i, '');
  }

  private parseHtml(url: string, html: string, statusCode: number, hostname: string): CrawlResult {
    const $ = cheerio.load(html);

    const title = $('title').text().trim() || undefined;
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || undefined;
    const h1 = $('h1').first().text().trim() || undefined;
    const canonical = $('link[rel="canonical"]').attr('href')?.trim() || undefined;
    const robotsMeta = $('meta[name="robots"]').attr('content') || '';
    const isNoindex = robotsMeta.includes('noindex');
    const bodyText = $('body').text();
    const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;
    const normHost = this.stripWww(hostname);

    const outgoingLinks: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

      try {
        const resolved = new URL(href, url);
        if (this.stripWww(resolved.hostname) === normHost) {
          const cleanUrl = resolved.origin + resolved.pathname;
          if (!SKIP_EXTENSIONS.test(cleanUrl) && !outgoingLinks.includes(cleanUrl)) {
            outgoingLinks.push(cleanUrl);
          }
        }
      } catch {
        // invalid URL
      }
    });

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
  }

  private async fetchPage(url: string, hostname: string): Promise<CrawlResult | null> {
    const resolvedUrl = await this.resolveRedirect(url);
    if (!resolvedUrl) {
      return { url, statusCode: 0, outgoingLinks: [] };
    }

    let html = '';
    let statusCode = 0;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(resolvedUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'NexoraBot/1.0' },
        redirect: 'manual',
        signal: controller.signal,
      } as RequestInit);

      clearTimeout(timeout);

      statusCode = response.status;
      const contentType = response.headers.get('content-type') || '';
      const finalUrl = resolvedUrl;

      if (statusCode >= 200 && statusCode < 400 && contentType.includes('text/html')) {
        html = await response.text();
      } else if (statusCode >= 300 && statusCode < 400) {
        const location = response.headers.get('location');
        if (location) {
          const nextUrl = new URL(location, finalUrl).href;
          if (new URL(nextUrl).hostname === hostname || !new URL(nextUrl).hostname) {
            return this.fetchPage(nextUrl, hostname);
          }
        }
        return { url, statusCode, outgoingLinks: [] };
      }

      if (!html || !html.includes('<html')) {
        return { url, statusCode, outgoingLinks: [] };
      }

      if (this.needsJsRendering(html)) {
        const renderedHtml = await this.renderWithPuppeteer(finalUrl);
        if (renderedHtml) {
          return this.parseHtml(finalUrl, renderedHtml, statusCode, hostname);
        }
      }

      return this.parseHtml(finalUrl, html, statusCode, hostname);
    } catch {
      return { url, statusCode: 0, outgoingLinks: [] };
    }
  }

  private async resolveRedirect(url: string, maxFollow = 5): Promise<string | null> {
    for (let i = 0; i < maxFollow; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
        } as RequestInit);
        clearTimeout(timeout);

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) return null;
          url = new URL(location, url).href;
        } else {
          return url;
        }
      } catch {
        return null;
      }
    }
    return url;
  }
}
