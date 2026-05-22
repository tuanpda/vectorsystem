import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { MineruService } from '../mineru/mineru.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly mineru: MineruService,
  ) {}

  async check() {
    let database: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    const mineru = (await this.checkMineruQuick()) ? 'ok' : 'offline';

    const status =
      database === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      service: 'knowledge-api',
      version: '0.1.0',
      checks: {
        database,
        mineru,
        mineruApiUrl: this.config.mineruApiUrl,
        redisUrl: this.config.redisUrl,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /** Used by dashboard — short timeout so UI is not stuck on hung MinerU */
  async checkMineruQuick(): Promise<boolean> {
    return this.mineru.checkHealth();
  }
}
