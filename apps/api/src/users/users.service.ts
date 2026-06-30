import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateUserDto } from './dto/create-user.dto';

export interface UserRow {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

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
          dto.fullName.trim(),
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
}
