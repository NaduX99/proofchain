import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
} from 'class-validator';

import { BaseSearchQueryDto } from './base-search-query.dto';

export class InvestigationSearchQueryDto extends BaseSearchQueryDto {
  @ApiPropertyOptional({
    example: 'OPEN',
  })
  @IsOptional()
  @IsString()
  status?: string;
}