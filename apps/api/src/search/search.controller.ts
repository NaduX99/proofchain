import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuditAction } from '../audit/decorators/audit-action.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

import { AuditLogSearchQueryDto } from './dto/audit-log-search-query.dto';
import { CustodyEventSearchQueryDto } from './dto/custody-event-search-query.dto';
import { EvidenceSearchQueryDto } from './dto/evidence-search-query.dto';
import { InvestigationSearchQueryDto } from './dto/investigation-search-query.dto';
import { TransferRequestSearchQueryDto } from './dto/transfer-request-search-query.dto';
import type { PaginatedResult } from './interfaces/paginated-result.interface';

import {
  AuditLogSearchItem,
  CustodyEventSearchItem,
  EvidenceSearchItem,
  InvestigationSearchItem,
  SearchService,
  TransferRequestSearchItem,
} from './search.service';

@ApiTags('Search')
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
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
  ) {}

  @Get('evidence')
  @AuditAction('SEARCH_EVIDENCE_VIEWED')
  @ApiOperation({
    summary: 'Search evidence with filters and pagination',
  })
  @ApiOkResponse({
    description: 'Evidence search results retrieved successfully',
  })
  async searchEvidence(
    @CurrentUser() user: JwtPayload,
    @Query() query: EvidenceSearchQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PaginatedResult<EvidenceSearchItem>;
  }> {
    const results =
      await this.searchService.searchEvidence(
        user.organizationId,
        query,
      );

    return {
      success: true,
      message: 'Evidence search results retrieved successfully',
      data: results,
    };
  }

  @Get('investigations')
  @AuditAction('SEARCH_INVESTIGATIONS_VIEWED')
  @ApiOperation({
    summary: 'Search investigations with filters and pagination',
  })
  @ApiOkResponse({
    description: 'Investigation search results retrieved successfully',
  })
  async searchInvestigations(
    @CurrentUser() user: JwtPayload,
    @Query() query: InvestigationSearchQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PaginatedResult<InvestigationSearchItem>;
  }> {
    const results =
      await this.searchService.searchInvestigations(
        user.organizationId,
        query,
      );

    return {
      success: true,
      message: 'Investigation search results retrieved successfully',
      data: results,
    };
  }

  @Get('custody-events')
  @AuditAction('SEARCH_CUSTODY_EVENTS_VIEWED')
  @ApiOperation({
    summary: 'Search custody events with filters and pagination',
  })
  @ApiOkResponse({
    description: 'Custody event search results retrieved successfully',
  })
  async searchCustodyEvents(
    @CurrentUser() user: JwtPayload,
    @Query() query: CustodyEventSearchQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PaginatedResult<CustodyEventSearchItem>;
  }> {
    const results =
      await this.searchService.searchCustodyEvents(
        user.organizationId,
        query,
      );

    return {
      success: true,
      message: 'Custody event search results retrieved successfully',
      data: results,
    };
  }

  @Get('transfer-requests')
  @AuditAction('SEARCH_TRANSFER_REQUESTS_VIEWED')
  @ApiOperation({
    summary: 'Search transfer requests with filters and pagination',
  })
  @ApiOkResponse({
    description: 'Transfer request search results retrieved successfully',
  })
  async searchTransferRequests(
    @CurrentUser() user: JwtPayload,
    @Query() query: TransferRequestSearchQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PaginatedResult<TransferRequestSearchItem>;
  }> {
    const results =
      await this.searchService.searchTransferRequests(
        user.organizationId,
        query,
      );

    return {
      success: true,
      message: 'Transfer request search results retrieved successfully',
      data: results,
    };
  }

  @Get('audit-logs')
  @Roles(
    UserRole.ADMIN,
    UserRole.AUDITOR,
  )
  @AuditAction('SEARCH_AUDIT_LOGS_VIEWED')
  @ApiOperation({
    summary: 'Search audit logs with filters and pagination',
  })
  @ApiOkResponse({
    description: 'Audit log search results retrieved successfully',
  })
  async searchAuditLogs(
    @CurrentUser() user: JwtPayload,
    @Query() query: AuditLogSearchQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PaginatedResult<AuditLogSearchItem>;
  }> {
    const results =
      await this.searchService.searchAuditLogs(
        user.organizationId,
        query,
      );

    return {
      success: true,
      message: 'Audit log search results retrieved successfully',
      data: results,
    };
  }
}