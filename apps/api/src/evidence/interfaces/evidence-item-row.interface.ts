import type { EvidenceType } from '../enums/evidence-type.enum';

export interface EvidenceItemRow {
  id: string;
  organizationId: string;
  investigationId: string;
  evidenceCode: string;
  title: string;
  description: string | null;
  evidenceType: EvidenceType;
  collectedAt: Date | null;
  collectedBy: string | null;
  collectedByName: string | null;
  createdAt: Date;
}
