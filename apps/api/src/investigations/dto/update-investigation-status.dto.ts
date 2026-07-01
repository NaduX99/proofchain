import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { InvestigationStatus } from '../enums/investigation-status.enum';

export class UpdateInvestigationStatusDto {
  @ApiProperty({
    enum: InvestigationStatus,
    example: InvestigationStatus.UNDER_INVESTIGATION,
  })
  @IsEnum(InvestigationStatus, {
    message: 'Status must be OPEN, UNDER_INVESTIGATION, CLOSED or ARCHIVED',
  })
  status!: InvestigationStatus;
}
