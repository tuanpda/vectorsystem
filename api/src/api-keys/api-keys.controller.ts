import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

type AdminReq = { user: { id: string } };

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'List active API keys (admin JWT only)' })
  list() {
    return this.apiKeys.list();
  }

  @Post()
  @ApiOperation({
    summary: 'Create API key for bot apps',
    description:
      'Returns `secret` once. Use header X-API-Key or Authorization: Bearer <secret> on POST /rag/query',
  })
  create(@Body() dto: CreateApiKeyDto, @Req() req: AdminReq) {
    return this.apiKeys.create(dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke API key' })
  revoke(@Param('id') id: string) {
    return this.apiKeys.revoke(id);
  }
}
