import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BaseSearchQueryDto {
  @ApiPropertyOptional({
    example: 'laptop',
    description: 'Search text',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Page number',
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    example: '10',
    description: 'Items per page',
  })
  @IsOptional()
  @IsString()
  limit?: string;
}
