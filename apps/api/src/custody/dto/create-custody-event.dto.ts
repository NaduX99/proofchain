import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { EvidenceStatus } from '../../evidence/enums/evidence-status.enum';
import { CustodyEventType } from '../enums/custody-event-type.enum';

export class CreateCustodyEventDto {
  @ApiProperty({
    enum: CustodyEventType,
    example: CustodyEventType.ACCESSED,
  })
  @IsEnum(CustodyEventType)
  eventType!: CustodyEventType;

  @ApiProperty({
    example: 'Evidence accessed for forensic examination.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Required when eventType is TRANSFERRED',
    format: 'uuid',
  })
  @ValidateIf(
    (dto: CreateCustodyEventDto) =>
      dto.eventType === CustodyEventType.TRANSFERRED,
  )
  @IsUUID()
  toCustodianId?: string;

  @ApiPropertyOptional({
    enum: EvidenceStatus,
    description: 'Required when eventType is STATUS_CHANGED',
  })
  @ValidateIf(
    (dto: CreateCustodyEventDto) =>
      dto.eventType === CustodyEventType.STATUS_CHANGED,
  )
  @IsEnum(EvidenceStatus)
  newStatus?: EvidenceStatus;

  @ApiPropertyOptional({
    example: {
      location: 'Digital Forensics Lab 02',
      workstation: 'DF-WS-04',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
