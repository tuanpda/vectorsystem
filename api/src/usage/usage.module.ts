import { Global, Module } from '@nestjs/common';
import { OpenAiUsageService } from './openai-usage.service';
import { UsageController } from './usage.controller';

@Global()
@Module({
  controllers: [UsageController],
  providers: [OpenAiUsageService],
  exports: [OpenAiUsageService],
})
export class UsageModule {}
