import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'proofchain-security-lab',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/)
  organizationSlug: string;

  @ApiProperty({
    example: 'admin@proofchain.local',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Admin12345',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
