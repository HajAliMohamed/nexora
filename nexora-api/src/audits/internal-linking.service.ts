import { Injectable } from '@nestjs/common';

@Injectable()
export class InternalLinkingService {
  analyze(pages: { url: string; outgoing: string[] }[]) {
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const urlSet = new Set(pages.map(p => p.url));

    for (const page of pages) {
      if (!outDegree.has(page.url)) outDegree.set(page.url, 0);
      outDegree.set(page.url, outDegree.get(page.url)! + page.outgoing.filter(l => urlSet.has(l)).length);

      for (const link of page.outgoing) {
        if (urlSet.has(link)) {
          inDegree.set(link, (inDegree.get(link) || 0) + 1);
        }
      }
    }

    for (const url of urlSet) {
      if (!inDegree.has(url)) inDegree.set(url, 0);
    }

    const orphanPages: string[] = [];
    const weakLinked: { url: string; inLinks: number }[] = [];

    for (const [url, degree] of inDegree) {
      if (degree === 0) orphanPages.push(url);
      else if (degree <= 2) weakLinked.push({ url, inLinks: degree });
    }

    return { inDegree, outDegree, orphanPages, weakLinked };
  }
}
