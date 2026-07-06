import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EvidenceType } from '../enums/evidence-type.enum';

export class CreateEvidenceDto {
  @ApiProperty({
    example: 'EVD-2026-0001',
    description: 'Unique evidence code inside the organization',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'Evidence code can contain only letters, numbers and hyphens',
  })
  evidenceCode!: string;

  @ApiProperty({
    example: 'Suspect laptop',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: 'Dell laptop collected from the suspect workstation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    enum: EvidenceType,
    example: EvidenceType.COMPUTER,
  })
  @IsEnum(EvidenceType, {
    message: 'Evidence type must be a valid evidence type',
  })
  evidenceType!: EvidenceType;

  @ApiPropertyOptional({
    example: '2026-07-03T09:30:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  collectedAt?: string;
}
