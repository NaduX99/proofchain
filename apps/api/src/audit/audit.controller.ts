import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

import { AuditService } from './audit.service';
import type { AuditLogRow } from './interfaces/audit-log-row.interface';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token is missing or invalid',
})
@ApiForbiddenResponse({
  description: 'Only admins and auditors can access audit logs',
})
@Roles(UserRole.ADMIN, UserRole.AUDITOR)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Get recent organization audit logs',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
  })
  @ApiOkResponse({
    description: 'Audit logs retrieved successfully',
  })
  async findAll(
    @CurrentUser()
    user: JwtPayload,

    @Query(
      'limit',
      new ParseIntPipe({
        optional: true,
      }),
    )
    limit = 50,
  ): Promise<{
    success: boolean;
    message: string;
    data: AuditLogRow[];
  }> {
    const logs = await this.auditService.findAll(user.organizationId, limit);

    return {
      success: true,
      message: 'Audit logs retrieved successfully',
      data: logs,
    };
  }

  @Get('users/:userId')
  @ApiOperation({
    summary: 'Get audit logs for one user',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
  })
  @ApiOkResponse({
    description: 'User audit logs retrieved successfully',
  })
  async findByUser(
    @CurrentUser()
    user: JwtPayload,

    @Param('userId', new ParseUUIDPipe())
    userId: string,

    @Query(
      'limit',
      new ParseIntPipe({
        optional: true,
      }),
    )
    limit = 50,
  ): Promise<{
    success: boolean;
    message: string;
    data: AuditLogRow[];
  }> {
    const logs = await this.auditService.findByUser(
      user.organizationId,
      userId,
      limit,
    );

    return {
      success: true,
      message: 'User audit logs retrieved successfully',
      data: logs,
    };
  }
}
