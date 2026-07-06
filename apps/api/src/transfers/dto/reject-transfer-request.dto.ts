import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectTransferRequestDto {
  @ApiProperty({
    example: 'The target custodian is unavailable.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rejectionReason!: string;
}
