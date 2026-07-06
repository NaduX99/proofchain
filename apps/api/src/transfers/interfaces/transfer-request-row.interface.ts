import type { TransferRequestStatus } from '../enums/transfer-request-status.enum';

export interface TransferRequestRow {
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
