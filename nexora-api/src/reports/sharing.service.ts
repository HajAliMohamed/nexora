import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SharingService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createSignedUrl(reportId: string): string {
    const token = this.jwtService.sign(
      { reportId },
      { expiresIn: '7d' },
    );
    const clientUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    return `${clientUrl}/client/reports/${reportId}?token=${token}`;
  }

  verifySignedUrl(token: string): { reportId: string } | null {
    try {
      const payload = this.jwtService.verify(token);
      return { reportId: payload.reportId };
    } catch {
      return null;
    }
  }
}
