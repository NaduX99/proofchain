import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';

import type { AuditLogSearchQueryDto } from './dto/audit-log-search-query.dto';
import type { CustodyEventSearchQueryDto } from './dto/custody-event-search-query.dto';
import type { EvidenceSearchQueryDto } from './dto/evidence-search-query.dto';
import type { InvestigationSearchQueryDto } from './dto/investigation-search-query.dto';
import type { TransferRequestSearchQueryDto } from './dto/transfer-request-search-query.dto';
import type { PaginatedResult } from './interfaces/paginated-result.interface';

export interface EvidenceSearchItem {
  id: string;
  evidenceCode: string;
  title: string;
  evidenceType: string;
  status: string;
  investigationId: string;
  investigationTitle: string | null;
  currentCustodianId: string | null;
  currentCustodianName: string | null;
  createdAt: Date;
}

export interface InvestigationSearchItem {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
}

export interface CustodyEventSearchItem {
  id: string;
  evidenceId: string;
  evidenceCode: string;
  eventType: string;
  performedBy: string | null;
  performedByName: string | null;
  sequenceNumber: number;
  reason: string;
  eventTime: Date;
}

export interface TransferRequestSearchItem {
  id: string;
  evidenceId: string;
  evidenceCode: string;
  status: string;
  requestedBy: string;
  requestedByName: string | null;
  fromCustodianId: string | null;
  fromCustodianName: string | null;
  toCustodianId: string;
  toCustodianName: string | null;
  reason: string;
  createdAt: Date;
}

export interface AuditLogSearchItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number | null;
  success: boolean;
  ipAddress: string | null;
  createdAt: Date;
}

interface EvidenceSearchRow extends QueryResultRow, EvidenceSearchItem {
  totalCount: string;
}

interface InvestigationSearchRow
  extends QueryResultRow {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  totalCount: string;
}

interface CustodyEventSearchRow extends QueryResultRow, CustodyEventSearchItem {
  totalCount: string;
}

interface TransferRequestSearchRow
  extends QueryResultRow, TransferRequestSearchItem {
  totalCount: string;
}

interface AuditLogSearchRow extends QueryResultRow, AuditLogSearchItem {
  totalCount: string;
}

interface PaginationInput {
  page?: string;
  limit?: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly databaseService: DatabaseService) {}

  async searchEvidence(
    organizationId: string,
    query: EvidenceSearchQueryDto,
  ): Promise<PaginatedResult<EvidenceSearchItem>> {
    const { page, limit, offset } = this.getPagination(query);

    const values: unknown[] = [organizationId];

    const where: string[] = ['evidence.organization_id = $1'];

    const searchText = query.query?.trim();

    if (searchText) {
      values.push(`%${searchText}%`);

      const index = values.length;

      where.push(`
        (
          evidence.evidence_code ILIKE $${index}
          OR evidence.title ILIKE $${index}
          OR COALESCE(evidence.description, '') ILIKE $${index}
        )
      `);
    }

    if (query.status) {
      values.push(query.status);
      where.push(`evidence.status::TEXT = $${values.length}`);
    }

    if (query.evidenceType) {
      values.push(query.evidenceType);
      where.push(`evidence.evidence_type = $${values.length}`);
    }

    if (query.investigationId) {
      values.push(query.investigationId);
      where.push(`evidence.investigation_id = $${values.length}`);
    }

    if (query.currentCustodianId) {
      values.push(query.currentCustodianId);
      where.push(`evidence.current_custodian_id = $${values.length}`);
    }

    values.push(limit);
    const limitIndex = values.length;

    values.push(offset);
    const offsetIndex = values.length;

    const result = await this.databaseService.query<EvidenceSearchRow>(
      `
            SELECT
              evidence.id,

              evidence.evidence_code
                AS "evidenceCode",

              evidence.title,

              evidence.evidence_type
                AS "evidenceType",

              evidence.status::TEXT
                AS status,

              evidence.investigation_id
                AS "investigationId",

              investigation.title
                AS "investigationTitle",

              evidence.current_custodian_id
                AS "currentCustodianId",

              custodian.full_name
                AS "currentCustodianName",

              evidence.created_at
                AS "createdAt",

              COUNT(*) OVER()
                AS "totalCount"

            FROM evidence_items evidence

            INNER JOIN investigations investigation
              ON investigation.id =
                evidence.investigation_id

            LEFT JOIN users custodian
              ON custodian.id =
                evidence.current_custodian_id

            WHERE ${where.join(' AND ')}

            ORDER BY
              evidence.created_at DESC

            LIMIT $${limitIndex}
            OFFSET $${offsetIndex}
          `,
      values,
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      evidenceCode: row.evidenceCode,
      title: row.title,
      evidenceType: row.evidenceType,
      status: row.status,
      investigationId: row.investigationId,
      investigationTitle: row.investigationTitle,
      currentCustodianId: row.currentCustodianId,
      currentCustodianName: row.currentCustodianName,
      createdAt: row.createdAt,
    }));

    return this.buildPaginatedResult(
      items,
      result.rows[0]?.totalCount,
      page,
      limit,
    );
  }

 async searchInvestigations(
  organizationId: string,
  query: InvestigationSearchQueryDto,
): Promise<PaginatedResult<InvestigationSearchItem>> {
  const {
    page,
    limit,
    offset,
  } = this.getPagination(query);

  const values: unknown[] = [
    organizationId,
  ];

  const where: string[] = [
    'investigation.organization_id = $1',
  ];

  const searchText =
    query.query?.trim();

  if (searchText) {
    values.push(`%${searchText}%`);

    const index = values.length;

    where.push(`
      (
        investigation.id::TEXT ILIKE $${index}
        OR investigation.title ILIKE $${index}
      )
    `);
  }

  if (query.status) {
    values.push(query.status);

    where.push(
      `investigation.status::TEXT = $${values.length}`,
    );
  }

  values.push(limit);
  const limitIndex = values.length;

  values.push(offset);
  const offsetIndex = values.length;

  const result =
    await this.databaseService.query<InvestigationSearchRow>(
      `
        SELECT
          investigation.id,

          investigation.title,

          investigation.status::TEXT
            AS status,

          investigation.created_at
            AS "createdAt",

          COUNT(*) OVER()
            AS "totalCount"

        FROM investigations investigation

        WHERE ${where.join(' AND ')}

        ORDER BY
          investigation.created_at DESC

        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
      `,
      values,
    );

  const items =
    result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt,
    }));

  return this.buildPaginatedResult(
    items,
    result.rows[0]?.totalCount,
    page,
    limit,
  );
}

  async searchCustodyEvents(
    organizationId: string,
    query: CustodyEventSearchQueryDto,
  ): Promise<PaginatedResult<CustodyEventSearchItem>> {
    const { page, limit, offset } = this.getPagination(query);

    const values: unknown[] = [organizationId];

    const where: string[] = ['event.organization_id = $1'];

    const searchText = query.query?.trim();

    if (searchText) {
      values.push(`%${searchText}%`);

      const index = values.length;

      where.push(`
        (
          evidence.evidence_code ILIKE $${index}
          OR COALESCE(event.reason, '') ILIKE $${index}
          OR event.event_type::TEXT ILIKE $${index}
        )
      `);
    }

    if (query.evidenceId) {
      values.push(query.evidenceId);

      where.push(`event.evidence_id = $${values.length}`);
    }

    if (query.eventType) {
      values.push(query.eventType);

      where.push(`event.event_type::TEXT = $${values.length}`);
    }

    if (query.performedBy) {
      values.push(query.performedBy);

      where.push(`event.performed_by = $${values.length}`);
    }

    values.push(limit);
    const limitIndex = values.length;

    values.push(offset);
    const offsetIndex = values.length;

    const result = await this.databaseService.query<CustodyEventSearchRow>(
      `
            SELECT
              event.id,

              event.evidence_id
                AS "evidenceId",

              evidence.evidence_code
                AS "evidenceCode",

              event.event_type::TEXT
                AS "eventType",

              event.performed_by
                AS "performedBy",

              performer.full_name
                AS "performedByName",

              event.sequence_number::INTEGER
                AS "sequenceNumber",

              event.reason,

              event.event_time
                AS "eventTime",

              COUNT(*) OVER()
                AS "totalCount"

            FROM custody_events event

            INNER JOIN evidence_items evidence
              ON evidence.id =
                event.evidence_id

            LEFT JOIN users performer
              ON performer.id =
                event.performed_by

            WHERE ${where.join(' AND ')}

            ORDER BY
              event.event_time DESC,
              event.sequence_number DESC

            LIMIT $${limitIndex}
            OFFSET $${offsetIndex}
          `,
      values,
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      evidenceId: row.evidenceId,
      evidenceCode: row.evidenceCode,
      eventType: row.eventType,
      performedBy: row.performedBy,
      performedByName: row.performedByName,
      sequenceNumber: row.sequenceNumber,
      reason: row.reason,
      eventTime: row.eventTime,
    }));

    return this.buildPaginatedResult(
      items,
      result.rows[0]?.totalCount,
      page,
      limit,
    );
  }

  async searchTransferRequests(
    organizationId: string,
    query: TransferRequestSearchQueryDto,
  ): Promise<PaginatedResult<TransferRequestSearchItem>> {
    const { page, limit, offset } = this.getPagination(query);

    const values: unknown[] = [organizationId];

    const where: string[] = ['transfer.organization_id = $1'];

    const searchText = query.query?.trim();

    if (searchText) {
      values.push(`%${searchText}%`);

      const index = values.length;

      where.push(`
        (
          evidence.evidence_code ILIKE $${index}
          OR COALESCE(transfer.reason, '') ILIKE $${index}
        )
      `);
    }

    if (query.status) {
      values.push(query.status);

      where.push(`transfer.status::TEXT = $${values.length}`);
    }

    if (query.evidenceId) {
      values.push(query.evidenceId);

      where.push(`transfer.evidence_id = $${values.length}`);
    }

    if (query.requestedBy) {
      values.push(query.requestedBy);

      where.push(`transfer.requested_by = $${values.length}`);
    }

    if (query.toCustodianId) {
      values.push(query.toCustodianId);

      where.push(`transfer.to_custodian_id = $${values.length}`);
    }

    values.push(limit);
    const limitIndex = values.length;

    values.push(offset);
    const offsetIndex = values.length;

    const result = await this.databaseService.query<TransferRequestSearchRow>(
      `
            SELECT
              transfer.id,

              transfer.evidence_id
                AS "evidenceId",

              evidence.evidence_code
                AS "evidenceCode",

              transfer.status::TEXT
                AS status,

              transfer.requested_by
                AS "requestedBy",

              requested_user.full_name
                AS "requestedByName",

              transfer.from_custodian_id
                AS "fromCustodianId",

              from_user.full_name
                AS "fromCustodianName",

              transfer.to_custodian_id
                AS "toCustodianId",

              to_user.full_name
                AS "toCustodianName",

              transfer.reason,

              transfer.created_at
                AS "createdAt",

              COUNT(*) OVER()
                AS "totalCount"

            FROM custody_transfer_requests transfer

            INNER JOIN evidence_items evidence
              ON evidence.id =
                transfer.evidence_id

            LEFT JOIN users requested_user
              ON requested_user.id =
                transfer.requested_by

            LEFT JOIN users from_user
              ON from_user.id =
                transfer.from_custodian_id

            LEFT JOIN users to_user
              ON to_user.id =
                transfer.to_custodian_id

            WHERE ${where.join(' AND ')}

            ORDER BY
              transfer.created_at DESC

            LIMIT $${limitIndex}
            OFFSET $${offsetIndex}
          `,
      values,
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      evidenceId: row.evidenceId,
      evidenceCode: row.evidenceCode,
      status: row.status,
      requestedBy: row.requestedBy,
      requestedByName: row.requestedByName,
      fromCustodianId: row.fromCustodianId,
      fromCustodianName: row.fromCustodianName,
      toCustodianId: row.toCustodianId,
      toCustodianName: row.toCustodianName,
      reason: row.reason,
      createdAt: row.createdAt,
    }));

    return this.buildPaginatedResult(
      items,
      result.rows[0]?.totalCount,
      page,
      limit,
    );
  }

  async searchAuditLogs(
    organizationId: string,
    query: AuditLogSearchQueryDto,
  ): Promise<PaginatedResult<AuditLogSearchItem>> {
    const { page, limit, offset } = this.getPagination(query);

    const values: unknown[] = [organizationId];

    const where: string[] = ['audit.organization_id = $1'];

    const searchText = query.query?.trim();

    if (searchText) {
      values.push(`%${searchText}%`);

      const index = values.length;

      where.push(`
        (
          audit.action ILIKE $${index}
          OR audit.path ILIKE $${index}
          OR COALESCE(audit.error_message, '') ILIKE $${index}
        )
      `);
    }

    if (query.action) {
      values.push(query.action);

      where.push(`audit.action = $${values.length}`);
    }

    if (query.userId) {
      values.push(query.userId);

      where.push(`audit.user_id = $${values.length}`);
    }

    if (query.success) {
      values.push(query.success === 'true');

      where.push(`audit.success = $${values.length}`);
    }

    values.push(limit);
    const limitIndex = values.length;

    values.push(offset);
    const offsetIndex = values.length;

    const result = await this.databaseService.query<AuditLogSearchRow>(
      `
            SELECT
              audit.id,

              audit.user_id
                AS "userId",

              users.full_name
                AS "userName",

              users.email
                AS "userEmail",

              audit.action,

              audit.method,

              audit.path,

              audit.status_code
                AS "statusCode",

              audit.success,

              audit.ip_address
                AS "ipAddress",

              audit.created_at
                AS "createdAt",

              COUNT(*) OVER()
                AS "totalCount"

            FROM audit_logs audit

            LEFT JOIN users
              ON users.id =
                audit.user_id

            WHERE ${where.join(' AND ')}

            ORDER BY
              audit.created_at DESC

            LIMIT $${limitIndex}
            OFFSET $${offsetIndex}
          `,
      values,
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      action: row.action,
      method: row.method,
      path: row.path,
      statusCode: row.statusCode,
      success: row.success,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
    }));

    return this.buildPaginatedResult(
      items,
      result.rows[0]?.totalCount,
      page,
      limit,
    );
  }

  private getPagination(query: PaginationInput): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = this.parsePositiveInteger(query.page, 1, 100000);

    const limit = this.parsePositiveInteger(query.limit, 10, 100);

    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }

  private parsePositiveInteger(
    value: string | undefined,
    defaultValue: number,
    maxValue: number,
  ): number {
    if (!value) {
      return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return defaultValue;
    }

    return Math.min(Math.trunc(parsed), maxValue);
  }

  private buildPaginatedResult<T>(
    items: T[],
    totalCount: string | undefined,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const totalItems = Number(totalCount ?? 0);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
