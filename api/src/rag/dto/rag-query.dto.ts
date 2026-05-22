import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RagQueryDto {
  @ApiProperty({ example: 'Nội dung về Linear Regression trong tài liệu?' })
  @IsString()
  question!: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  topK?: number;

  @ApiPropertyOptional({
    description: 'Giới hạn tìm trong các document id',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];
}
