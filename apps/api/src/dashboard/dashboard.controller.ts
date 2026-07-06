import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuditAction } from '../audit/decorators/audit-action.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

import {
  DashboardService,
  DashboardSummary,
  IntegrityWarning,
  RecentCustodyEvent,
  StatusCount,
} from './dashboard.service';

@ApiTags('Dashboard')
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
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @AuditAction('DASHBOARD_SUMMARY_VIEWED')
  @ApiOperation({
    summary: 'Get dashboard summary counts',
  })
  @ApiOkResponse({
    description: 'Dashboard summary retrieved successfully',
  })
  async getSummary(
    @CurrentUser()
    user: JwtPayload,
  ): Promise<{
    success: boolean;
    message: string;
    data: DashboardSummary;
  }> {
    const summary = await this.dashboardService.getSummary(user.organizationId);

    return {
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: summary,
    };
  }

  @Get('evidence-status')
  @AuditAction('DASHBOARD_EVIDENCE_STATUS_VIEWED')
  @ApiOperation({
    summary: 'Get evidence status chart data',
  })
  @ApiOkResponse({
    description: 'Evidence status data retrieved successfully',
  })
  async getEvidenceStatusCounts(
    @CurrentUser()
    user: JwtPayload,
  ): Promise<{
    success: boolean;
    message: string;
    data: StatusCount[];
  }> {
    const counts = await this.dashboardService.getEvidenceStatusCounts(
      user.organizationId,
    );

    return {
      success: true,
      message: 'Evidence status data retrieved successfully',
      data: counts,
    };
  }

  @Get('investigation-status')
  @AuditAction('DASHBOARD_INVESTIGATION_STATUS_VIEWED')
  @ApiOperation({
    summary: 'Get investigation status chart data',
  })
  @ApiOkResponse({
    description: 'Investigation status data retrieved successfully',
  })
  async getInvestigationStatusCounts(
    @CurrentUser()
    user: JwtPayload,
  ): Promise<{
    success: boolean;
    message: string;
    data: StatusCount[];
  }> {
    const counts = await this.dashboardService.getInvestigationStatusCounts(
      user.organizationId,
    );

    return {
      success: true,
      message: 'Investigation status data retrieved successfully',
      data: counts,
    };
  }

  @Get('recent-custody-events')
  @AuditAction('DASHBOARD_RECENT_CUSTODY_VIEWED')
  @ApiOperation({
    summary: 'Get recent custody events',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
  })
  @ApiOkResponse({
    description: 'Recent custody events retrieved successfully',
  })
  async getRecentCustodyEvents(
    @CurrentUser()
    user: JwtPayload,

    @Query(
      'limit',
      new ParseIntPipe({
        optional: true,
      }),
    )
    limit = 10,
  ): Promise<{
    success: boolean;
    message: string;
    data: RecentCustodyEvent[];
  }> {
    const events = await this.dashboardService.getRecentCustodyEvents(
      user.organizationId,
      limit,
    );

    return {
      success: true,
      message: 'Recent custody events retrieved successfully',
      data: events,
    };
  }

  @Get('integrity-warnings')
  @AuditAction('DASHBOARD_INTEGRITY_WARNINGS_VIEWED')
  @ApiOperation({
    summary: 'Get evidence integrity warnings',
  })
  @ApiOkResponse({
    description: 'Integrity warnings retrieved successfully',
  })
  async getIntegrityWarnings(
    @CurrentUser()
    user: JwtPayload,
  ): Promise<{
    success: boolean;
    message: string;
    data: IntegrityWarning[];
  }> {
    const warnings = await this.dashboardService.getIntegrityWarnings(
      user.organizationId,
    );

    return {
      success: true,
      message: 'Integrity warnings retrieved successfully',
      data: warnings,
    };
  }
}
