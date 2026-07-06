import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type { CreateCustodyEventDto } from './dto/create-custody-event.dto';
import { CustodyEventType } from './enums/custody-event-type.enum';
import type { ChainVerificationResult } from './interfaces/chain-verification-result.interface';
import type { CustodyEventRow } from './interfaces/custody-event-row.interface';
import { stableStringify } from './utils/canonical-json.util';

interface EvidenceStateRow {
  id: string;
  currentCustodianId: string | null;
  status: string;
}

interface LastEventRow {
  eventHash: string;
  sequenceNumber: number;
}

interface IdRow {
  id: string;
}

interface ActiveUserRow {
  id: string;
}

interface EventHashInput {
  organizationId: string;
  evidenceId: string;
  eventType: string;
  performedBy: string;
  fromCustodianId: string | null;
  toCustodianId: string | null;
  reason: string;
  previousEventHash: string | null;
  eventTime: string;
  sequenceNumber: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class CustodyService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(
    organizationId: string,
    evidenceId: string,
    performedBy: string,
    dto: CreateCustodyEventDto,
  ): Promise<CustodyEventRow> {
    const eventId = await this.databaseService.withTransaction(
      async (client: PoolClient): Promise<string> => {
        const evidenceResult = await client.query<EvidenceStateRow>(
          `
                SELECT
                  id,
                  current_custodian_id
                    AS "currentCustodianId",
                  status
                FROM evidence_items
                WHERE id = $1
                  AND organization_id = $2
                FOR UPDATE
              `,
          [evidenceId, organizationId],
        );

        const evidence = evidenceResult.rows[0];

        if (!evidence) {
          throw new NotFoundException('Evidence not found');
        }

        let fromCustodianId: string | null = null;

        let toCustodianId: string | null = null;

        const metadata: Record<string, unknown> = {
          ...(dto.metadata ?? {}),
        };

        if (dto.eventType === CustodyEventType.TRANSFERRED) {
          if (!dto.toCustodianId) {
            throw new BadRequestException(
              'toCustodianId is required for a transfer event',
            );
          }

          const userResult = await client.query<ActiveUserRow>(
            `
                  SELECT id
                  FROM users
                  WHERE id = $1
                    AND organization_id = $2
                    AND is_active = TRUE
                  LIMIT 1
                `,
            [dto.toCustodianId, organizationId],
          );

          if (!userResult.rows[0]) {
            throw new NotFoundException(
              'Target custodian was not found or is inactive',
            );
          }

          if (evidence.currentCustodianId === dto.toCustodianId) {
            throw new BadRequestException(
              'Evidence is already assigned to this custodian',
            );
          }

          fromCustodianId = evidence.currentCustodianId;

          toCustodianId = dto.toCustodianId;

          metadata.previousCustodianId = fromCustodianId;

          metadata.newCustodianId = toCustodianId;
        }

        if (dto.eventType === CustodyEventType.EVIDENCE_REGISTERED) {
          toCustodianId = evidence.currentCustodianId;

          metadata.initialCustodianId = evidence.currentCustodianId;
        }

        if (dto.eventType === CustodyEventType.STATUS_CHANGED) {
          if (!dto.newStatus) {
            throw new BadRequestException(
              'newStatus is required for a status-change event',
            );
          }

          metadata.previousStatus = evidence.status;

          metadata.newStatus = dto.newStatus;
        }

        const lastEventResult = await client.query<LastEventRow>(
          `
                SELECT
                  event_hash
                    AS "eventHash",
                  sequence_number::INTEGER
                    AS "sequenceNumber"
                FROM custody_events
                WHERE organization_id = $1
                  AND evidence_id = $2
                ORDER BY
                  sequence_number DESC
                LIMIT 1
              `,
          [organizationId, evidenceId],
        );

        const lastEvent = lastEventResult.rows[0];

        const sequenceNumber = (lastEvent?.sequenceNumber ?? 0) + 1;

        const previousEventHash = lastEvent?.eventHash ?? null;

        const eventTime = new Date();

        const reason = dto.reason.trim();

        const eventHash = this.calculateEventHash({
          organizationId,
          evidenceId,
          eventType: dto.eventType,
          performedBy,
          fromCustodianId,
          toCustodianId,
          reason,
          previousEventHash,
          eventTime: eventTime.toISOString(),
          sequenceNumber,
          metadata,
        });

        const insertResult = await client.query<IdRow>(
          `
                INSERT INTO custody_events (
                  organization_id,
                  evidence_id,
                  event_type,
                  performed_by,
                  from_custodian_id,
                  to_custodian_id,
                  reason,
                  previous_event_hash,
                  event_hash,
                  event_time,
                  metadata,
                  sequence_number
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
                  $10,
                  $11::jsonb,
                  $12
                )
                RETURNING id
              `,
          [
            organizationId,
            evidenceId,
            dto.eventType,
            performedBy,
            fromCustodianId,
            toCustodianId,
            reason,
            previousEventHash,
            eventHash,
            eventTime,
            metadata,
            sequenceNumber,
          ],
        );

        const insertedEventId = insertResult.rows[0]?.id;

        if (!insertedEventId) {
          throw new Error('Custody event could not be created');
        }

        if (dto.eventType === CustodyEventType.TRANSFERRED) {
          await client.query(
            `
                UPDATE evidence_items
                SET
                  current_custodian_id = $3,
                  status = 'TRANSFERRED'
                WHERE id = $1
                  AND organization_id = $2
              `,
            [evidenceId, organizationId, toCustodianId],
          );
        }

        if (dto.eventType === CustodyEventType.STATUS_CHANGED) {
          await client.query(
            `
                UPDATE evidence_items
                SET status =
                  $3::evidence_status
                WHERE id = $1
                  AND organization_id = $2
              `,
            [evidenceId, organizationId, dto.newStatus],
          );
        }

        return insertedEventId;
      },
    );

    return this.findOne(organizationId, evidenceId, eventId);
  }

  async findAll(
    organizationId: string,
    evidenceId: string,
  ): Promise<CustodyEventRow[]> {
    await this.ensureEvidenceExists(organizationId, evidenceId);

    const result = await this.databaseService.query<CustodyEventRow>(
      `
          SELECT
            event.id,
            event.organization_id
              AS "organizationId",
            event.evidence_id
              AS "evidenceId",
            event.event_type
              AS "eventType",

            event.performed_by
              AS "performedBy",
            performer.full_name
              AS "performedByName",

            event.from_custodian_id
              AS "fromCustodianId",
            from_user.full_name
              AS "fromCustodianName",

            event.to_custodian_id
              AS "toCustodianId",
            to_user.full_name
              AS "toCustodianName",

            event.reason,

            event.previous_event_hash
              AS "previousEventHash",
            event.event_hash
              AS "eventHash",

            event.event_time
              AS "eventTime",

            event.sequence_number::INTEGER
              AS "sequenceNumber",

            event.metadata
          FROM custody_events event

          LEFT JOIN users performer
            ON performer.id =
              event.performed_by

          LEFT JOIN users from_user
            ON from_user.id =
              event.from_custodian_id

          LEFT JOIN users to_user
            ON to_user.id =
              event.to_custodian_id

          WHERE event.organization_id = $1
            AND event.evidence_id = $2

          ORDER BY
            event.sequence_number ASC
        `,
      [organizationId, evidenceId],
    );

    return result.rows;
  }

  async findOne(
    organizationId: string,
    evidenceId: string,
    eventId: string,
  ): Promise<CustodyEventRow> {
    const result = await this.databaseService.query<CustodyEventRow>(
      `
          SELECT
            event.id,
            event.organization_id
              AS "organizationId",
            event.evidence_id
              AS "evidenceId",
            event.event_type
              AS "eventType",

            event.performed_by
              AS "performedBy",
            performer.full_name
              AS "performedByName",

            event.from_custodian_id
              AS "fromCustodianId",
            from_user.full_name
              AS "fromCustodianName",

            event.to_custodian_id
              AS "toCustodianId",
            to_user.full_name
              AS "toCustodianName",

            event.reason,

            event.previous_event_hash
              AS "previousEventHash",
            event.event_hash
              AS "eventHash",

            event.event_time
              AS "eventTime",

            event.sequence_number::INTEGER
              AS "sequenceNumber",

            event.metadata
          FROM custody_events event

          LEFT JOIN users performer
            ON performer.id =
              event.performed_by

          LEFT JOIN users from_user
            ON from_user.id =
              event.from_custodian_id

          LEFT JOIN users to_user
            ON to_user.id =
              event.to_custodian_id

          WHERE event.id = $1
            AND event.evidence_id = $2
            AND event.organization_id = $3

          LIMIT 1
        `,
      [eventId, evidenceId, organizationId],
    );

    const custodyEvent = result.rows[0];

    if (!custodyEvent) {
      throw new NotFoundException('Custody event not found');
    }

    return custodyEvent;
  }

  async verifyChain(
    organizationId: string,
    evidenceId: string,
  ): Promise<ChainVerificationResult> {
    const events = await this.findAll(organizationId, evidenceId);

    let expectedPreviousHash: string | null = null;

    for (const event of events) {
      if (event.previousEventHash !== expectedPreviousHash) {
        return {
          evidenceId,
          valid: false,
          totalEvents: events.length,
          brokenAtSequence: event.sequenceNumber,
          brokenEventId: event.id,
          message: 'The previous-event hash link is invalid',
          checkedAt: new Date().toISOString(),
        };
      }

      const eventTime =
        event.eventTime instanceof Date
          ? event.eventTime.toISOString()
          : new Date(event.eventTime).toISOString();

      const calculatedHash = this.calculateEventHash({
        organizationId: event.organizationId,
        evidenceId: event.evidenceId,
        eventType: event.eventType,
        performedBy: event.performedBy ?? '',
        fromCustodianId: event.fromCustodianId,
        toCustodianId: event.toCustodianId,
        reason: event.reason,
        previousEventHash: event.previousEventHash,
        eventTime,
        sequenceNumber: event.sequenceNumber,
        metadata: event.metadata,
      });

      if (calculatedHash !== event.eventHash) {
        return {
          evidenceId,
          valid: false,
          totalEvents: events.length,
          brokenAtSequence: event.sequenceNumber,
          brokenEventId: event.id,
          message: 'A custody-event hash is invalid',
          checkedAt: new Date().toISOString(),
        };
      }

      expectedPreviousHash = event.eventHash;
    }

    return {
      evidenceId,
      valid: true,
      totalEvents: events.length,
      brokenAtSequence: null,
      brokenEventId: null,
      message:
        events.length === 0
          ? 'No custody events exist yet'
          : 'The custody-event hash chain is valid',
      checkedAt: new Date().toISOString(),
    };
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

  private calculateEventHash(input: EventHashInput): string {
    const canonicalValue = stableStringify(input);

    return createHash('sha256').update(canonicalValue, 'utf8').digest('hex');
  }
}
