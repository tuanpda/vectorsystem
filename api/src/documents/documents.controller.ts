import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { memoryStorage } from 'multer';
import { IndexService } from '../index/index.service';
import { ParseService } from '../parse/parse.service';
import { DocumentsService } from './documents.service';
import { DocumentResponseDto } from './dto/document-response.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly parseService: ParseService,
    private readonly indexService: IndexService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload PDF/DOCX/PPTX/XLSX' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        language: { type: 'string', example: 'vi' },
        tags: { type: 'string', example: 'policy,hr' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    return this.documents.upload(file, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List documents' })
  @ApiQuery({ name: 'status', required: false, enum: DocumentStatus })
  @ApiQuery({ name: 'q', required: false, description: 'Search title or filename' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  list(
    @Query('status') status?: DocumentStatus,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.documents.findAll({
      status,
      q,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 100,
    });
  }

  @Post(':id/parse')
  @ApiOperation({
    summary: 'Queue MinerU parse job',
    description:
      'Requires mineru-api running (MinerU\\run-mineru.ps1 api). Poll document status until parsed.',
  })
  queueParse(@Param('id') id: string) {
    return this.parseService.enqueueParse(id);
  }

  @Get(':id/parse-jobs')
  @ApiOperation({ summary: 'List parse jobs for document' })
  listParseJobs(@Param('id') id: string) {
    return this.parseService.listParseJobs(id);
  }

  @Get(':id/markdown')
  @ApiOperation({ summary: 'Preview parsed markdown (after parsed)' })
  getMarkdown(@Param('id') id: string) {
    return this.documents.getMarkdown(id);
  }

  @Post(':id/index')
  @ApiOperation({
    summary: 'Queue chunk + embed + vector index',
    description: 'Requires OPENAI_API_KEY and document status=parsed',
  })
  queueIndex(@Param('id') id: string) {
    return this.indexService.enqueueIndex(id);
  }

  @Get(':id/chunks')
  @ApiOperation({ summary: 'List chunks (after indexed)' })
  listChunks(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.indexService.listChunks(
      id,
      skip ? Number(skip) : 0,
      take ? Number(take) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by id' })
  findOne(@Param('id') id: string) {
    return this.documents.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document and raw file' })
  async remove(@Param('id') id: string) {
    await this.documents.delete(id);
    return { ok: true, id };
  }
}
