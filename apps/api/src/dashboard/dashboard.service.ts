import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';

export interface DashboardSummary {
  investigations: {
    total: number;
    open: number;
    underInvestigation: number;
    closed: number;
  };

  evidence: {
    total: number;
    registered: number;
    inStorage: number;
    inExamination: number;
    transferred: number;
    integrityWarning: number;
    archived: number;
  };

  files: {
    total: number;
    totalSizeBytes: number;
  };

  custody: {
    totalEvents: number;
    pendingTransfers: number;
  };

  audit: {
    totalLogs: number;
    failedActions: number;
  };
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface RecentCustodyEvent {
  id: string;
  evidenceId: string;
  evidenceCode: string;
  investigationId: string;
  eventType: string;
  performedByName: string | null;
  reason: string;
  sequenceNumber: number;
  eventTime: Date;
}

export interface IntegrityWarning {
  evidenceId: string;
  evidenceCode: string;
  title: string;
  investigationId: string;
  currentCustodianName: string | null;
  status: string;
  createdAt: Date;
}

interface DashboardSummaryRow extends QueryResultRow {
  totalInvestigations: string;
  openInvestigations: string;
  underInvestigationInvestigations: string;
  closedInvestigations: string;

  totalEvidence: string;
  registeredEvidence: string;
  inStorageEvidence: string;
  inExaminationEvidence: string;
  transferredEvidence: string;
  integrityWarningEvidence: string;
  archivedEvidence: string;

  totalFiles: string;
  totalFileSizeBytes: string;

  totalCustodyEvents: string;
  pendingTransfers: string;

  totalAuditLogs: string;
  failedAuditActions: string;
}

interface StatusCountRow extends QueryResultRow {
  status: string;
  count: string;
}

interface RecentCustodyEventRow extends QueryResultRow {
  id: string;
  evidenceId: string;
  evidenceCode: string;
  investigationId: string;
  eventType: string;
  performedByName: string | null;
  reason: string;
  sequenceNumber: number;
  eventTime: Date;
}

interface IntegrityWarningRow extends QueryResultRow {
  evidenceId: string;
  evidenceCode: string;
  title: string;
  investigationId: string;
  currentCustodianName: string | null;
  status: string;
  createdAt: Date;
}

@Injectable()
export class DashboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getSummary(organizationId: string): Promise<DashboardSummary> {
    const result = await this.databaseService.query<DashboardSummaryRow>(
      `
            SELECT
              (
                SELECT COUNT(*)
                FROM investigations
                WHERE organization_id = $1
              ) AS "totalInvestigations",

              (
                SELECT COUNT(*)
                FROM investigations
                WHERE organization_id = $1
                  AND status = 'OPEN'
              ) AS "openInvestigations",

              (
                SELECT COUNT(*)
                FROM investigations
                WHERE organization_id = $1
                  AND status = 'UNDER_INVESTIGATION'
              ) AS "underInvestigationInvestigations",

              (
                SELECT COUNT(*)
                FROM investigations
                WHERE organization_id = $1
                  AND status = 'CLOSED'
              ) AS "closedInvestigations",

              (
                SELECT COUNT(*)
                FROM evidence_items
                WHERE organization_id = $1
              ) AS "totalEvidence",

              (
                SELECT COUNT(*)
                FROM evidence_items
                WHERE organization_id = $1
                  AND status = 'REGISTERED'
              ) AS "registeredEvidence",

              (
                SELECT COUNT(*)
                FROM evidence_items
                WHERE organization_id = $1
                  AND status = 'IN_STORAGE'
              ) AS "inStorageEvidence",

              (
                SELECT COUNT(*)
                FROM evidence_items
                WHERE organization_id = $1
                  AND status = 'IN_EXAMINATION'
              ) AS "inExaminationEvidence",

              (
                SELECT COUNT(*)
                FROM evidence_items
                WHERE organization_id = $1
                  AND status = 'TRANSFERRED'
              ) AS "transferredEvidence",

              (
                SELECT COUNT(*)
                FROM evidence_items
                WHERE organization_id = $1
                  AND status = 'INTEGRITY_WARNING'
              ) AS "integrityWarningEvidence",

              (
                SELECT COUNT(*)
                FROM evidence_items
                WHERE organization_id = $1
                  AND status = 'ARCHIVED'
              ) AS "archivedEvidence",

              (
                SELECT COUNT(*)
                FROM evidence_files
                WHERE organization_id = $1
              ) AS "totalFiles",

              (
                SELECT COALESCE(
                  SUM(
                    COALESCE(
                      size_bytes,
                      file_size_bytes,
                      0
                    )
                  ),
                  0
                )
                FROM evidence_files
                WHERE organization_id = $1
              ) AS "totalFileSizeBytes",

              (
                SELECT COUNT(*)
                FROM custody_events
                WHERE organization_id = $1
              ) AS "totalCustodyEvents",

              (
                SELECT COUNT(*)
                FROM custody_transfer_requests
                WHERE organization_id = $1
                  AND status = 'PENDING'
              ) AS "pendingTransfers",

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
              ) AS "failedAuditActions"
          `,
      [organizationId],
    );

    const row = result.rows[0];

    return {
      investigations: {
        total: Number(row?.totalInvestigations ?? 0),
        open: Number(row?.openInvestigations ?? 0),
        underInvestigation: Number(row?.underInvestigationInvestigations ?? 0),
        closed: Number(row?.closedInvestigations ?? 0),
      },

      evidence: {
        total: Number(row?.totalEvidence ?? 0),
        registered: Number(row?.registeredEvidence ?? 0),
        inStorage: Number(row?.inStorageEvidence ?? 0),
        inExamination: Number(row?.inExaminationEvidence ?? 0),
        transferred: Number(row?.transferredEvidence ?? 0),
        integrityWarning: Number(row?.integrityWarningEvidence ?? 0),
        archived: Number(row?.archivedEvidence ?? 0),
      },

      files: {
        total: Number(row?.totalFiles ?? 0),
        totalSizeBytes: Number(row?.totalFileSizeBytes ?? 0),
      },

      custody: {
        totalEvents: Number(row?.totalCustodyEvents ?? 0),
        pendingTransfers: Number(row?.pendingTransfers ?? 0),
      },

      audit: {
        totalLogs: Number(row?.totalAuditLogs ?? 0),
        failedActions: Number(row?.failedAuditActions ?? 0),
      },
    };
  }

  async getEvidenceStatusCounts(
    organizationId: string,
  ): Promise<StatusCount[]> {
    const result = await this.databaseService.query<StatusCountRow>(
      `
            SELECT
              status::TEXT AS status,
              COUNT(*) AS count
            FROM evidence_items
            WHERE organization_id = $1
            GROUP BY status
            ORDER BY status ASC
          `,
      [organizationId],
    );

    return result.rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));
  }

  async getInvestigationStatusCounts(
    organizationId: string,
  ): Promise<StatusCount[]> {
    const result = await this.databaseService.query<StatusCountRow>(
      `
            SELECT
              status::TEXT AS status,
              COUNT(*) AS count
            FROM investigations
            WHERE organization_id = $1
            GROUP BY status
            ORDER BY status ASC
          `,
      [organizationId],
    );

    return result.rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));
  }

  async getRecentCustodyEvents(
    organizationId: string,
    limit = 10,
  ): Promise<RecentCustodyEvent[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const result = await this.databaseService.query<RecentCustodyEventRow>(
      `
            SELECT
              event.id,

              event.evidence_id
                AS "evidenceId",

              evidence.evidence_code
                AS "evidenceCode",

              evidence.investigation_id
                AS "investigationId",

              event.event_type
                AS "eventType",

              users.full_name
                AS "performedByName",

              event.reason,

              event.sequence_number::INTEGER
                AS "sequenceNumber",

              event.event_time
                AS "eventTime"

            FROM custody_events event

            INNER JOIN evidence_items evidence
              ON evidence.id =
                event.evidence_id

            LEFT JOIN users
              ON users.id =
                event.performed_by

            WHERE event.organization_id = $1

            ORDER BY
              event.event_time DESC,
              event.sequence_number DESC

            LIMIT $2
          `,
      [organizationId, safeLimit],
    );

    return result.rows;
  }

  async getIntegrityWarnings(
    organizationId: string,
  ): Promise<IntegrityWarning[]> {
    const result = await this.databaseService.query<IntegrityWarningRow>(
      `
            SELECT
              evidence.id
                AS "evidenceId",

              evidence.evidence_code
                AS "evidenceCode",

              evidence.title,

              evidence.investigation_id
                AS "investigationId",

              users.full_name
                AS "currentCustodianName",

              evidence.status::TEXT
                AS status,

              evidence.created_at
                AS "createdAt"

            FROM evidence_items evidence

            LEFT JOIN users
              ON users.id =
                evidence.current_custodian_id

            WHERE evidence.organization_id = $1
              AND evidence.status = 'INTEGRITY_WARNING'

            ORDER BY
              evidence.created_at DESC
          `,
      [organizationId],
    );

    return result.rows;
  }
}
