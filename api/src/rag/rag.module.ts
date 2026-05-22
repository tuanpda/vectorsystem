import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../embeddings/embedding.module';
import { VectorModule } from '../vectors/vector.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

@Module({
  imports: [EmbeddingModule, VectorModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
