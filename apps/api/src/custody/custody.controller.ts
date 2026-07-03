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
import { CreateCustodyEventDto } from './dto/create-custody-event.dto';
import type { ChainVerificationResult } from './interfaces/chain-verification-result.interface';
import type { CustodyEventRow } from './interfaces/custody-event-row.interface';
import { CustodyService } from './custody.service';

@ApiTags('Chain of Custody')
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
@Controller('evidence/:evidenceId/custody-events')
export class CustodyController {
  constructor(private readonly custodyService: CustodyService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR, UserRole.CUSTODIAN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a cryptographically linked custody event',
  })
  @ApiParam({
    name: 'evidenceId',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Custody event created successfully',
  })
  async create(
    @CurrentUser() user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,

    @Body()
    dto: CreateCustodyEventDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: CustodyEventRow;
  }> {
    const custodyEvent = await this.custodyService.create(
      user.organizationId,
      evidenceId,
      user.sub,
      dto,
    );

    return {
      success: true,
      message: 'Custody event created successfully',
      data: custodyEvent,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get the complete evidence custody history',
  })
  @ApiOkResponse({
    description: 'Custody history retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: CustodyEventRow[];
  }> {
    const events = await this.custodyService.findAll(
      user.organizationId,
      evidenceId,
    );

    return {
      success: true,
      message: 'Custody history retrieved successfully',
      data: events,
    };
  }

  @Get('verify-chain')
  @ApiOperation({
    summary: 'Verify the complete custody-event hash chain',
  })
  @ApiOkResponse({
    description: 'Custody chain verification completed',
  })
  async verifyChain(
    @CurrentUser() user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: ChainVerificationResult;
  }> {
    const result = await this.custodyService.verifyChain(
      user.organizationId,
      evidenceId,
    );

    return {
      success: true,
      message: result.valid
        ? 'Custody chain is valid'
        : 'Custody chain verification failed',
      data: result,
    };
  }
}
