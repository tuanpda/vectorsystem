import { Injectable } from '@nestjs/common';
import { EmbeddingService } from '../embeddings/embedding.service';
import { OpenAiUsageService } from '../usage/openai-usage.service';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from '../vectors/vector.service';
import { RagQueryDto } from './dto/rag-query.dto';

@Injectable()
export class RagService {
  constructor(
    private readonly embedding: EmbeddingService,
    private readonly openAiUsage: OpenAiUsageService,
    private readonly vectors: VectorService,
    private readonly prisma: PrismaService,
  ) {}

  async query(dto: RagQueryDto, tenantId = 'default') {
    const { vectors, usage } = await this.embedding.embedTexts([dto.question]);
    const queryVector = vectors[0];
    if (this.embedding.provider === 'openai' && usage.totalTokens > 0) {
      await this.openAiUsage.record({
        tenantId,
        documentId: dto.documentIds?.[0] ?? null,
        operation: 'rag_query',
        model: this.embedding.model,
        usage,
      });
    }
    const hits = await this.vectors.search(queryVector, {
      tenantId,
      documentIds: dto.documentIds,
      topK: dto.topK ?? 8,
    });

    const docIds = [...new Set(hits.map((h) => h.documentId))];
    const docs = await this.prisma.document.findMany({
      where: { id: { in: docIds } },
      select: { id: true, title: true, originalName: true },
    });
    const docMap = new Map(docs.map((d) => [d.id, d]));

    return {
      question: dto.question,
      contexts: hits.map((h) => ({
        chunkId: h.chunkId,
        documentId: h.documentId,
        documentTitle: docMap.get(h.documentId)?.title ?? null,
        score: Number(h.score),
        blockType: h.blockType,
        pageIdx: h.pageIdx,
        headingPath: h.headingPath,
        text: h.content,
        citation: {
          document: docMap.get(h.documentId)?.originalName,
          page: h.pageIdx != null ? h.pageIdx + 1 : null,
          type: h.blockType,
        },
      })),
    };
  }
}
