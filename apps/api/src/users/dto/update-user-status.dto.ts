import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: false,
    description: 'Activate or deactivate the user account',
  })
  @IsBoolean()
  isActive: boolean;
}
