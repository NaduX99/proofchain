import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CreateOrganizationDto } from './dto/create-organization.dto';

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

interface PostgreSqlError {
  code?: string;
}

function isPostgreSqlError(error: unknown): error is PostgreSqlError {
  return typeof error === 'object' && error !== null;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateOrganizationDto): Promise<OrganizationRow> {
    try {
      const result = await this.databaseService.query<OrganizationRow>(
        `
            INSERT INTO organizations (
              name,
              slug
            )
            VALUES ($1, $2)
            RETURNING
              id,
              name,
              slug,
              created_at AS "createdAt"
          `,
        [dto.name.trim(), dto.slug.trim()],
      );

      return result.rows[0];
    } catch (error: unknown) {
      if (isPostgreSqlError(error) && error.code === '23505') {
        throw new ConflictException(
          'An organization with this slug already exists',
        );
      }

      throw error;
    }
  }

  async findAll(): Promise<OrganizationRow[]> {
    const result = await this.databaseService.query<OrganizationRow>(
      `
          SELECT
            id,
            name,
            slug,
            created_at AS "createdAt"
          FROM organizations
          ORDER BY created_at DESC
        `,
    );

    return result.rows;
  }

  async findOne(id: string): Promise<OrganizationRow> {
    const result = await this.databaseService.query<OrganizationRow>(
      `
          SELECT
            id,
            name,
            slug,
            created_at AS "createdAt"
          FROM organizations
          WHERE id = $1
          LIMIT 1
        `,
      [id],
    );

    const organization = result.rows[0];

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.databaseService.query<{
      exists: boolean;
    }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM organizations
          WHERE id = $1
        ) AS "exists"
      `,
      [id],
    );

    return result.rows[0]?.exists ?? false;
  }
}
