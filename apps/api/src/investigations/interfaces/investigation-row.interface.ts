import type { InvestigationStatus } from '../enums/investigation-status.enum';

export interface InvestigationRow {
  id: string;
  organizationId: string;
  caseCode: string;
  title: string;
  description: string | null;
  status: InvestigationStatus;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date;
  closedAt: Date | null;
}
