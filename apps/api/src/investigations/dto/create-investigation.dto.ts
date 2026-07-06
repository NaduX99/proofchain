import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInvestigationDto {
  @ApiProperty({
    example: 'PC-2026-0001',
    description: 'Unique case code inside the organization',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'Case code can contain only letters, numbers and hyphens',
  })
  caseCode!: string;

  @ApiProperty({
    example: 'Unauthorized access investigation',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example:
      'Investigation into suspicious access detected on the internal server.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
