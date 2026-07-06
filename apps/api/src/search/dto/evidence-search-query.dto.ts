import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { BaseSearchQueryDto } from './base-search-query.dto';

export class EvidenceSearchQueryDto extends BaseSearchQueryDto {
  @ApiPropertyOptional({
    example: 'TRANSFERRED',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: 'DIGITAL_MEDIA',
  })
  @IsOptional()
  @IsString()
  evidenceType?: string;

  @ApiPropertyOptional({
    example: '8bdb88ed-5843-43b1-bb0e-c02d34449f6d',
  })
  @IsOptional()
  @IsUUID()
  investigationId?: string;

  @ApiPropertyOptional({
    example: '698bb3db-39d9-436a-aeea-fd94a69d87c9',
  })
  @IsOptional()
  @IsUUID()
  currentCustodianId?: string;
}