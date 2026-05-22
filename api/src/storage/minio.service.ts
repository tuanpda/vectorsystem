import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as Minio from 'minio';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client!: Minio.Client;
  private bucket!: string;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit() {
    const m = this.config.minio;
    this.bucket = m.bucket;
    this.client = new Minio.Client({
      endPoint: m.endpoint,
      port: m.port,
      useSSL: m.useSsl,
      accessKey: m.accessKey,
      secretKey: m.secretKey,
    });

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
    } catch (err) {
      this.logger.error(`MinIO init failed: ${err}`);
      throw err;
    }
  }

  async putObject(
    key: string,
    body: Buffer,
    meta?: Record<string, string>,
  ): Promise<void> {
    try {
      await this.client.putObject(this.bucket, key, body, body.length, meta);
    } catch (err) {
      throw new ServiceUnavailableException(
        `Failed to store file: ${(err as Error).message}`,
      );
    }
  }

  async getObject(key: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucket, key);
      const chunks: Buffer[] = [];
      return await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (err) {
      throw new ServiceUnavailableException(
        `Failed to read file: ${(err as Error).message}`,
      );
    }
  }

  async removeObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  getBucket(): string {
    return this.bucket;
  }
}
