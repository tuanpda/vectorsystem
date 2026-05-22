import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentStatus,
  ParseJob,
  ParseJobStatus,
} from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';
import { MineruService } from '../mineru/mineru.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { DOCUMENT_PARSE_QUEUE, DocumentParseJobPayload } from './parse.constants';
import { ParseStorageService } from './parse-storage.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ParseService {
  private readonly logger = new Logger(ParseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioService,
    private readonly mineru: MineruService,
    private readonly parseStorage: ParseStorageService,
    private readonly config: AppConfigService,
    @InjectQueue(DOCUMENT_PARSE_QUEUE) private readonly parseQueue: Queue,
  ) {}

  async enqueueParse(documentId: string, tenantId = 'default') {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    if (
      doc.status === DocumentStatus.parsing ||
      doc.status === DocumentStatus.queued_parse
    ) {
      throw new BadRequestException('Document is already queued or parsing');
    }

    const parseJob = await this.prisma.parseJob.create({
      data: {
        documentId: doc.id,
        backend: doc.mineruBackend,
        status: ParseJobStatus.pending,
      },
    });

    await this.prisma.document.update({
      where: { id: doc.id },
      data: {
        status: DocumentStatus.queued_parse,
        errorMessage: null,
      },
    });

    const payload: DocumentParseJobPayload = {
      documentId: doc.id,
      parseJobId: parseJob.id,
    };

    await this.parseQueue.add('parse', payload, {
      jobId: `parse-${doc.id}-${parseJob.id}`,
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    return {
      documentId: doc.id,
      parseJobId: parseJob.id,
      status: DocumentStatus.queued_parse,
      message: 'Parse job queued',
    };
  }

  async runParse(payload: DocumentParseJobPayload): Promise<void> {
    const { documentId, parseJobId } = payload;
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.parsing },
    });
    await this.prisma.parseJob.update({
      where: { id: parseJobId },
      data: {
        status: ParseJobStatus.processing,
        startedAt: new Date(),
      },
    });

    try {
      const fileBuffer = await this.storage.getObject(doc.storageKey);
      const stem = this.mineru.fileStem(doc.originalName);

      const submit = await this.mineru.submitTask(
        fileBuffer,
        doc.originalName,
        doc.mimeType,
        {
          backend: doc.mineruBackend,
          parseMethod: 'auto',
          langList: [this.mineru.mapLanguageToMineru(doc.language)],
          language: doc.language,
        },
      );

      await this.prisma.parseJob.update({
        where: { id: parseJobId },
        data: { mineruTaskId: submit.task_id },
      });

      await this.mineru.pollUntilDone(
        submit.status_url,
        this.config.mineruTaskTimeoutMs,
        this.config.mineruPollIntervalMs,
      );

      const zipBuffer = await this.mineru.downloadResultZip(submit.result_url);
      const artifacts = await this.parseStorage.storeZipResults(
        zipBuffer,
        doc.tenantId,
        doc.id,
        stem,
      );

      await this.prisma.parsedArtifact.upsert({
        where: { documentId: doc.id },
        create: {
          documentId: doc.id,
          markdownKey: artifacts.markdownKey,
          contentListKey: artifacts.contentListKey,
          imagesPrefix: artifacts.imagesPrefix,
          mineruVersion: '3.1.15',
        },
        update: {
          markdownKey: artifacts.markdownKey,
          contentListKey: artifacts.contentListKey,
          imagesPrefix: artifacts.imagesPrefix,
          mineruVersion: '3.1.15',
        },
      });

      await this.prisma.parseJob.update({
        where: { id: parseJobId },
        data: {
          status: ParseJobStatus.completed,
          completedAt: new Date(),
        },
      });

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.parsed,
          errorMessage: null,
        },
      });

      this.logger.log(
        `Parsed document ${documentId}: md=${artifacts.markdownKey}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Parse failed for ${documentId}: ${message}`);

      await this.prisma.parseJob.update({
        where: { id: parseJobId },
        data: {
          status: ParseJobStatus.failed,
          errorMessage: message,
          completedAt: new Date(),
        },
      });

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

  async listParseJobs(documentId: string): Promise<ParseJob[]> {
    return this.prisma.parseJob.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
