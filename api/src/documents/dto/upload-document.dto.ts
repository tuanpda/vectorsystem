import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiPropertyOptional({ example: 'Tài liệu nội quy công ty' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ example: 'vi', default: 'vi' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;

  @ApiPropertyOptional({
    example: 'policy,hr',
    description: 'Tags phân cách bằng dấu phẩy',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tags?: string;
}
