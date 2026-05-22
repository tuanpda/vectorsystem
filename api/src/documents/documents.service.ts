import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Document, DocumentStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { DocumentResponseDto } from './dto/document-response.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const ALLOWED_EXT = new Set(['.pdf', '.docx', '.pptx', '.xlsx']);

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioService,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    tenantId = 'default',
  ): Promise<DocumentResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required (field name: file)');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${[...ALLOWED_EXT].join(', ')}`,
      );
    }
    if (file.mimetype && !ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported mime type: ${file.mimetype}`);
    }

    const docId = randomUUID();
    const safeName = file.originalname.replace(/[^\w.\-() ]+/g, '_');
    const storageKey = `raw/${tenantId}/${docId}/${safeName}`;
    const title =
      dto.title?.trim() ||
      path.basename(file.originalname, ext) ||
      file.originalname;

    const tags = dto.tags
      ? dto.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    await this.storage.putObject(storageKey, file.buffer, {
      'Content-Type': file.mimetype || 'application/octet-stream',
      'X-Original-Name': file.originalname,
    });

    const doc = await this.prisma.document.create({
      data: {
        id: docId,
        tenantId,
        title,
        originalName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        fileSize: file.size,
        storageKey,
        status: DocumentStatus.uploaded,
        tags,
        language: dto.language?.trim() || 'vi',
      },
    });

    return DocumentResponseDto.fromEntity(doc);
  }

  async findAll(params?: {
    tenantId?: string;
    status?: DocumentStatus;
    q?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.DocumentWhereInput = {
      tenantId: params?.tenantId ?? 'default',
    };
    if (params?.status) {
      where.status = params.status;
    }
    const q = params?.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { originalName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: Math.min(params?.take ?? 50, 100),
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      total,
      items: items.map(DocumentResponseDto.fromEntity),
    };
  }

  async findOne(id: string, tenantId = 'default') {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId },
      include: { parsedArtifact: true },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    return {
      ...DocumentResponseDto.fromEntity(doc),
      parsedArtifact: doc.parsedArtifact,
    };
  }

  async getMarkdown(id: string, tenantId = 'default') {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId },
      include: { parsedArtifact: true },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    if (!doc.parsedArtifact?.markdownKey) {
      throw new BadRequestException(
        'Document has no parsed markdown yet. Call POST /parse first.',
      );
    }
    const buf = await this.storage.getObject(doc.parsedArtifact.markdownKey);
    return {
      documentId: id,
      markdownKey: doc.parsedArtifact.markdownKey,
      content: buf.toString('utf-8'),
    };
  }

  async delete(id: string, tenantId = 'default'): Promise<void> {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    await this.storage.removeObject(doc.storageKey).catch(() => undefined);
    await this.prisma.document.delete({ where: { id } });
  }
}
