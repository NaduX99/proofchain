import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Filter users by organization UUID',
    example: 'd65fcaba-a46c-47d8-b60a-8b4e60106e32',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
