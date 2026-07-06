export interface CreateAuditLogInput {
  organizationId: string | null;
  userId: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number | null;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  requestBody: Record<string, unknown>;
  errorMessage: string | null;
}
