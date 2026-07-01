import {
  ConflictException,
  Injectable,
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
}

function isPostgreSqlError(error: unknown): error is PostgreSqlError {
  return typeof error === 'object' && error !== null;
}

@Injectable()
export class InvestigationsService {
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
  }

  async findOne(
    organizationId: string,
    investigationId: string,
  ): Promise<InvestigationRow> {
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
  }

  async update(
    organizationId: string,
    investigationId: string,
    dto: UpdateInvestigationDto,
  ): Promise<InvestigationRow> {
    const title = dto.title?.trim() ?? null;

    const description = dto.description?.trim() ?? null;

    const result = await this.databaseService.query<IdRow>(
      `
          UPDATE investigations
          SET
            title = COALESCE($3, title),
            description = COALESCE($4, description)
          WHERE id = $1
            AND organization_id = $2
          RETURNING id
        `,
      [investigationId, organizationId, title, description],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Investigation not found');
    }

    return this.findOne(organizationId, investigationId);
  }

  async updateStatus(
    organizationId: string,
    investigationId: string,
    status: InvestigationStatus,
  ): Promise<InvestigationRow> {
    const result = await this.databaseService.query<IdRow>(
      `
          UPDATE investigations
          SET
            status = $3::investigation_status,
            closed_at = CASE
              WHEN $3 = 'CLOSED'
                THEN COALESCE(closed_at, NOW())
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
  }
}
