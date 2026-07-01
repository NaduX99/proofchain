import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { AuthUserRow } from './interfaces/auth-user-row.interface';
import type { UserRow } from './interfaces/user-row.interface';
interface PostgreSqlError {
  code?: string;
}

function isPostgreSqlError(error: unknown): error is PostgreSqlError {
  return typeof error === 'object' && error !== null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserRow> {
    const organizationExists = await this.organizationsService.exists(
      dto.organizationId,
    );

    if (!organizationExists) {
      throw new NotFoundException('Organization not found');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    const normalizedFullName = dto.fullName.trim();

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const result = await this.databaseService.query<UserRow>(
        `
            INSERT INTO users (
              organization_id,
              email,
              password_hash,
              full_name,
              role
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING
              id,
              organization_id AS "organizationId",
              email,
              full_name AS "fullName",
              role,
              is_active AS "isActive",
              created_at AS "createdAt"
          `,
        [
          dto.organizationId,
          normalizedEmail,
          passwordHash,
          normalizedFullName,
          dto.role,
        ],
      );

      return result.rows[0];
    } catch (error: unknown) {
      if (isPostgreSqlError(error) && error.code === '23505') {
        throw new ConflictException(
          'A user with this email already exists in the organization',
        );
      }

      throw error;
    }
  }

  async findAll(organizationId?: string): Promise<UserRow[]> {
    if (organizationId) {
      const result = await this.databaseService.query<UserRow>(
        `
            SELECT
              id,
              organization_id AS "organizationId",
              email,
              full_name AS "fullName",
              role,
              is_active AS "isActive",
              created_at AS "createdAt"
            FROM users
            WHERE organization_id = $1
            ORDER BY created_at DESC
          `,
        [organizationId],
      );

      return result.rows;
    }

    const result = await this.databaseService.query<UserRow>(
      `
          SELECT
            id,
            organization_id AS "organizationId",
            email,
            full_name AS "fullName",
            role,
            is_active AS "isActive",
            created_at AS "createdAt"
          FROM users
          ORDER BY created_at DESC
        `,
    );

    return result.rows;
  }

  async findOne(id: string): Promise<UserRow> {
    const result = await this.databaseService.query<UserRow>(
      `
          SELECT
            id,
            organization_id AS "organizationId",
            email,
            full_name AS "fullName",
            role,
            is_active AS "isActive",
            created_at AS "createdAt"
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
      [id],
    );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateStatus(id: string, isActive: boolean): Promise<UserRow> {
    const result = await this.databaseService.query<UserRow>(
      `
          UPDATE users
          SET is_active = $2
          WHERE id = $1
          RETURNING
            id,
            organization_id AS "organizationId",
            email,
            full_name AS "fullName",
            role,
            is_active AS "isActive",
            created_at AS "createdAt"
        `,
      [id, isActive],
    );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findForAuthentication(
    organizationSlug: string,
    email: string,
  ): Promise<AuthUserRow | null> {
    const normalizedOrganizationSlug = organizationSlug.trim().toLowerCase();

    const normalizedEmail = email.trim().toLowerCase();

    const result = await this.databaseService.query<AuthUserRow>(
      `
          SELECT
            u.id,
            u.organization_id AS "organizationId",
            o.slug AS "organizationSlug",
            u.email,
            u.full_name AS "fullName",
            u.role,
            u.is_active AS "isActive",
            u.password_hash AS "passwordHash",
            u.refresh_token_hash AS "refreshTokenHash",
            u.created_at AS "createdAt"
          FROM users u
          INNER JOIN organizations o
            ON o.id = u.organization_id
          WHERE o.slug = $1
            AND u.email = $2
          LIMIT 1
        `,
      [normalizedOrganizationSlug, normalizedEmail],
    );

    return result.rows[0] ?? null;
  }

  async findForRefresh(userId: string): Promise<AuthUserRow | null> {
    const result = await this.databaseService.query<AuthUserRow>(
      `
          SELECT
            u.id,
            u.organization_id AS "organizationId",
            o.slug AS "organizationSlug",
            u.email,
            u.full_name AS "fullName",
            u.role,
            u.is_active AS "isActive",
            u.password_hash AS "passwordHash",
            u.refresh_token_hash AS "refreshTokenHash",
            u.created_at AS "createdAt"
          FROM users u
          INNER JOIN organizations o
            ON o.id = u.organization_id
          WHERE u.id = $1
          LIMIT 1
        `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string,
  ): Promise<void> {
    await this.databaseService.query(
      `
        UPDATE users
        SET
          refresh_token_hash = $2,
          last_login_at = NOW()
        WHERE id = $1
      `,
      [userId, refreshTokenHash],
    );
  }

  async clearRefreshTokenHash(userId: string): Promise<void> {
    await this.databaseService.query(
      `
        UPDATE users
        SET refresh_token_hash = NULL
        WHERE id = $1
      `,
      [userId],
    );
  }
}
