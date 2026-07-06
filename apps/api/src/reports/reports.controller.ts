import {
  Controller,
  Get,
  Header,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuditAction } from '../audit/decorators/audit-action.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

import {
  ReportSummary,
  ReportsService,
} from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description:
    'Access token is missing or invalid',
})
@ApiForbiddenResponse({
  description:
    'Only admins, investigators, custodians, and auditors can access reports',
})
@Roles(
  UserRole.ADMIN,
  UserRole.INVESTIGATOR,
  UserRole.CUSTODIAN,
  UserRole.AUDITOR,
)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService:
      ReportsService,
  ) {}

  @Get('summary')
  @AuditAction('REPORT_SUMMARY_VIEWED')
  @ApiOperation({
    summary:
      'Get report summary counts',
  })
  @ApiOkResponse({
    description:
      'Report summary retrieved successfully',
  })
  async getSummary(
    @CurrentUser()
    user: JwtPayload,
  ): Promise<{
    success: boolean;
    message: string;
    data: ReportSummary;
  }> {
    const summary =
      await this.reportsService.getSummary(
        user.organizationId,
      );

    return {
      success: true,
      message:
        'Report summary retrieved successfully',
      data: summary,
    };
  }

  @Get('evidence.csv')
  @AuditAction('REPORT_EVIDENCE_CSV_DOWNLOADED')
  @Header(
    'Content-Type',
    'text/csv; charset=utf-8',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="proofchain-evidence-report.csv"',
  )
  @ApiProduces('text/csv')
  @ApiOperation({
    summary:
      'Download evidence report as CSV',
  })
  async downloadEvidenceCsv(
    @CurrentUser()
    user: JwtPayload,
  ): Promise<string> {
    return this.reportsService.getEvidenceCsv(
      user.organizationId,
    );
  }

  @Get('investigations.csv')
  @AuditAction('REPORT_INVESTIGATIONS_CSV_DOWNLOADED')
  @Header(
    'Content-Type',
    'text/csv; charset=utf-8',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="proofchain-investigations-report.csv"',
  )
  @ApiProduces('text/csv')
  @ApiOperation({
    summary:
      'Download investigations report as CSV',
  })
  async downloadInvestigationsCsv(
    @CurrentUser()
    user: JwtPayload,
  ): Promise<string> {
    return this.reportsService
      .getInvestigationsCsv(
        user.organizationId,
      );
  }

  @Get('custody-events.csv')
  @AuditAction('REPORT_CUSTODY_EVENTS_CSV_DOWNLOADED')
  @Header(
    'Content-Type',
    'text/csv; charset=utf-8',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="proofchain-custody-events-report.csv"',
  )
  @ApiProduces('text/csv')
  @ApiOperation({
    summary:
      'Download custody events report as CSV',
  })
  async downloadCustodyEventsCsv(
    @CurrentUser()
    user: JwtPayload,
  ): Promise<string> {
    return this.reportsService
      .getCustodyEventsCsv(
        user.organizationId,
      );
  }

  @Get('audit-logs.csv')
  @Roles(
    UserRole.ADMIN,
    UserRole.AUDITOR,
  )
  @AuditAction('REPORT_AUDIT_LOGS_CSV_DOWNLOADED')
  @Header(
    'Content-Type',
    'text/csv; charset=utf-8',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="proofchain-audit-logs-report.csv"',
  )
  @ApiProduces('text/csv')
  @ApiOperation({
    summary:
      'Download audit logs report as CSV',
  })
  async downloadAuditLogsCsv(
    @CurrentUser()
    user: JwtPayload,
  ): Promise<string> {
    return this.reportsService
      .getAuditLogsCsv(
        user.organizationId,
      );
  }
}