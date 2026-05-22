import { Document, DocumentStatus } from '@prisma/client';

export class DocumentResponseDto {
  id: string;
  tenantId: string;
  title: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  status: DocumentStatus;
  tags: string[];
  language: string;
  mineruBackend: string;
  chunkCount: number;
  indexPromptTokens: number | null;
  indexEstimatedUsd: number | null;
  errorMessage: string | null;
  indexedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(doc: Document): DocumentResponseDto {
    return {
      id: doc.id,
      tenantId: doc.tenantId,
      title: doc.title,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      storageKey: doc.storageKey,
      status: doc.status,
      tags: doc.tags,
      language: doc.language,
      mineruBackend: doc.mineruBackend,
      chunkCount: doc.chunkCount,
      indexPromptTokens: doc.indexPromptTokens,
      indexEstimatedUsd:
        doc.indexEstimatedUsd != null ? Number(doc.indexEstimatedUsd) : null,
      errorMessage: doc.errorMessage,
      indexedAt: doc.indexedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
