import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PageSpeedService {
  constructor(private readonly configService: ConfigService) {}

  async getScore(domain: string): Promise<number> {
    const apiKey = this.configService.get('PAGESPEED_API_KEY');
    if (!apiKey) return 50;

    try {
      const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&strategy=mobile&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json() as any;
      const score = data?.lighthouseResult?.categories?.performance?.score;
      return score !== undefined ? Math.round(score * 100) : 50;
    } catch {
      return 50;
    }
  }
}
