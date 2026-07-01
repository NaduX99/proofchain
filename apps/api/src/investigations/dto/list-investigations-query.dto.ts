import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { InvestigationStatus } from '../enums/investigation-status.enum';

export class ListInvestigationsQueryDto {
  @ApiPropertyOptional({
    enum: InvestigationStatus,
    description: 'Filter investigations by status',
  })
  @IsOptional()
  @IsEnum(InvestigationStatus, {
    message: 'Status must be OPEN, UNDER_INVESTIGATION, CLOSED or ARCHIVED',
  })
  status?: InvestigationStatus;
}
