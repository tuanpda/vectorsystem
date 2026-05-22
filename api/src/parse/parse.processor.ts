import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DOCUMENT_PARSE_QUEUE, DocumentParseJobPayload } from './parse.constants';
import { ParseService } from './parse.service';

@Processor(DOCUMENT_PARSE_QUEUE, { concurrency: 1 })
export class ParseProcessor extends WorkerHost {
  private readonly logger = new Logger(ParseProcessor.name);

  constructor(private readonly parseService: ParseService) {
    super();
  }

  async process(job: Job<DocumentParseJobPayload>): Promise<void> {
    this.logger.log(
      `Processing parse job ${job.id} doc=${job.data.documentId}`,
    );
    await this.parseService.runParse(job.data);
  }
}
