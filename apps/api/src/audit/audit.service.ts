import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CreateAuditLogInput } from './interfaces/create-audit-log-input.interface';
import type { AuditLogRow } from './interfaces/audit-log-row.interface';

@Injectable()
export class AuditService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(input: CreateAuditLogInput): Promise<void> {
    await this.databaseService.query(
      `
        INSERT INTO audit_logs (
          organization_id,
          user_id,
          action,
          method,
          path,
          status_code,
          success,
          ip_address,
          user_agent,
          request_body,
          error_message
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::jsonb,
          $11
        )
      `,
      [
        input.organizationId,
        input.userId,
        input.action,
        input.method,
        input.path,
        input.statusCode,
        input.success,
        input.ipAddress,
        input.userAgent,
        JSON.stringify(input.requestBody),
        input.errorMessage,
      ],
    );
  }

  async findAll(organizationId: string, limit = 50): Promise<AuditLogRow[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const result = await this.databaseService.query<AuditLogRow>(
      `
            SELECT
              audit.id,

              audit.organization_id
                AS "organizationId",

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

              audit.user_agent
                AS "userAgent",

              audit.request_body
                AS "requestBody",

              audit.error_message
                AS "errorMessage",

              audit.created_at
                AS "createdAt"

            FROM audit_logs audit

            LEFT JOIN users
              ON users.id = audit.user_id

            WHERE audit.organization_id = $1

            ORDER BY
              audit.created_at DESC

            LIMIT $2
          `,
      [organizationId, safeLimit],
    );

    return result.rows;
  }

  async findByUser(
    organizationId: string,
    userId: string,
    limit = 50,
  ): Promise<AuditLogRow[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const result = await this.databaseService.query<AuditLogRow>(
      `
            SELECT
              audit.id,

              audit.organization_id
                AS "organizationId",

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

              audit.user_agent
                AS "userAgent",

              audit.request_body
                AS "requestBody",

              audit.error_message
                AS "errorMessage",

              audit.created_at
                AS "createdAt"

            FROM audit_logs audit

            LEFT JOIN users
              ON users.id = audit.user_id

            WHERE audit.organization_id = $1
              AND audit.user_id = $2

            ORDER BY
              audit.created_at DESC

            LIMIT $3
          `,
      [organizationId, userId, safeLimit],
    );

    return result.rows;
  }
}
