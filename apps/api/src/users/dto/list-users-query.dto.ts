import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Filter users by organization ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
