import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private bucket: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') ?? null;

    if (accessKeyId && secretAccessKey && region && this.bucket) {
      this.client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`S3 initialized: bucket=${this.bucket}, region=${region}`);
    } else {
      this.logger.warn('S3 not configured — falling back to local storage');
    }
  }

  get isEnabled(): boolean {
    return this.client !== null && this.bucket !== null;
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    if (!this.client || !this.bucket) throw new Error('S3 not configured');

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }));

    return key;
  }

  async download(key: string): Promise<Buffer> {
    if (!this.client || !this.bucket) throw new Error('S3 not configured');

    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    return Buffer.from(await response.Body!.transformToByteArray());
  }
}
