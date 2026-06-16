import { Injectable } from '@nestjs/common';

@Injectable()
export class DepthService {
  computeDepth(
    pages: { url: string; outgoing: string[] }[],
    rootUrl: string,
  ): Record<string, number> {
    const urlToOutgoing = new Map<string, string[]>();
    for (const page of pages) {
      urlToOutgoing.set(page.url, page.outgoing);
    }

    const depth: Record<string, number> = {};
    const visited = new Set<string>();
    const queue: { url: string; d: number }[] = [{ url: rootUrl, d: 0 }];

    while (queue.length > 0) {
      const { url, d } = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);
      depth[url] = d;

      const outgoing = urlToOutgoing.get(url) || [];
      for (const link of outgoing) {
        if (!visited.has(link) && urlToOutgoing.has(link)) {
          queue.push({ url: link, d: d + 1 });
        }
      }
    }

    return depth;
  }
}
