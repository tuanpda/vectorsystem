import { Module } from '@nestjs/common';
import { IndexModule } from '../index/index.module';
import { ParseModule } from '../parse/parse.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [StorageModule, ParseModule, IndexModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
