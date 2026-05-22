import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OpenAiUsageService } from './openai-usage.service';

@ApiTags('usage')
@Controller('usage')
export class UsageController {
  constructor(private readonly usage: OpenAiUsageService) {}

  @Get('openai')
  @ApiOperation({
    summary: 'OpenAI embedding usage & estimated cost (index, RAG)',
  })
  getOpenAiSummary() {
    return this.usage.getSummary();
  }
}
