import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ChunkingModule } from '../chunking/chunking.module';
import { EmbeddingModule } from '../embeddings/embedding.module';
import { StorageModule } from '../storage/storage.module';
import { VectorModule } from '../vectors/vector.module';
import { DOCUMENT_INDEX_QUEUE } from './index.constants';
import { IndexProcessor } from './index.processor';
import { IndexService } from './index.service';

@Module({
  imports: [
    ChunkingModule,
    EmbeddingModule,
    VectorModule,
    StorageModule,
    BullModule.registerQueue({ name: DOCUMENT_INDEX_QUEUE }),
  ],
  providers: [IndexService, IndexProcessor],
  exports: [IndexService],
})
export class IndexModule {}
