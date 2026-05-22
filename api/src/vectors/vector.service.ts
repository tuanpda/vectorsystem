import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface VectorSearchHit {
  chunkId: string;
  documentId: string;
  content: string;
  blockType: string;
  pageIdx: number | null;
  headingPath: string | null;
  score: number;
}

@Injectable()
export class VectorService {
  constructor(private readonly prisma: PrismaService) {}

  async deleteByDocument(documentId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM chunk_embeddings WHERE document_id = ${documentId}
    `;
  }

  async upsertMany(
    rows: {
      chunkId: string;
      documentId: string;
      tenantId: string;
      embedding: number[];
      embeddingModel: string;
    }[],
  ): Promise<void> {
    for (const row of rows) {
      const vectorLiteral = `[${row.embedding.join(',')}]`;
      await this.prisma.$executeRawUnsafe(
        `
        INSERT INTO chunk_embeddings (chunk_id, document_id, tenant_id, embedding, embedding_model)
        VALUES ($1, $2, $3, $4::vector, $5)
        ON CONFLICT (chunk_id) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          embedding_model = EXCLUDED.embedding_model,
          created_at = CURRENT_TIMESTAMP
        `,
        row.chunkId,
        row.documentId,
        row.tenantId,
        vectorLiteral,
        row.embeddingModel,
      );
    }
  }

  async search(
    queryEmbedding: number[],
    options: {
      tenantId?: string;
      documentIds?: string[];
      topK?: number;
    },
  ): Promise<VectorSearchHit[]> {
    const topK = options.topK ?? 8;
    const tenantId = options.tenantId ?? 'default';
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    if (options.documentIds?.length) {
      const ids = options.documentIds;
      return this.prisma.$queryRawUnsafe<VectorSearchHit[]>(
        `
        SELECT
          c.id AS "chunkId",
          c.document_id AS "documentId",
          c.content,
          c.block_type AS "blockType",
          c.page_idx AS "pageIdx",
          c.heading_path AS "headingPath",
          1 - (e.embedding <=> $1::vector) AS score
        FROM chunk_embeddings e
        JOIN chunks c ON c.id = e.chunk_id
        WHERE e.tenant_id = $2
          AND e.document_id = ANY($3::text[])
        ORDER BY e.embedding <=> $1::vector
        LIMIT $4
        `,
        vectorLiteral,
        tenantId,
        ids,
        topK,
      );
    }

    return this.prisma.$queryRawUnsafe<VectorSearchHit[]>(
      `
      SELECT
        c.id AS "chunkId",
        c.document_id AS "documentId",
        c.content,
        c.block_type AS "blockType",
        c.page_idx AS "pageIdx",
        c.heading_path AS "headingPath",
        1 - (e.embedding <=> $1::vector) AS score
      FROM chunk_embeddings e
      JOIN chunks c ON c.id = e.chunk_id
      WHERE e.tenant_id = $2
      ORDER BY e.embedding <=> $1::vector
      LIMIT $3
      `,
      vectorLiteral,
      tenantId,
      topK,
    );
  }
}
