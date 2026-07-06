import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';

export interface ReportSummary {
  totalInvestigations: number;
  totalEvidence: number;
  totalFiles: number;
  totalCustodyEvents: number;
  totalTransferRequests: number;
  totalAuditLogs: number;
  failedAuditActions: number;
  integrityWarnings: number;
}

interface ReportSummaryRow extends QueryResultRow {
  totalInvestigations: string;
  totalEvidence: string;
  totalFiles: string;
  totalCustodyEvents: string;
  totalTransferRequests: string;
  totalAuditLogs: string;
  failedAuditActions: string;
  integrityWarnings: string;
}

interface EvidenceReportRow extends QueryResultRow {
  evidenceCode: string;
  title: string;
  evidenceType: string;
  status: string;
  investigationTitle: string | null;
  currentCustodianName: string | null;
  createdAt: Date;
}

interface InvestigationReportRow extends QueryResultRow {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
}

interface CustodyEventReportRow extends QueryResultRow {
  evidenceCode: string;
  eventType: string;
  performedByName: string | null;
  fromCustodianName: string | null;
  toCustodianName: string | null;
  reason: string;
  sequenceNumber: number;
  eventTime: Date;
}

interface AuditLogReportRow extends QueryResultRow {
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

@Injectable()
export class ReportsService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  async getSummary(
    organizationId: string,
  ): Promise<ReportSummary> {
    const result =
      await this.databaseService.query<ReportSummaryRow>(
        `
          SELECT
            (
              SELECT COUNT(*)
              FROM investigations
              WHERE organization_id = $1
            ) AS "totalInvestigations",

            (
              SELECT COUNT(*)
              FROM evidence_items
              WHERE organization_id = $1
            ) AS "totalEvidence",

            (
              SELECT COUNT(*)
              FROM evidence_files
              WHERE organization_id = $1
            ) AS "totalFiles",

            (
              SELECT COUNT(*)
              FROM custody_events
              WHERE organization_id = $1
            ) AS "totalCustodyEvents",

            (
              SELECT COUNT(*)
              FROM custody_transfer_requests
              WHERE organization_id = $1
            ) AS "totalTransferRequests",

            (
              SELECT COUNT(*)
              FROM audit_logs
              WHERE organization_id = $1
            ) AS "totalAuditLogs",

            (
              SELECT COUNT(*)
              FROM audit_logs
              WHERE organization_id = $1
                AND success = FALSE
            ) AS "failedAuditActions",

            (
              SELECT COUNT(*)
              FROM evidence_items
              WHERE organization_id = $1
                AND status = 'INTEGRITY_WARNING'
            ) AS "integrityWarnings"
        `,
        [organizationId],
      );

    const row = result.rows[0];

    return {
      totalInvestigations:
        Number(row?.totalInvestigations ?? 0),
      totalEvidence:
        Number(row?.totalEvidence ?? 0),
      totalFiles:
        Number(row?.totalFiles ?? 0),
      totalCustodyEvents:
        Number(row?.totalCustodyEvents ?? 0),
      totalTransferRequests:
        Number(row?.totalTransferRequests ?? 0),
      totalAuditLogs:
        Number(row?.totalAuditLogs ?? 0),
      failedAuditActions:
        Number(row?.failedAuditActions ?? 0),
      integrityWarnings:
        Number(row?.integrityWarnings ?? 0),
    };
  }

  async getEvidenceCsv(
    organizationId: string,
  ): Promise<string> {
    const result =
      await this.databaseService.query<EvidenceReportRow>(
        `
          SELECT
            evidence.evidence_code
              AS "evidenceCode",

            evidence.title,

            evidence.evidence_type
              AS "evidenceType",

            evidence.status::TEXT
              AS status,

            investigation.title
              AS "investigationTitle",

            custodian.full_name
              AS "currentCustodianName",

            evidence.created_at
              AS "createdAt"

          FROM evidence_items evidence

          LEFT JOIN investigations investigation
            ON investigation.id =
              evidence.investigation_id

          LEFT JOIN users custodian
            ON custodian.id =
              evidence.current_custodian_id

          WHERE evidence.organization_id = $1

          ORDER BY
            evidence.created_at DESC
        `,
        [organizationId],
      );

    return this.toCsv(
      [
        'Evidence Code',
        'Title',
        'Evidence Type',
        'Status',
        'Investigation',
        'Current Custodian',
        'Created At',
      ],
      result.rows.map((row) => [
        row.evidenceCode,
        row.title,
        row.evidenceType,
        row.status,
        row.investigationTitle ?? '',
        row.currentCustodianName ?? '',
        this.formatDate(row.createdAt),
      ]),
    );
  }

  async getInvestigationsCsv(
    organizationId: string,
  ): Promise<string> {
    const result =
      await this.databaseService.query<InvestigationReportRow>(
        `
          SELECT
            investigation.id,

            investigation.title,

            investigation.status::TEXT
              AS status,

            investigation.created_at
              AS "createdAt"

          FROM investigations investigation

          WHERE investigation.organization_id = $1

          ORDER BY
            investigation.created_at DESC
        `,
        [organizationId],
      );

    return this.toCsv(
      [
        'Investigation ID',
        'Title',
        'Status',
        'Created At',
      ],
      result.rows.map((row) => [
        row.id,
        row.title,
        row.status,
        this.formatDate(row.createdAt),
      ]),
    );
  }

  async getCustodyEventsCsv(
    organizationId: string,
  ): Promise<string> {
    const result =
      await this.databaseService.query<CustodyEventReportRow>(
        `
          SELECT
            evidence.evidence_code
              AS "evidenceCode",

            event.event_type::TEXT
              AS "eventType",

            performer.full_name
              AS "performedByName",

            from_user.full_name
              AS "fromCustodianName",

            to_user.full_name
              AS "toCustodianName",

            event.reason,

            event.sequence_number::INTEGER
              AS "sequenceNumber",

            event.event_time
              AS "eventTime"

          FROM custody_events event

          LEFT JOIN evidence_items evidence
            ON evidence.id =
              event.evidence_id

          LEFT JOIN users performer
            ON performer.id =
              event.performed_by

          LEFT JOIN users from_user
            ON from_user.id =
              event.from_custodian_id

          LEFT JOIN users to_user
            ON to_user.id =
              event.to_custodian_id

          WHERE event.organization_id = $1

          ORDER BY
            event.event_time DESC,
            event.sequence_number DESC
        `,
        [organizationId],
      );

    return this.toCsv(
      [
        'Evidence Code',
        'Event Type',
        'Performed By',
        'From Custodian',
        'To Custodian',
        'Reason',
        'Sequence Number',
        'Event Time',
      ],
      result.rows.map((row) => [
        row.evidenceCode,
        row.eventType,
        row.performedByName ?? '',
        row.fromCustodianName ?? '',
        row.toCustodianName ?? '',
        row.reason,
        String(row.sequenceNumber),
        this.formatDate(row.eventTime),
      ]),
    );
  }

  async getAuditLogsCsv(
    organizationId: string,
  ): Promise<string> {
    const result =
      await this.databaseService.query<AuditLogReportRow>(
        `
          SELECT
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
              AS "createdAt"

          FROM audit_logs audit

          LEFT JOIN users
            ON users.id =
              audit.user_id

          WHERE audit.organization_id = $1

          ORDER BY
            audit.created_at DESC
        `,
        [organizationId],
      );

    return this.toCsv(
      [
        'User Name',
        'User Email',
        'Action',
        'Method',
        'Path',
        'Status Code',
        'Success',
        'IP Address',
        'Created At',
      ],
      result.rows.map((row) => [
        row.userName ?? '',
        row.userEmail ?? '',
        row.action,
        row.method,
        row.path,
        row.statusCode === null
          ? ''
          : String(row.statusCode),
        row.success ? 'TRUE' : 'FALSE',
        row.ipAddress ?? '',
        this.formatDate(row.createdAt),
      ]),
    );
  }

  private toCsv(
    headers: string[],
    rows: string[][],
  ): string {
    const headerLine =
      headers.map((value) =>
        this.escapeCsv(value),
      );

    const dataLines =
      rows.map((row) =>
        row
          .map((value) =>
            this.escapeCsv(value),
          )
          .join(','),
      );

    return [
      headerLine.join(','),
      ...dataLines,
    ].join('\n');
  }

  private escapeCsv(
    value: string,
  ): string {
    const safeValue =
      value ?? '';

    const mustQuote =
      safeValue.includes(',') ||
      safeValue.includes('"') ||
      safeValue.includes('\n') ||
      safeValue.includes('\r');

    const escaped =
      safeValue.replace(/"/g, '""');

    return mustQuote
      ? `"${escaped}"`
      : escaped;
  }

  private formatDate(
    value: Date,
  ): string {
    return new Date(value).toISOString();
  }
}