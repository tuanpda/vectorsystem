import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';
import { HealthService } from '../health/health.service';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiUsageService } from '../usage/openai-usage.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthService,
    private readonly config: AppConfigService,
    private readonly openAiUsage: OpenAiUsageService,
  ) {}

  async getStats(tenantId = 'default') {
    const where = { tenantId };
    const [totalDocs, byStatus, chunkAgg, mineruOk, embedProvider] =
      await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.prisma.chunk.aggregate({
          _count: { _all: true },
          where: { document: { tenantId } },
        }),
        this.health.checkMineruQuick(),
        Promise.resolve(this.config.embeddingProvider),
      ]);

    let database: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    const health = {
      status: database === 'ok' ? 'ok' : 'degraded',
      service: 'knowledge-api',
      version: '0.1.0',
      checks: {
        database,
        mineru: mineruOk ? 'ok' : 'offline',
        mineruApiUrl: this.config.mineruApiUrl,
        redisUrl: this.config.redisUrl,
      },
      timestamp: new Date().toISOString(),
    };

    const statusCounts: Record<string, number> = {};
    for (const row of byStatus) {
      statusCounts[row.status] = row._count._all;
    }
    for (const s of Object.values(DocumentStatus)) {
      if (statusCounts[s] === undefined) {
        statusCounts[s] = 0;
      }
    }

    const openaiUsage =
      embedProvider === 'openai'
        ? await this.openAiUsage.getSummary(tenantId)
        : null;

    return {
      documents: {
        total: totalDocs,
        readyForRag: statusCounts[DocumentStatus.indexed] ?? 0,
        failed: statusCounts[DocumentStatus.failed] ?? 0,
        byStatus: statusCounts,
      },
      chunks: {
        total: chunkAgg._count._all,
      },
      embedding: {
        provider: embedProvider,
        model: this.config.embeddingModel,
        dimensions: this.config.embeddingDimensions,
      },
      openaiUsage,
      system: health,
      timestamp: new Date().toISOString(),
    };
  }
}
