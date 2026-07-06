import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTransferRequestDto {
  @ApiProperty({
    example: '698bb3db-39d9-436a-aeea-fd94a69d87c9',
  })
  @IsUUID()
  toCustodianId!: string;

  @ApiProperty({
    example:
      'Transfer evidence to forensic custodian for detailed examination.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({
    example: 'Digital Forensics Lab 02',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  location?: string;
}
