import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenUsage } from './embedding.types';
import { estimateEmbeddingCostUsd, formatUsd } from './openai-pricing';

export type UsageOperation = 'index' | 'rag_query';

@Injectable()
export class OpenAiUsageService {
  private readonly logger = new Logger(OpenAiUsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  estimateCost(model: string, usage: TokenUsage): number {
    return estimateEmbeddingCostUsd(
      model,
      usage.totalTokens,
      this.config.embeddingPricePer1MUsd,
    );
  }

  async record(params: {
    tenantId?: string;
    documentId?: string | null;
    operation: UsageOperation;
    model: string;
    usage: TokenUsage;
  }): Promise<{ estimatedUsd: number }> {
    const estimatedUsd = this.estimateCost(params.model, params.usage);
    await this.prisma.openAiUsageLog.create({
      data: {
        tenantId: params.tenantId ?? 'default',
        documentId: params.documentId ?? null,
        operation: params.operation,
        model: params.model,
        promptTokens: params.usage.promptTokens,
        totalTokens: params.usage.totalTokens,
        estimatedUsd: new Prisma.Decimal(estimatedUsd),
      },
    });
    return { estimatedUsd };
  }

  async recordDocumentIndex(
    documentId: string,
    tenantId: string,
    model: string,
    usage: TokenUsage,
  ): Promise<number> {
    const { estimatedUsd } = await this.record({
      tenantId,
      documentId,
      operation: 'index',
      model,
      usage,
    });
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        indexPromptTokens: usage.promptTokens,
        indexEstimatedUsd: new Prisma.Decimal(estimatedUsd),
      },
    });
    return estimatedUsd;
  }

  async getSummary(tenantId = 'default') {
    const provider = this.config.embeddingProvider;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthAgg, allAgg, byOp, topDocs, billing] = await Promise.all([
      this.prisma.openAiUsageLog.aggregate({
        where: { tenantId, createdAt: { gte: monthStart } },
        _sum: { promptTokens: true, totalTokens: true, estimatedUsd: true },
        _count: { _all: true },
      }),
      this.prisma.openAiUsageLog.aggregate({
        where: { tenantId },
        _sum: { promptTokens: true, totalTokens: true, estimatedUsd: true },
        _count: { _all: true },
      }),
      this.prisma.openAiUsageLog.groupBy({
        by: ['operation'],
        where: { tenantId, createdAt: { gte: monthStart } },
        _sum: { totalTokens: true, estimatedUsd: true },
        _count: { _all: true },
      }),
      this.prisma.openAiUsageLog.groupBy({
        by: ['documentId'],
        where: {
          tenantId,
          documentId: { not: null },
          operation: 'index',
          createdAt: { gte: monthStart },
        },
        _sum: { totalTokens: true, estimatedUsd: true },
        _count: { _all: true },
        orderBy: { _sum: { estimatedUsd: 'desc' } },
        take: 10,
      }),
      this.fetchOpenAiBillingMonth(monthStart),
    ]);

    const docIds = topDocs
      .map((r) => r.documentId)
      .filter((id): id is string => !!id);
    const docs = docIds.length
      ? await this.prisma.document.findMany({
          where: { id: { in: docIds } },
          select: { id: true, title: true },
        })
      : [];
    const docTitle = new Map(docs.map((d) => [d.id, d.title]));

    const toNum = (v: Prisma.Decimal | null | undefined) =>
      v != null ? Number(v) : 0;

    const monthUsd = toNum(monthAgg._sum.estimatedUsd);
    const allUsd = toNum(allAgg._sum.estimatedUsd);

    return {
      provider,
      model: this.config.embeddingModel,
      trackingEnabled: provider === 'openai',
      note:
        provider === 'ollama'
          ? 'Ollama local — không tính phí OpenAI. Upload/Parse dùng MinerU, không qua OpenAI.'
          : 'Upload và Parse không dùng OpenAI. Chỉ Index (embed) và Thử RAG tính token. Chi phí là ước tính theo bảng giá embedding.',
      month: {
        label: `${now.getMonth() + 1}/${now.getFullYear()}`,
        requests: monthAgg._count._all,
        promptTokens: monthAgg._sum.promptTokens ?? 0,
        totalTokens: monthAgg._sum.totalTokens ?? 0,
        estimatedUsd: monthUsd,
        estimatedUsdFormatted: formatUsd(monthUsd),
      },
      allTime: {
        requests: allAgg._count._all,
        totalTokens: allAgg._sum.totalTokens ?? 0,
        estimatedUsd: allUsd,
        estimatedUsdFormatted: formatUsd(allUsd),
      },
      byOperation: byOp.map((row) => ({
        operation: row.operation,
        label: row.operation === 'index' ? 'Index (embed)' : 'RAG query',
        requests: row._count._all,
        totalTokens: row._sum.totalTokens ?? 0,
        estimatedUsd: toNum(row._sum.estimatedUsd),
        estimatedUsdFormatted: formatUsd(toNum(row._sum.estimatedUsd)),
      })),
      topDocumentsThisMonth: topDocs.map((row) => ({
        documentId: row.documentId,
        title: docTitle.get(row.documentId!) ?? row.documentId,
        indexRuns: row._count._all,
        totalTokens: row._sum.totalTokens ?? 0,
        estimatedUsd: toNum(row._sum.estimatedUsd),
        estimatedUsdFormatted: formatUsd(toNum(row._sum.estimatedUsd)),
      })),
      billing,
      pricePer1MTokens: this.config.embeddingPricePer1MUsd,
    };
  }

  /** OpenAI Costs API — cần Admin API key (api.usage.read) */
  private async fetchOpenAiBillingMonth(monthStart: Date): Promise<{
    available: boolean;
    message: string;
    monthSpendUsd?: number;
    monthSpendFormatted?: string;
  } | null> {
    const adminKey = this.config.openaiAdminApiKey;
    if (!adminKey) {
      return {
        available: false,
        message:
          'Chưa cấu hình OPENAI_ADMIN_API_KEY — chỉ hiển thị chi phí ước tính từ hệ thống. Số dư/hạn mức: xem platform.openai.com/settings/organization/billing',
      };
    }

    try {
      const start = Math.floor(monthStart.getTime() / 1000);
      const end = Math.floor(Date.now() / 1000);
      const url = `https://api.openai.com/v1/organization/costs?start_time=${start}&end_time=${end}&bucket_width=1d`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`OpenAI costs API ${res.status}: ${body.slice(0, 200)}`);
        return {
          available: false,
          message: `Không lấy được billing OpenAI (${res.status}). Dùng số ước tính bên dưới.`,
        };
      }
      const data = (await res.json()) as {
        data?: { results?: { amount?: { value?: number } }[] }[];
      };
      let cents = 0;
      for (const bucket of data.data ?? []) {
        for (const r of bucket.results ?? []) {
          cents += r.amount?.value ?? 0;
        }
      }
      const usd = cents / 100;
      return {
        available: true,
        message: 'Chi phí thật từ OpenAI (Costs API) — tháng hiện tại',
        monthSpendUsd: usd,
        monthSpendFormatted: formatUsd(usd),
      };
    } catch (err) {
      this.logger.warn(`OpenAI costs fetch failed: ${err}`);
      return {
        available: false,
        message: 'Lỗi gọi OpenAI Costs API. Dùng chi phí ước tính từ log hệ thống.',
      };
    }
  }
}
