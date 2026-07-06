import type { QueryResultRow } from 'pg';

export interface AuditLogRow extends QueryResultRow {
  id: string;
  organizationId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number | null;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  requestBody: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: Date;
}
