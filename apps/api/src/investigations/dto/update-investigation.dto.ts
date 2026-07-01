import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateInvestigationDto {
  @ApiPropertyOptional({
    example: 'Updated unauthorized access investigation',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated investigation description and additional details.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
