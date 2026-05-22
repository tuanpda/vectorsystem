import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DOCUMENT_INDEX_QUEUE, DocumentIndexJobPayload } from './index.constants';
import { IndexService } from './index.service';

@Processor(DOCUMENT_INDEX_QUEUE, { concurrency: 1 })
export class IndexProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexProcessor.name);

  constructor(private readonly indexService: IndexService) {
    super();
  }

  async process(job: Job<DocumentIndexJobPayload>): Promise<void> {
    this.logger.log(`Processing index job ${job.id} doc=${job.data.documentId}`);
    await this.indexService.runIndex(job.data);
  }
}
