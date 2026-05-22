import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { DocumentStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { ChunkingService } from '../chunking/chunking.service';
import { ContentListBlock } from '../chunking/chunking.types';
import { AppConfigService } from '../config/app-config.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { TokenUsage } from '../usage/embedding.types';
import { OpenAiUsageService } from '../usage/openai-usage.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { VectorService } from '../vectors/vector.service';
import { DOCUMENT_INDEX_QUEUE, DocumentIndexJobPayload } from './index.constants';

@Injectable()
export class IndexService {
  private readonly logger = new Logger(IndexService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioService,
    private readonly chunking: ChunkingService,
    private readonly embedding: EmbeddingService,
    private readonly openAiUsage: OpenAiUsageService,
    private readonly vectors: VectorService,
    private readonly config: AppConfigService,
    @InjectQueue(DOCUMENT_INDEX_QUEUE) private readonly indexQueue: Queue,
  ) {}

  async enqueueIndex(documentId: string, tenantId = 'default') {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      include: { parsedArtifact: true },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    if (
      doc.status === DocumentStatus.indexing ||
      doc.status === DocumentStatus.queued_index
    ) {
      throw new BadRequestException('Document is already queued or indexing');
    }
    const canIndex =
      doc.status === DocumentStatus.parsed ||
      doc.status === DocumentStatus.indexed ||
      (doc.status === DocumentStatus.failed && !!doc.parsedArtifact?.contentListKey);
    if (!canIndex) {
      throw new BadRequestException(
        `Document must be parsed before indexing. Current status: ${doc.status}`,
      );
    }
    if (!doc.parsedArtifact?.contentListKey) {
      throw new BadRequestException('No content_list.json found for this document');
    }

    await this.prisma.document.update({
      where: { id: doc.id },
      data: {
        status: DocumentStatus.queued_index,
        errorMessage: null,
      },
    });

    const payload: DocumentIndexJobPayload = { documentId: doc.id };
    await this.indexQueue.add('index', payload, {
      jobId: `index-${doc.id}-${Date.now()}`,
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    return {
      documentId: doc.id,
      status: DocumentStatus.queued_index,
      message: 'Index job queued',
    };
  }

  async runIndex(payload: DocumentIndexJobPayload): Promise<void> {
    const { documentId } = payload;
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { parsedArtifact: true },
    });
    if (!doc?.parsedArtifact?.contentListKey) {
      throw new NotFoundException(`Parsed artifact missing for ${documentId}`);
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.indexing },
    });

    try {
      const jsonBuf = await this.storage.getObject(
        doc.parsedArtifact.contentListKey,
      );
      const blocks = JSON.parse(jsonBuf.toString('utf-8')) as ContentListBlock[];
      const drafts = this.chunking.chunkFromContentList(blocks, doc.title);

      if (drafts.length === 0) {
        throw new BadRequestException('No chunks produced from content_list');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.chunk.deleteMany({ where: { documentId } });
        await tx.document.update({
          where: { id: documentId },
          data: { chunkCount: drafts.length },
        });
        await tx.chunk.createMany({
          data: drafts.map((d) => ({
            documentId,
            chunkIndex: d.chunkIndex,
            blockType: d.blockType,
            content: d.content,
            tokenCount: this.chunking.estimateTokens(d.content),
            pageIdx: d.pageIdx,
            headingPath: d.headingPath,
            metadata: d.metadata as object,
          })),
        });
      });

      await this.vectors.deleteByDocument(documentId);

      const savedChunks = await this.prisma.chunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
      });

      const batchSize = this.config.embeddingBatchSize;
      const indexUsage: TokenUsage = { promptTokens: 0, totalTokens: 0 };
      for (let i = 0; i < savedChunks.length; i += batchSize) {
        const batch = savedChunks.slice(i, i + batchSize);
        const { vectors, usage } = await this.embedding.embedTexts(
          batch.map((c) => c.content),
        );
        indexUsage.promptTokens += usage.promptTokens;
        indexUsage.totalTokens += usage.totalTokens;
        await this.vectors.upsertMany(
          batch.map((chunk, idx) => ({
            chunkId: chunk.id,
            documentId,
            tenantId: doc.tenantId,
            embedding: vectors[idx],
            embeddingModel: this.embedding.model,
          })),
        );
      }

      if (
        this.embedding.provider === 'openai' &&
        indexUsage.totalTokens > 0
      ) {
        const cost = await this.openAiUsage.recordDocumentIndex(
          documentId,
          doc.tenantId,
          this.embedding.model,
          indexUsage,
        );
        this.logger.log(
          `OpenAI index usage ${documentId}: ${indexUsage.totalTokens} tokens (~$${cost.toFixed(6)})`,
        );
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.indexed,
          indexedAt: new Date(),
          chunkCount: savedChunks.length,
          errorMessage: null,
        },
      });

      this.logger.log(
        `Indexed document ${documentId}: ${savedChunks.length} chunks`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Index failed for ${documentId}: ${message}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.failed,
          errorMessage: message,
        },
      });
      throw err;
    }
  }

  async listChunks(documentId: string, skip = 0, take = 20) {
    const [items, total] = await Promise.all([
      this.prisma.chunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
        skip,
        take: Math.min(take, 100),
        select: {
          id: true,
          chunkIndex: true,
          blockType: true,
          content: true,
          tokenCount: true,
          pageIdx: true,
          headingPath: true,
        },
      }),
      this.prisma.chunk.count({ where: { documentId } }),
    ]);
    return { total, items };
  }
}
