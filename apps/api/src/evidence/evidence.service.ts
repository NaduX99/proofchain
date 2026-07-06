import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import type { QueryResultRow } from 'pg';

import { CustodyEventType } from '../custody/enums/custody-event-type.enum';
import { CustodyService } from '../custody/custody.service';
import { DatabaseService } from '../database/database.service';
import { InvestigationsService } from '../investigations/investigations.service';
import { StorageService } from '../storage/storage.service';

import { EvidenceStatus } from './enums/evidence-status.enum';

export interface CreateEvidenceInput {
  evidenceCode: string;
  title: string;
  description?: string;
  evidenceType: string;
  collectedAt?: string;
  collectionLocation?: string;
}

export interface EvidenceItemRow extends QueryResultRow {
  id: string;
  organizationId: string;
  investigationId: string;
  evidenceCode: string;
  title: string;
  description: string | null;
  evidenceType: string;
  collectedAt: Date;
  collectedBy: string | null;
  collectedByName: string | null;
  collectionLocation: string | null;
  currentCustodianId: string | null;
  currentCustodianName: string | null;
  status: EvidenceStatus;
  createdAt: Date;
}

export interface EvidenceFileRow extends QueryResultRow {
  id: string;
  organizationId: string;
  evidenceItemId: string;
  originalFilename: string;
  objectName: string;
  bucketName: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: Date;
}

export interface IntegrityResult {
  fileId: string;
  originalFilename: string;
  storedHash: string;
  calculatedHash: string;
  matches: boolean;
  checkedAt: string;
}

export interface EvidenceDownloadResult {
  file: EvidenceFileRow;
  stream: Readable;
}

interface IdRow extends QueryResultRow {
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

    private readonly custodyService: CustodyService,
  ) {}

  async create(
    organizationId: string,
    investigationId: string,
    collectedBy: string,
    dto: CreateEvidenceInput,
  ): Promise<EvidenceItemRow> {
    await this.investigationsService.findOne(organizationId, investigationId);

    const evidenceCode = dto.evidenceCode.trim().toUpperCase();

    const title = dto.title.trim();

    const description = dto.description?.trim() || null;

    const collectionLocation = dto.collectionLocation?.trim() || null;

    const collectedAt = dto.collectedAt ?? new Date().toISOString();

    let evidenceId: string;

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
              collected_by,
              collected_at,
              collection_location,
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
              $9,
              $7
            )
            RETURNING id
          `,
        [
          organizationId,
          investigationId,
          evidenceCode,
          title,
          description,
          dto.evidenceType.trim().toUpperCase(),
          collectedBy,
          collectedAt,
          collectionLocation,
        ],
      );

      const insertedId = result.rows[0]?.id;

      if (!insertedId) {
        throw new Error('Evidence could not be created');
      }

      evidenceId = insertedId;
    } catch (error: unknown) {
      this.logDatabaseError('Failed to register evidence', error);

      if (isPostgreSqlError(error) && error.code === '23505') {
        throw new ConflictException('Evidence with this code already exists');
      }

      throw error;
    }

    const createdEvidence = await this.findOne(organizationId, evidenceId);

    await this.custodyService.create(organizationId, evidenceId, collectedBy, {
      eventType: CustodyEventType.EVIDENCE_REGISTERED,

      reason: 'Evidence registered in ProofChain.',

      metadata: {
        evidenceCode: createdEvidence.evidenceCode,

        title: createdEvidence.title,

        evidenceType: createdEvidence.evidenceType,

        investigationId: createdEvidence.investigationId,

        collectionLocation: createdEvidence.collectionLocation,
      },
    });

    return createdEvidence;
  }

  async findAllByInvestigation(
    organizationId: string,
    investigationId: string,
  ): Promise<EvidenceItemRow[]> {
    await this.investigationsService.findOne(organizationId, investigationId);

    const result = await this.databaseService.query<EvidenceItemRow>(
      `
            SELECT
              evidence.id,

              evidence.organization_id
                AS "organizationId",

              evidence.investigation_id
                AS "investigationId",

              evidence.evidence_code
                AS "evidenceCode",

              evidence.title,
              evidence.description,

              evidence.evidence_type
                AS "evidenceType",

              evidence.collected_at
                AS "collectedAt",

              evidence.collected_by
                AS "collectedBy",

              collector.full_name
                AS "collectedByName",

              evidence.collection_location
                AS "collectionLocation",

              evidence.current_custodian_id
                AS "currentCustodianId",

              custodian.full_name
                AS "currentCustodianName",

              evidence.status,

              evidence.created_at
                AS "createdAt"

            FROM evidence_items evidence

            LEFT JOIN users collector
              ON collector.id =
                evidence.collected_by

            LEFT JOIN users custodian
              ON custodian.id =
                evidence.current_custodian_id

            WHERE
              evidence.organization_id = $1
              AND evidence.investigation_id = $2

            ORDER BY
              evidence.created_at DESC
          `,
      [organizationId, investigationId],
    );

    return result.rows;
  }

  async findOne(
    organizationId: string,
    evidenceId: string,
  ): Promise<EvidenceItemRow> {
    const result = await this.databaseService.query<EvidenceItemRow>(
      `
            SELECT
              evidence.id,

              evidence.organization_id
                AS "organizationId",

              evidence.investigation_id
                AS "investigationId",

              evidence.evidence_code
                AS "evidenceCode",

              evidence.title,
              evidence.description,

              evidence.evidence_type
                AS "evidenceType",

              evidence.collected_at
                AS "collectedAt",

              evidence.collected_by
                AS "collectedBy",

              collector.full_name
                AS "collectedByName",

              evidence.collection_location
                AS "collectionLocation",

              evidence.current_custodian_id
                AS "currentCustodianId",

              custodian.full_name
                AS "currentCustodianName",

              evidence.status,

              evidence.created_at
                AS "createdAt"

            FROM evidence_items evidence

            LEFT JOIN users collector
              ON collector.id =
                evidence.collected_by

            LEFT JOIN users custodian
              ON custodian.id =
                evidence.current_custodian_id

            WHERE
              evidence.id = $1
              AND evidence.organization_id = $2

            LIMIT 1
          `,
      [evidenceId, organizationId],
    );

    const evidence = result.rows[0];

    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    return evidence;
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

        WHERE
          organization_id = $1

          AND COALESCE(
            evidence_item_id,
            evidence_id
          ) = $2

          AND sha256_hash = $3

        LIMIT 1
      `,
        [organizationId, evidenceId, sha256Hash],
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

    const mimeType = file.mimetype || 'application/octet-stream';

    try {
      await this.storageService.uploadBuffer(
        objectName,
        file.buffer,
        mimeType,
        {
          'X-Amz-Meta-Sha256': sha256Hash,
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to upload evidence file to MinIO: ${message}`);

      throw error;
    }

    let fileId: string;

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
          mimeType,
          file.size,
          sha256Hash,
          uploadedBy,
        ],
      );

      const insertedFileId = result.rows[0]?.id;

      if (!insertedFileId) {
        throw new Error('Evidence file information could not be saved');
      }

      fileId = insertedFileId;
    } catch (error: unknown) {
      await this.removeObjectSafely(objectName);

      this.logDatabaseError('Failed to save evidence file', error);

      if (isPostgreSqlError(error) && error.code === '23505') {
        throw new ConflictException('The same evidence file already exists');
      }

      throw error;
    }

    const uploadedFile = await this.findFile(
      organizationId,
      evidenceId,
      fileId,
    );

    try {
      await this.custodyService.create(organizationId, evidenceId, uploadedBy, {
        eventType: CustodyEventType.FILE_UPLOADED,

        reason: `Evidence file "${uploadedFile.originalFilename}" was uploaded.`,

        metadata: {
          fileId: uploadedFile.id,

          originalFilename: uploadedFile.originalFilename,

          mimeType: uploadedFile.mimeType,

          sizeBytes: uploadedFile.sizeBytes,

          sha256Hash: uploadedFile.sha256Hash,

          bucketName: uploadedFile.bucketName,

          objectName: uploadedFile.objectName,
        },
      });
    } catch (error: unknown) {
      try {
        await this.databaseService.query(
          `
            DELETE FROM evidence_files
            WHERE id = $1
              AND organization_id = $2
          `,
          [fileId, organizationId],
        );
      } catch (cleanupError: unknown) {
        this.logDatabaseError(
          'Failed to remove evidence file record after custody-event failure',
          cleanupError,
        );
      }

      await this.removeObjectSafely(objectName);

      throw error;
    }

    return uploadedFile;
  }

  async findFiles(
    organizationId: string,
    evidenceId: string,
  ): Promise<EvidenceFileRow[]> {
    await this.findOne(organizationId, evidenceId);

    const result = await this.databaseService.query<EvidenceFileRow>(
      `
            SELECT
              file.id,

              file.organization_id
                AS "organizationId",

              COALESCE(
                file.evidence_item_id,
                file.evidence_id
              ) AS "evidenceItemId",

              file.original_filename
                AS "originalFilename",

              COALESCE(
                file.object_name,
                file.storage_key
              ) AS "objectName",

              COALESCE(
                file.bucket_name,
                file.storage_bucket
              ) AS "bucketName",

              file.mime_type
                AS "mimeType",

              COALESCE(
                file.size_bytes,
                file.file_size_bytes
              )::INTEGER
                AS "sizeBytes",

              file.sha256_hash
                AS "sha256Hash",

              file.uploaded_by
                AS "uploadedBy",

              uploader.full_name
                AS "uploadedByName",

              file.created_at
                AS "createdAt"

            FROM evidence_files file

            LEFT JOIN users uploader
              ON uploader.id =
                file.uploaded_by

            WHERE
              file.organization_id = $1

              AND COALESCE(
                file.evidence_item_id,
                file.evidence_id
              ) = $2

            ORDER BY
              file.created_at DESC
          `,
      [organizationId, evidenceId],
    );

    return result.rows;
  }

  async findFile(
    organizationId: string,
    evidenceId: string,
    fileId: string,
  ): Promise<EvidenceFileRow> {
    const result = await this.databaseService.query<EvidenceFileRow>(
      `
            SELECT
              file.id,

              file.organization_id
                AS "organizationId",

              COALESCE(
                file.evidence_item_id,
                file.evidence_id
              ) AS "evidenceItemId",

              file.original_filename
                AS "originalFilename",

              COALESCE(
                file.object_name,
                file.storage_key
              ) AS "objectName",

              COALESCE(
                file.bucket_name,
                file.storage_bucket
              ) AS "bucketName",

              file.mime_type
                AS "mimeType",

              COALESCE(
                file.size_bytes,
                file.file_size_bytes
              )::INTEGER
                AS "sizeBytes",

              file.sha256_hash
                AS "sha256Hash",

              file.uploaded_by
                AS "uploadedBy",

              uploader.full_name
                AS "uploadedByName",

              file.created_at
                AS "createdAt"

            FROM evidence_files file

            LEFT JOIN users uploader
              ON uploader.id =
                file.uploaded_by

            WHERE
              file.id = $1

              AND file.organization_id = $2

              AND COALESCE(
                file.evidence_item_id,
                file.evidence_id
              ) = $3

            LIMIT 1
          `,
      [fileId, organizationId, evidenceId],
    );

    const evidenceFile = result.rows[0];

    if (!evidenceFile) {
      throw new NotFoundException('Evidence file not found');
    }

    return evidenceFile;
  }

  async verifyFile(
    organizationId: string,
    evidenceId: string,
    fileId: string,
    performedBy: string,
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

    const chunks = stream as AsyncIterable<Buffer | Uint8Array | string>;

    for await (const chunk of chunks) {
      if (typeof chunk === 'string') {
        hash.update(chunk, 'utf8');
      } else {
        hash.update(chunk);
      }
    }

    const calculatedHash = hash.digest('hex');

    const matches = calculatedHash === evidenceFile.sha256Hash;

    const result: IntegrityResult = {
      fileId: evidenceFile.id,

      originalFilename: evidenceFile.originalFilename,

      storedHash: evidenceFile.sha256Hash,

      calculatedHash,

      matches,

      checkedAt: new Date().toISOString(),
    };

    await this.custodyService.create(organizationId, evidenceId, performedBy, {
      eventType: CustodyEventType.INTEGRITY_VERIFIED,

      reason: matches
        ? `Integrity verification passed for "${evidenceFile.originalFilename}".`
        : `Integrity verification failed for "${evidenceFile.originalFilename}".`,

      metadata: {
        fileId: evidenceFile.id,

        originalFilename: evidenceFile.originalFilename,

        storedHash: evidenceFile.sha256Hash,

        calculatedHash,

        matches,
      },
    });

    if (!matches) {
      await this.custodyService.create(
        organizationId,
        evidenceId,
        performedBy,
        {
          eventType: CustodyEventType.STATUS_CHANGED,

          reason:
            'Evidence status changed because file integrity verification failed.',

          newStatus: EvidenceStatus.INTEGRITY_WARNING,

          metadata: {
            fileId: evidenceFile.id,

            originalFilename: evidenceFile.originalFilename,

            integrityFailure: true,
          },
        },
      );
    }

    return result;
  }

  async downloadFile(
    organizationId: string,
    evidenceId: string,
    fileId: string,
    performedBy: string,
  ): Promise<EvidenceDownloadResult> {
    const evidenceFile = await this.findFile(
      organizationId,
      evidenceId,
      fileId,
    );

    const stream = await this.storageService.getObjectStream(
      evidenceFile.objectName,
    );

    try {
      await this.custodyService.create(
        organizationId,
        evidenceId,
        performedBy,
        {
          eventType: CustodyEventType.ACCESSED,

          reason: `Evidence file "${evidenceFile.originalFilename}" was downloaded.`,

          metadata: {
            action: 'DOWNLOAD',

            fileId: evidenceFile.id,

            originalFilename: evidenceFile.originalFilename,

            mimeType: evidenceFile.mimeType,

            sizeBytes: evidenceFile.sizeBytes,

            sha256Hash: evidenceFile.sha256Hash,
          },
        },
      );
    } catch (error: unknown) {
      stream.destroy();

      throw error;
    }

    return {
      file: evidenceFile,
      stream,
    };
  }

  private createSafeFilename(originalFilename: string): string {
    const safeFilename = originalFilename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 180);

    return safeFilename || 'evidence-file';
  }

  private async removeObjectSafely(objectName: string): Promise<void> {
    try {
      await this.storageService.removeObject(objectName);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to remove MinIO object "${objectName}": ${message}`,
      );
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

    this.logger.error(`${operation}: Unknown error`);
  }
}
