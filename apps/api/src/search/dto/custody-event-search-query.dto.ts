import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

import { BaseSearchQueryDto } from './base-search-query.dto';

export class CustodyEventSearchQueryDto extends BaseSearchQueryDto {
  @ApiPropertyOptional({
    example: '6865110a-904d-452a-8249-32960d343243',
  })
  @IsOptional()
  @IsUUID()
  evidenceId?: string;

  @ApiPropertyOptional({
    example: 'TRANSFERRED',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    example: '698bb3db-39d9-436a-aeea-fd94a69d87c9',
  })
  @IsOptional()
  @IsUUID()
  performedBy?: string;
}
