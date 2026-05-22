import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';
import { MineruModule } from '../mineru/mineru.module';
import { StorageModule } from '../storage/storage.module';
import { DOCUMENT_PARSE_QUEUE } from './parse.constants';
import { ParseProcessor } from './parse.processor';
import { ParseService } from './parse.service';
import { ParseStorageService } from './parse-storage.service';

@Module({
  imports: [
    AppConfigModule,
    MineruModule,
    StorageModule,
    BullModule.registerQueueAsync({
      name: DOCUMENT_PARSE_QUEUE,
      imports: [AppConfigModule],
      useFactory: (config: AppConfigService) => ({
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
      inject: [AppConfigService],
    }),
  ],
  providers: [ParseService, ParseStorageService, ParseProcessor],
  exports: [ParseService],
})
export class ParseModule {}
