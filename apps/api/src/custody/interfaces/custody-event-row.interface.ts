import type { CustodyEventType } from '../enums/custody-event-type.enum';

export interface CustodyEventRow {
  id: string;
  organizationId: string;
  evidenceId: string;
  eventType: CustodyEventType;

  performedBy: string | null;
  performedByName: string | null;

  fromCustodianId: string | null;
  fromCustodianName: string | null;

  toCustodianId: string | null;
  toCustodianName: string | null;

  reason: string;

  previousEventHash: string | null;
  eventHash: string;

  eventTime: Date;
  sequenceNumber: number;

  metadata: Record<string, unknown>;
}
