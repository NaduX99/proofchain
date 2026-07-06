import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString, IsUUID } from 'class-validator';

import { BaseSearchQueryDto } from './base-search-query.dto';

export class AuditLogSearchQueryDto extends BaseSearchQueryDto {
  @ApiPropertyOptional({
    example: 'EVIDENCE_FILE_VERIFIED',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    example: '698bb3db-39d9-436a-aeea-fd94a69d87c9',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  success?: string;
}
