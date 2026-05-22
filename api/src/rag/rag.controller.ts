import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuthUser } from '../api-keys/api-keys.service';
import { Scopes } from '../auth/scopes.decorator';
import { RagQueryDto } from './dto/rag-query.dto';
import { RagService } from './rag.service';

@ApiTags('rag')
@Controller('rag')
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Post('query')
  @Scopes('rag:query')
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Semantic search over indexed chunks (for bot app)',
    description:
      'Auth: admin JWT **or** API key (X-API-Key / Bearer mk_live_...). Returns contexts only — your bot calls its own LLM.',
  })
  query(
    @Body() dto: RagQueryDto,
    @Req() req: { user: ApiKeyAuthUser | { id: string } },
  ) {
    const tenantId =
      'authType' in req.user && req.user.authType === 'api_key'
        ? req.user.tenantId
        : 'default';
    return this.rag.query(dto, tenantId);
  }
}
