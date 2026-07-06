import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { CustodyService } from '../custody/custody.service';
import { CustodyEventType } from '../custody/enums/custody-event-type.enum';
import { DatabaseService } from '../database/database.service';

import type { CreateTransferRequestDto } from './dto/create-transfer-request.dto';
import type { RejectTransferRequestDto } from './dto/reject-transfer-request.dto';
import { TransferRequestStatus } from './enums/transfer-request-status.enum';
import type { TransferRequestRow } from './interfaces/transfer-request-row.interface';

interface IdRow extends QueryResultRow {
  id: string;
}

interface EvidenceStateRow extends QueryResultRow {
  id: string;
  currentCustodianId: string | null;
}

interface ActiveUserRow extends QueryResultRow {
  id: string;
}

interface TransferStateRow extends QueryResultRow {
  id: string;
  organizationId: string;
  evidenceId: string;
  requestedBy: string;
  fromCustodianId: string | null;
  toCustodianId: string;
  reason: string;
  status: TransferRequestStatus;
}

interface TransferRequestDbRow extends QueryResultRow {
  id: string;
  organizationId: string;
  evidenceId: string;

  requestedBy: string;
  requestedByName: string | null;

  fromCustodianId: string | null;
  fromCustodianName: string | null;

  toCustodianId: string;
  toCustodianName: string | null;

  reason: string;
  status: TransferRequestStatus;

  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: Date | null;

  rejectedBy: string | null;
  rejectedByName: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;

  completedBy: string | null;
  completedByName: string | null;
  completedAt: Date | null;

  createdAt: Date;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly databaseService: DatabaseService,

    private readonly custodyService: CustodyService,
  ) {}

  async createRequest(
    organizationId: string,
    evidenceId: string,
    requestedBy: string,
    dto: CreateTransferRequestDto,
  ): Promise<TransferRequestRow> {
    const requestId = await this.databaseService.withTransaction(
      async (client: PoolClient): Promise<string> => {
        const evidence = await this.findEvidenceForUpdate(
          client,
          organizationId,
          evidenceId,
        );

        await this.ensureActiveUser(client, organizationId, dto.toCustodianId);

        if (evidence.currentCustodianId === dto.toCustodianId) {
          throw new BadRequestException(
            'Evidence is already assigned to this custodian',
          );
        }

        const pendingResult = await client.query<IdRow>(
          `
                SELECT id
                FROM custody_transfer_requests
                WHERE organization_id = $1
                  AND evidence_id = $2
                  AND status = 'PENDING'
                LIMIT 1
              `,
          [organizationId, evidenceId],
        );

        if (pendingResult.rows[0]) {
          throw new ConflictException(
            'A pending transfer request already exists for this evidence item',
          );
        }

        const reason = dto.reason.trim();

        const insertResult = await client.query<IdRow>(
          `
                INSERT INTO custody_transfer_requests (
                  organization_id,
                  evidence_id,
                  requested_by,
                  from_custodian_id,
                  to_custodian_id,
                  reason,
                  status
                )
                VALUES (
                  $1,
                  $2,
                  $3,
                  $4,
                  $5,
                  $6,
                  'PENDING'
                )
                RETURNING id
              `,
          [
            organizationId,
            evidenceId,
            requestedBy,
            evidence.currentCustodianId,
            dto.toCustodianId,
            reason,
          ],
        );

        const insertedId = insertResult.rows[0]?.id;

        if (!insertedId) {
          throw new Error('Transfer request could not be created');
        }

        return insertedId;
      },
    );

    const createdRequest = await this.findOne(organizationId, requestId);

    try {
      await this.custodyService.create(
        organizationId,
        evidenceId,
        requestedBy,
        {
          eventType: CustodyEventType.TRANSFER_REQUESTED,

          reason: `Custody transfer requested: ${createdRequest.reason}`,

          toCustodianId: createdRequest.toCustodianId,

          metadata: {
            transferRequestId: createdRequest.id,

            fromCustodianId: createdRequest.fromCustodianId,

            toCustodianId: createdRequest.toCustodianId,

            location: dto.location ?? null,

            status: createdRequest.status,
          },
        },
      );
    } catch (error: unknown) {
      await this.databaseService.query(
        `
          DELETE FROM custody_transfer_requests
          WHERE id = $1
            AND organization_id = $2
            AND status = 'PENDING'
        `,
        [requestId, organizationId],
      );

      throw error;
    }

    return createdRequest;
  }

  async findAllByEvidence(
    organizationId: string,
    evidenceId: string,
  ): Promise<TransferRequestRow[]> {
    await this.ensureEvidenceExists(organizationId, evidenceId);

    const result = await this.databaseService.query<TransferRequestDbRow>(
      this.getTransferSelectSql(`
            WHERE transfer.organization_id = $1
              AND transfer.evidence_id = $2

            ORDER BY
              transfer.created_at DESC
          `),
      [organizationId, evidenceId],
    );

    return result.rows;
  }

  async approve(
    organizationId: string,
    requestId: string,
    approvedBy: string,
  ): Promise<TransferRequestRow> {
    const transfer = await this.updateStatus(
      organizationId,
      requestId,
      TransferRequestStatus.PENDING,
      TransferRequestStatus.APPROVED,
      approvedBy,
      null,
    );

    try {
      await this.custodyService.create(
        organizationId,
        transfer.evidenceId,
        approvedBy,
        {
          eventType: CustodyEventType.TRANSFER_APPROVED,

          reason: 'Custody transfer request approved.',

          toCustodianId: transfer.toCustodianId,

          metadata: {
            transferRequestId: transfer.id,

            requestedBy: transfer.requestedBy,

            approvedBy,

            fromCustodianId: transfer.fromCustodianId,

            toCustodianId: transfer.toCustodianId,

            status: transfer.status,
          },
        },
      );
    } catch (error: unknown) {
      await this.revertApproval(organizationId, requestId);

      throw error;
    }

    return transfer;
  }

  async reject(
    organizationId: string,
    requestId: string,
    rejectedBy: string,
    dto: RejectTransferRequestDto,
  ): Promise<TransferRequestRow> {
    const rejectionReason = dto.rejectionReason.trim();

    const transfer = await this.updateStatus(
      organizationId,
      requestId,
      TransferRequestStatus.PENDING,
      TransferRequestStatus.REJECTED,
      rejectedBy,
      rejectionReason,
    );

    try {
      await this.custodyService.create(
        organizationId,
        transfer.evidenceId,
        rejectedBy,
        {
          eventType: CustodyEventType.TRANSFER_REJECTED,

          reason: `Custody transfer request rejected: ${transfer.rejectionReason ?? ''}`,

          toCustodianId: transfer.toCustodianId,

          metadata: {
            transferRequestId: transfer.id,

            requestedBy: transfer.requestedBy,

            rejectedBy,

            rejectionReason: transfer.rejectionReason,

            fromCustodianId: transfer.fromCustodianId,

            toCustodianId: transfer.toCustodianId,

            status: transfer.status,
          },
        },
      );
    } catch (error: unknown) {
      await this.revertRejection(organizationId, requestId);

      throw error;
    }

    return transfer;
  }

  async complete(
    organizationId: string,
    requestId: string,
    completedBy: string,
  ): Promise<TransferRequestRow> {
    const transferId = await this.databaseService.withTransaction(
      async (client: PoolClient): Promise<string> => {
        const transfer = await this.findTransferForUpdate(
          client,
          organizationId,
          requestId,
        );

        if (transfer.status !== TransferRequestStatus.APPROVED) {
          throw new BadRequestException(
            'Only approved transfer requests can be completed',
          );
        }

        await this.findEvidenceForUpdate(
          client,
          organizationId,
          transfer.evidenceId,
        );

        await this.ensureActiveUser(
          client,
          organizationId,
          transfer.toCustodianId,
        );

        const result = await client.query<IdRow>(
          `
                UPDATE custody_transfer_requests
                SET
                  status = 'COMPLETED',
                  completed_by = $3,
                  completed_at = NOW()
                WHERE id = $1
                  AND organization_id = $2
                  AND status = 'APPROVED'
                RETURNING id
              `,
          [requestId, organizationId, completedBy],
        );

        const updatedId = result.rows[0]?.id;

        if (!updatedId) {
          throw new NotFoundException('Transfer request not found');
        }

        return updatedId;
      },
    );

    const transfer = await this.findOne(organizationId, transferId);

    try {
      await this.custodyService.create(
        organizationId,
        transfer.evidenceId,
        completedBy,
        {
          eventType: CustodyEventType.TRANSFERRED,

          reason: 'Custody transfer completed.',

          toCustodianId: transfer.toCustodianId,

          metadata: {
            transferRequestId: transfer.id,

            completedBy,

            fromCustodianId: transfer.fromCustodianId,

            toCustodianId: transfer.toCustodianId,

            status: transfer.status,
          },
        },
      );
    } catch (error: unknown) {
      await this.revertCompletion(organizationId, requestId);

      throw error;
    }

    return transfer;
  }

  async findOne(
    organizationId: string,
    requestId: string,
  ): Promise<TransferRequestRow> {
    const result = await this.databaseService.query<TransferRequestDbRow>(
      this.getTransferSelectSql(`
            WHERE transfer.organization_id = $1
              AND transfer.id = $2

            LIMIT 1
          `),
      [organizationId, requestId],
    );

    const transfer = result.rows[0];

    if (!transfer) {
      throw new NotFoundException('Transfer request not found');
    }

    return transfer;
  }

  private async updateStatus(
    organizationId: string,
    requestId: string,
    expectedStatus: TransferRequestStatus,
    nextStatus: TransferRequestStatus,
    actorId: string,
    rejectionReason: string | null,
  ): Promise<TransferRequestRow> {
    const updatedId = await this.databaseService.withTransaction(
      async (client: PoolClient): Promise<string> => {
        const transfer = await this.findTransferForUpdate(
          client,
          organizationId,
          requestId,
        );

        if (transfer.status !== expectedStatus) {
          throw new BadRequestException(
            `Transfer request must be ${expectedStatus} before it can become ${nextStatus}`,
          );
        }

        let newRequestId: string | undefined;

        if (nextStatus === TransferRequestStatus.APPROVED) {
          const result = await client.query<IdRow>(
            `
                  UPDATE custody_transfer_requests
                  SET
                    status = 'APPROVED',
                    approved_by = $3,
                    approved_at = NOW()
                  WHERE id = $1
                    AND organization_id = $2
                  RETURNING id
                `,
            [requestId, organizationId, actorId],
          );

          newRequestId = result.rows[0]?.id;
        } else if (nextStatus === TransferRequestStatus.REJECTED) {
          const result = await client.query<IdRow>(
            `
                  UPDATE custody_transfer_requests
                  SET
                    status = 'REJECTED',
                    rejected_by = $3,
                    rejected_at = NOW(),
                    rejection_reason = $4
                  WHERE id = $1
                    AND organization_id = $2
                  RETURNING id
                `,
            [requestId, organizationId, actorId, rejectionReason],
          );

          newRequestId = result.rows[0]?.id;
        } else {
          throw new BadRequestException('Unsupported transfer status update');
        }

        if (!newRequestId) {
          throw new NotFoundException('Transfer request not found');
        }

        return newRequestId;
      },
    );

    return this.findOne(organizationId, updatedId);
  }

  private async ensureEvidenceExists(
    organizationId: string,
    evidenceId: string,
  ): Promise<void> {
    const result = await this.databaseService.query<IdRow>(
      `
          SELECT id
          FROM evidence_items
          WHERE id = $1
            AND organization_id = $2
          LIMIT 1
        `,
      [evidenceId, organizationId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Evidence not found');
    }
  }

  private async findEvidenceForUpdate(
    client: PoolClient,
    organizationId: string,
    evidenceId: string,
  ): Promise<EvidenceStateRow> {
    const result = await client.query<EvidenceStateRow>(
      `
          SELECT
            id,
            current_custodian_id
              AS "currentCustodianId"
          FROM evidence_items
          WHERE id = $1
            AND organization_id = $2
          FOR UPDATE
        `,
      [evidenceId, organizationId],
    );

    const evidence = result.rows[0];

    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    return evidence;
  }

  private async ensureActiveUser(
    client: PoolClient,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const result = await client.query<ActiveUserRow>(
      `
          SELECT id
          FROM users
          WHERE id = $1
            AND organization_id = $2
            AND is_active = TRUE
          LIMIT 1
        `,
      [userId, organizationId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException(
        'Target custodian was not found or is inactive',
      );
    }
  }

  private async findTransferForUpdate(
    client: PoolClient,
    organizationId: string,
    requestId: string,
  ): Promise<TransferStateRow> {
    const result = await client.query<TransferStateRow>(
      `
          SELECT
            id,
            organization_id
              AS "organizationId",
            evidence_id
              AS "evidenceId",
            requested_by
              AS "requestedBy",
            from_custodian_id
              AS "fromCustodianId",
            to_custodian_id
              AS "toCustodianId",
            reason,
            status
          FROM custody_transfer_requests
          WHERE id = $1
            AND organization_id = $2
          FOR UPDATE
        `,
      [requestId, organizationId],
    );

    const transfer = result.rows[0];

    if (!transfer) {
      throw new NotFoundException('Transfer request not found');
    }

    return transfer;
  }

  private async revertApproval(
    organizationId: string,
    requestId: string,
  ): Promise<void> {
    await this.databaseService.query(
      `
        UPDATE custody_transfer_requests
        SET
          status = 'PENDING',
          approved_by = NULL,
          approved_at = NULL
        WHERE id = $1
          AND organization_id = $2
          AND status = 'APPROVED'
      `,
      [requestId, organizationId],
    );
  }

  private async revertRejection(
    organizationId: string,
    requestId: string,
  ): Promise<void> {
    await this.databaseService.query(
      `
        UPDATE custody_transfer_requests
        SET
          status = 'PENDING',
          rejected_by = NULL,
          rejected_at = NULL,
          rejection_reason = NULL
        WHERE id = $1
          AND organization_id = $2
          AND status = 'REJECTED'
      `,
      [requestId, organizationId],
    );
  }

  private async revertCompletion(
    organizationId: string,
    requestId: string,
  ): Promise<void> {
    await this.databaseService.query(
      `
        UPDATE custody_transfer_requests
        SET
          status = 'APPROVED',
          completed_by = NULL,
          completed_at = NULL
        WHERE id = $1
          AND organization_id = $2
          AND status = 'COMPLETED'
      `,
      [requestId, organizationId],
    );
  }

  private getTransferSelectSql(whereClause: string): string {
    return `
      SELECT
        transfer.id,

        transfer.organization_id
          AS "organizationId",

        transfer.evidence_id
          AS "evidenceId",

        transfer.requested_by
          AS "requestedBy",

        requested_by_user.full_name
          AS "requestedByName",

        transfer.from_custodian_id
          AS "fromCustodianId",

        from_user.full_name
          AS "fromCustodianName",

        transfer.to_custodian_id
          AS "toCustodianId",

        to_user.full_name
          AS "toCustodianName",

        transfer.reason,

        transfer.status,

        transfer.approved_by
          AS "approvedBy",

        approved_by_user.full_name
          AS "approvedByName",

        transfer.approved_at
          AS "approvedAt",

        transfer.rejected_by
          AS "rejectedBy",

        rejected_by_user.full_name
          AS "rejectedByName",

        transfer.rejected_at
          AS "rejectedAt",

        transfer.rejection_reason
          AS "rejectionReason",

        transfer.completed_by
          AS "completedBy",

        completed_by_user.full_name
          AS "completedByName",

        transfer.completed_at
          AS "completedAt",

        transfer.created_at
          AS "createdAt"

      FROM custody_transfer_requests transfer

      LEFT JOIN users requested_by_user
        ON requested_by_user.id =
          transfer.requested_by

      LEFT JOIN users from_user
        ON from_user.id =
          transfer.from_custodian_id

      LEFT JOIN users to_user
        ON to_user.id =
          transfer.to_custodian_id

      LEFT JOIN users approved_by_user
        ON approved_by_user.id =
          transfer.approved_by

      LEFT JOIN users rejected_by_user
        ON rejected_by_user.id =
          transfer.rejected_by

      LEFT JOIN users completed_by_user
        ON completed_by_user.id =
          transfer.completed_by

      ${whereClause}
    `;
  }
}
