import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class DuplicateContentService {
  detectDuplicates(
    pages: { url: string; text: string }[],
    threshold = 0.85,
  ): { urlA: string; urlB: string; similarity: number }[] {
    const results: { urlA: string; urlB: string; similarity: number }[] = [];

    const shingleSets = new Map<string, Set<string>>();

    for (const page of pages) {
      const words = page.text.split(/\s+/).filter(Boolean);
      const shingles = new Set<string>();
      for (let i = 0; i <= words.length - 5; i++) {
        const shingle = words.slice(i, i + 5).join(' ');
        const hash = createHash('md5').update(shingle).digest('hex');
        shingles.add(hash);
      }
      shingleSets.set(page.url, shingles);
    }

    const urls = pages.map(p => p.url);

    for (let i = 0; i < urls.length; i++) {
      for (let j = i + 1; j < urls.length; j++) {
        const setA = shingleSets.get(urls[i]);
        const setB = shingleSets.get(urls[j]);
        if (!setA || !setB || setA.size === 0 || setB.size === 0) continue;

        let intersection = 0;
        for (const shingle of setA) {
          if (setB.has(shingle)) intersection++;
        }

        const union = setA.size + setB.size - intersection;
        const similarity = union > 0 ? intersection / union : 0;

        if (similarity >= threshold) {
          results.push({ urlA: urls[i], urlB: urls[j], similarity });
        }
      }
    }

    return results;
  }
}
