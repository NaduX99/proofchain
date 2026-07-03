import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CreateInvestigationDto } from './dto/create-investigation.dto';
import type { UpdateInvestigationDto } from './dto/update-investigation.dto';
import type { InvestigationStatus } from './enums/investigation-status.enum';
import type { InvestigationRow } from './interfaces/investigation-row.interface';

interface IdRow {
  id: string;
}

interface PostgreSqlError {
  code?: string;
  constraint?: string;
  message?: string;
  detail?: string;
  table?: string;
  column?: string;
}

function isPostgreSqlError(error: unknown): error is PostgreSqlError {
  return typeof error === 'object' && error !== null;
}

@Injectable()
export class InvestigationsService {
  private readonly logger = new Logger(InvestigationsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async create(
    organizationId: string,
    createdBy: string,
    dto: CreateInvestigationDto,
  ): Promise<InvestigationRow> {
    const normalizedCaseCode = dto.caseCode.trim().toUpperCase();

    const normalizedTitle = dto.title.trim();

    const normalizedDescription = dto.description?.trim() || null;

    try {
      const result = await this.databaseService.query<IdRow>(
        `
            INSERT INTO investigations (
              organization_id,
              case_code,
              title,
              description,
              status,
              created_by
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              'OPEN',
              $5
            )
            RETURNING id
          `,
        [
          organizationId,
          normalizedCaseCode,
          normalizedTitle,
          normalizedDescription,
          createdBy,
        ],
      );

      const investigationId = result.rows[0]?.id;

      if (!investigationId) {
        throw new Error('Investigation could not be created');
      }

      return this.findOne(organizationId, investigationId);
    } catch (error: unknown) {
      this.logDatabaseError('Failed to create investigation', error);

      if (isPostgreSqlError(error) && error.code === '23505') {
        throw new ConflictException(
          'An investigation with this case code already exists',
        );
      }

      throw error;
    }
  }

  async findAll(
    organizationId: string,
    status?: InvestigationStatus,
  ): Promise<InvestigationRow[]> {
    try {
      if (status) {
        const result = await this.databaseService.query<InvestigationRow>(
          `
              SELECT
                i.id,
                i.organization_id AS "organizationId",
                i.case_code AS "caseCode",
                i.title,
                i.description,
                i.status,
                i.created_by AS "createdBy",
                u.full_name AS "createdByName",
                i.created_at AS "createdAt",
                i.closed_at AS "closedAt"
              FROM investigations i
              LEFT JOIN users u
                ON u.id = i.created_by
              WHERE i.organization_id = $1
                AND i.status = $2::investigation_status
              ORDER BY i.created_at DESC
            `,
          [organizationId, status],
        );

        return result.rows;
      }

      const result = await this.databaseService.query<InvestigationRow>(
        `
            SELECT
              i.id,
              i.organization_id AS "organizationId",
              i.case_code AS "caseCode",
              i.title,
              i.description,
              i.status,
              i.created_by AS "createdBy",
              u.full_name AS "createdByName",
              i.created_at AS "createdAt",
              i.closed_at AS "closedAt"
            FROM investigations i
            LEFT JOIN users u
              ON u.id = i.created_by
            WHERE i.organization_id = $1
            ORDER BY i.created_at DESC
          `,
        [organizationId],
      );

      return result.rows;
    } catch (error: unknown) {
      this.logDatabaseError('Failed to retrieve investigations', error);

      throw error;
    }
  }

  async findOne(
    organizationId: string,
    investigationId: string,
  ): Promise<InvestigationRow> {
    try {
      const result = await this.databaseService.query<InvestigationRow>(
        `
            SELECT
              i.id,
              i.organization_id AS "organizationId",
              i.case_code AS "caseCode",
              i.title,
              i.description,
              i.status,
              i.created_by AS "createdBy",
              u.full_name AS "createdByName",
              i.created_at AS "createdAt",
              i.closed_at AS "closedAt"
            FROM investigations i
            LEFT JOIN users u
              ON u.id = i.created_by
            WHERE i.id = $1
              AND i.organization_id = $2
            LIMIT 1
          `,
        [investigationId, organizationId],
      );

      const investigation = result.rows[0];

      if (!investigation) {
        throw new NotFoundException('Investigation not found');
      }

      return investigation;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logDatabaseError('Failed to retrieve investigation', error);

      throw error;
    }
  }

  async update(
    organizationId: string,
    investigationId: string,
    dto: UpdateInvestigationDto,
  ): Promise<InvestigationRow> {
    const normalizedTitle = dto.title !== undefined ? dto.title.trim() : null;

    const normalizedDescription =
      dto.description !== undefined ? dto.description.trim() : null;

    try {
      const result = await this.databaseService.query<IdRow>(
        `
            UPDATE investigations
            SET
              title = COALESCE(
                $3,
                title
              ),
              description = COALESCE(
                $4,
                description
              )
            WHERE id = $1
              AND organization_id = $2
            RETURNING id
          `,
        [
          investigationId,
          organizationId,
          normalizedTitle,
          normalizedDescription,
        ],
      );

      if (!result.rows[0]) {
        throw new NotFoundException('Investigation not found');
      }

      return this.findOne(organizationId, investigationId);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logDatabaseError('Failed to update investigation', error);

      throw error;
    }
  }

  async updateStatus(
    organizationId: string,
    investigationId: string,
    status: InvestigationStatus,
  ): Promise<InvestigationRow> {
    try {
      const result = await this.databaseService.query<IdRow>(
        `
            UPDATE investigations
            SET
              status = $3::investigation_status,
              closed_at = CASE
                WHEN $3 = 'CLOSED'
                  THEN COALESCE(
                    closed_at,
                    NOW()
                  )

                WHEN $3 IN (
                  'OPEN',
                  'UNDER_INVESTIGATION'
                )
                  THEN NULL

                ELSE closed_at
              END
            WHERE id = $1
              AND organization_id = $2
            RETURNING id
          `,
        [investigationId, organizationId, status],
      );

      if (!result.rows[0]) {
        throw new NotFoundException('Investigation not found');
      }

      return this.findOne(organizationId, investigationId);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logDatabaseError('Failed to update investigation status', error);

      throw error;
    }
  }

  private logDatabaseError(operation: string, error: unknown): void {
    if (isPostgreSqlError(error)) {
      this.logger.error(
        [
          operation,
          `Code: ${error.code ?? 'unknown'}`,
          `Table: ${error.table ?? 'unknown'}`,
          `Column: ${error.column ?? 'unknown'}`,
          `Constraint: ${error.constraint ?? 'none'}`,
          `Message: ${error.message ?? 'unknown'}`,
          `Detail: ${error.detail ?? 'none'}`,
        ].join(' | '),
      );

      return;
    }

    if (error instanceof Error) {
      this.logger.error(`${operation}: ${error.message}`, error.stack);

      return;
    }

    this.logger.error(`${operation}: ${String(error)}`);
  }
}
