import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

import { CreateTransferRequestDto } from './dto/create-transfer-request.dto';
import { RejectTransferRequestDto } from './dto/reject-transfer-request.dto';
import type { TransferRequestRow } from './interfaces/transfer-request-row.interface';
import { TransfersService } from './transfers.service';

@ApiTags('Custody Transfers')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token is missing or invalid',
})
@ApiForbiddenResponse({
  description: 'Your role cannot perform this action',
})
@Roles(
  UserRole.ADMIN,
  UserRole.INVESTIGATOR,
  UserRole.CUSTODIAN,
  UserRole.AUDITOR,
)
@Controller()
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post('evidence/:evidenceId/transfer-requests')
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR, UserRole.CUSTODIAN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request transfer of evidence custody',
  })
  @ApiParam({
    name: 'evidenceId',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Transfer request created successfully',
  })
  async createRequest(
    @CurrentUser()
    user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,

    @Body()
    dto: CreateTransferRequestDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: TransferRequestRow;
  }> {
    const transferRequest = await this.transfersService.createRequest(
      user.organizationId,
      evidenceId,
      user.sub,
      dto,
    );

    return {
      success: true,
      message: 'Transfer request created successfully',
      data: transferRequest,
    };
  }

  @Get('evidence/:evidenceId/transfer-requests')
  @ApiOperation({
    summary: 'Get transfer requests for an evidence item',
  })
  @ApiParam({
    name: 'evidenceId',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Transfer requests retrieved successfully',
  })
  async findAllByEvidence(
    @CurrentUser()
    user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: TransferRequestRow[];
  }> {
    const transfers = await this.transfersService.findAllByEvidence(
      user.organizationId,
      evidenceId,
    );

    return {
      success: true,
      message: 'Transfer requests retrieved successfully',
      data: transfers,
    };
  }

  @Post('transfer-requests/:requestId/approve')
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR, UserRole.CUSTODIAN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a custody transfer request',
  })
  @ApiParam({
    name: 'requestId',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Transfer request approved successfully',
  })
  async approve(
    @CurrentUser()
    user: JwtPayload,

    @Param('requestId', new ParseUUIDPipe())
    requestId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: TransferRequestRow;
  }> {
    const transfer = await this.transfersService.approve(
      user.organizationId,
      requestId,
      user.sub,
    );

    return {
      success: true,
      message: 'Transfer request approved successfully',
      data: transfer,
    };
  }

  @Post('transfer-requests/:requestId/reject')
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR, UserRole.CUSTODIAN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a custody transfer request',
  })
  @ApiParam({
    name: 'requestId',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Transfer request rejected successfully',
  })
  async reject(
    @CurrentUser()
    user: JwtPayload,

    @Param('requestId', new ParseUUIDPipe())
    requestId: string,

    @Body()
    dto: RejectTransferRequestDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: TransferRequestRow;
  }> {
    const transfer = await this.transfersService.reject(
      user.organizationId,
      requestId,
      user.sub,
      dto,
    );

    return {
      success: true,
      message: 'Transfer request rejected successfully',
      data: transfer,
    };
  }

  @Post('transfer-requests/:requestId/complete')
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR, UserRole.CUSTODIAN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete an approved custody transfer request',
  })
  @ApiParam({
    name: 'requestId',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Transfer request completed successfully',
  })
  async complete(
    @CurrentUser()
    user: JwtPayload,

    @Param('requestId', new ParseUUIDPipe())
    requestId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: TransferRequestRow;
  }> {
    const transfer = await this.transfersService.complete(
      user.organizationId,
      requestId,
      user.sub,
    );

    return {
      success: true,
      message: 'Transfer request completed successfully',
      data: transfer,
    };
  }
}
