import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { InvestigationsService } from '../investigations/investigations.service';
import { StorageService } from '../storage/storage.service';
import type { CreateEvidenceDto } from './dto/create-evidence.dto';
import type { EvidenceFileRow } from './interfaces/evidence-file-row.interface';
import type { EvidenceItemRow } from './interfaces/evidence-item-row.interface';
import type { IntegrityResult } from './interfaces/integrity-result.interface';

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
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    private readonly databaseService: DatabaseService,

    private readonly investigationsService: InvestigationsService,

    private readonly storageService: StorageService,
  ) {}

  async create(
    organizationId: string,
    investigationId: string,
    collectedBy: string,
    dto: CreateEvidenceDto,
  ): Promise<EvidenceItemRow> {
    await this.investigationsService.findOne(organizationId, investigationId);

    const evidenceCode = dto.evidenceCode.trim().toUpperCase();

    const title = dto.title.trim();

    const description = dto.description?.trim() || null;

    const collectedAt = dto.collectedAt ?? new Date().toISOString();

    try {
      const result = await this.databaseService.query<IdRow>(
        `
            INSERT INTO evidence_items (
              organization_id,
              investigation_id,
              evidence_code,
              title,
              description,
              evidence_type,
              collected_at,
              collected_by,
              current_custodian_id
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
              $8
            )
            RETURNING id
          `,
        [
          organizationId,
          investigationId,
          evidenceCode,
          title,
          description,
          dto.evidenceType,
          collectedAt,
          collectedBy,
        ],
      );

      const evidenceId = result.rows[0]?.id;

      if (!evidenceId) {
        throw new Error('Evidence could not be created');
      }

      return this.findOne(organizationId, evidenceId);
    } catch (error: unknown) {
      this.logDatabaseError('Failed to register evidence', error);

      if (isPostgreSqlError(error) && error.code === '23505') {
        throw new ConflictException('Evidence with this code already exists');
      }

      throw error;
    }
  }

  async findAllByInvestigation(
    organizationId: string,
    investigationId: string,
  ): Promise<EvidenceItemRow[]> {
    await this.investigationsService.findOne(organizationId, investigationId);

    try {
      const result = await this.databaseService.query<EvidenceItemRow>(
        `
            SELECT
              e.id,
              e.organization_id
                AS "organizationId",
              e.investigation_id
                AS "investigationId",
              e.evidence_code
                AS "evidenceCode",
              e.title,
              e.description,
              e.evidence_type
                AS "evidenceType",
              e.collected_at
                AS "collectedAt",
              e.collected_by
                AS "collectedBy",
              u.full_name
                AS "collectedByName",
              e.created_at
                AS "createdAt"
            FROM evidence_items e
            LEFT JOIN users u
              ON u.id = e.collected_by
            WHERE e.organization_id = $1
              AND e.investigation_id = $2
            ORDER BY e.created_at DESC
          `,
        [organizationId, investigationId],
      );

      return result.rows;
    } catch (error: unknown) {
      this.logDatabaseError('Failed to retrieve investigation evidence', error);

      throw error;
    }
  }

  async findOne(
    organizationId: string,
    evidenceId: string,
  ): Promise<EvidenceItemRow> {
    try {
      const result = await this.databaseService.query<EvidenceItemRow>(
        `
            SELECT
              e.id,
              e.organization_id
                AS "organizationId",
              e.investigation_id
                AS "investigationId",
              e.evidence_code
                AS "evidenceCode",
              e.title,
              e.description,
              e.evidence_type
                AS "evidenceType",
              e.collected_at
                AS "collectedAt",
              e.collected_by
                AS "collectedBy",
              u.full_name
                AS "collectedByName",
              e.created_at
                AS "createdAt"
            FROM evidence_items e
            LEFT JOIN users u
              ON u.id = e.collected_by
            WHERE e.id = $1
              AND e.organization_id = $2
            LIMIT 1
          `,
        [evidenceId, organizationId],
      );

      const evidence = result.rows[0];

      if (!evidence) {
        throw new NotFoundException('Evidence not found');
      }

      return evidence;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logDatabaseError('Failed to retrieve evidence', error);

      throw error;
    }
  }

  async uploadFile(
    organizationId: string,
    evidenceId: string,
    uploadedBy: string,
    file: Express.Multer.File,
  ): Promise<EvidenceFileRow> {
    const evidence = await this.findOne(organizationId, evidenceId);

    const sha256Hash = createHash('sha256').update(file.buffer).digest('hex');

    try {
      const duplicateResult = await this.databaseService.query<IdRow>(
        `
            SELECT id
            FROM evidence_files
            WHERE COALESCE(
              evidence_item_id,
              evidence_id
            ) = $1
              AND sha256_hash = $2
            LIMIT 1
          `,
        [evidenceId, sha256Hash],
      );

      if (duplicateResult.rows[0]) {
        throw new ConflictException(
          'The same file has already been uploaded for this evidence item',
        );
      }
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logDatabaseError('Failed to check duplicate evidence file', error);

      throw error;
    }

    const safeFilename = this.createSafeFilename(file.originalname);

    const objectName = [
      organizationId,
      evidence.investigationId,
      evidenceId,
      `${randomUUID()}-${safeFilename}`,
    ].join('/');

    const bucketName = this.storageService.getBucketName();

    try {
      await this.storageService.uploadBuffer(
        objectName,
        file.buffer,
        file.mimetype || 'application/octet-stream',
        {
          'X-Amz-Meta-Sha256': sha256Hash,
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to upload evidence file to MinIO: ${message}`);

      throw error;
    }

    try {
      const result = await this.databaseService.query<IdRow>(
        `
            INSERT INTO evidence_files (
              organization_id,

              evidence_id,
              evidence_item_id,

              original_filename,

              storage_bucket,
              storage_key,

              bucket_name,
              object_name,

              mime_type,

              file_size_bytes,
              size_bytes,

              sha256_hash,
              uploaded_by
            )
            VALUES (
              $1,

              $2,
              $2,

              $3,

              $4,
              $5,

              $4,
              $5,

              $6,

              $7,
              $7,

              $8,
              $9
            )
            RETURNING id
          `,
        [
          organizationId,
          evidenceId,
          file.originalname,
          bucketName,
          objectName,
          file.mimetype || 'application/octet-stream',
          file.size,
          sha256Hash,
          uploadedBy,
        ],
      );

      const fileId = result.rows[0]?.id;

      if (!fileId) {
        throw new Error('Evidence file information could not be saved');
      }

      return this.findFile(organizationId, evidenceId, fileId);
    } catch (error: unknown) {
      await this.storageService
        .removeObject(objectName)
        .catch((removeError: unknown) => {
          const message =
            removeError instanceof Error
              ? removeError.message
              : String(removeError);

          this.logger.error(
            `Failed to remove orphaned MinIO object: ${message}`,
          );
        });

      this.logDatabaseError('Failed to save evidence file', error);

      if (isPostgreSqlError(error) && error.code === '23505') {
        throw new ConflictException('The same file has already been uploaded');
      }

      throw error;
    }
  }

  async findFiles(
    organizationId: string,
    evidenceId: string,
  ): Promise<EvidenceFileRow[]> {
    await this.findOne(organizationId, evidenceId);

    try {
      const result = await this.databaseService.query<EvidenceFileRow>(
        `
            SELECT
              f.id,
              f.organization_id
                AS "organizationId",

              COALESCE(
                f.evidence_item_id,
                f.evidence_id
              ) AS "evidenceItemId",

              f.original_filename
                AS "originalFilename",

              COALESCE(
                f.object_name,
                f.storage_key
              ) AS "objectName",

              COALESCE(
                f.bucket_name,
                f.storage_bucket
              ) AS "bucketName",

              f.mime_type
                AS "mimeType",

              COALESCE(
                f.size_bytes,
                f.file_size_bytes
              )::INTEGER AS "sizeBytes",

              f.sha256_hash
                AS "sha256Hash",

              f.uploaded_by
                AS "uploadedBy",

              u.full_name
                AS "uploadedByName",

              f.created_at
                AS "createdAt"
            FROM evidence_files f
            LEFT JOIN users u
              ON u.id = f.uploaded_by
            WHERE f.organization_id = $1
              AND COALESCE(
                f.evidence_item_id,
                f.evidence_id
              ) = $2
            ORDER BY f.created_at DESC
          `,
        [organizationId, evidenceId],
      );

      return result.rows;
    } catch (error: unknown) {
      this.logDatabaseError('Failed to retrieve evidence files', error);

      throw error;
    }
  }

  async findFile(
    organizationId: string,
    evidenceId: string,
    fileId: string,
  ): Promise<EvidenceFileRow> {
    try {
      const result = await this.databaseService.query<EvidenceFileRow>(
        `
            SELECT
              f.id,
              f.organization_id
                AS "organizationId",

              COALESCE(
                f.evidence_item_id,
                f.evidence_id
              ) AS "evidenceItemId",

              f.original_filename
                AS "originalFilename",

              COALESCE(
                f.object_name,
                f.storage_key
              ) AS "objectName",

              COALESCE(
                f.bucket_name,
                f.storage_bucket
              ) AS "bucketName",

              f.mime_type
                AS "mimeType",

              COALESCE(
                f.size_bytes,
                f.file_size_bytes
              )::INTEGER AS "sizeBytes",

              f.sha256_hash
                AS "sha256Hash",

              f.uploaded_by
                AS "uploadedBy",

              u.full_name
                AS "uploadedByName",

              f.created_at
                AS "createdAt"
            FROM evidence_files f
            LEFT JOIN users u
              ON u.id = f.uploaded_by
            WHERE f.id = $1
              AND COALESCE(
                f.evidence_item_id,
                f.evidence_id
              ) = $2
              AND f.organization_id = $3
            LIMIT 1
          `,
        [fileId, evidenceId, organizationId],
      );

      const evidenceFile = result.rows[0];

      if (!evidenceFile) {
        throw new NotFoundException('Evidence file not found');
      }

      return evidenceFile;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logDatabaseError('Failed to retrieve evidence file', error);

      throw error;
    }
  }

  async verifyFile(
    organizationId: string,
    evidenceId: string,
    fileId: string,
  ): Promise<IntegrityResult> {
    const evidenceFile = await this.findFile(
      organizationId,
      evidenceId,
      fileId,
    );

    const stream = await this.storageService.getObjectStream(
      evidenceFile.objectName,
    );

    const hash = createHash('sha256');

    for await (const chunk of stream) {
      hash.update(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const calculatedHash = hash.digest('hex');

    return {
      fileId: evidenceFile.id,
      originalFilename: evidenceFile.originalFilename,
      storedHash: evidenceFile.sha256Hash,
      calculatedHash,
      matches: calculatedHash === evidenceFile.sha256Hash,
      checkedAt: new Date().toISOString(),
    };
  }

  private createSafeFilename(originalFilename: string): string {
    const safeFilename = originalFilename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 180);

    return safeFilename || 'evidence-file';
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
