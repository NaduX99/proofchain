export interface EvidenceFileRow {
  id: string;
  organizationId: string;
  evidenceItemId: string;
  originalFilename: string;
  objectName: string;
  bucketName: string;
  mimeType: string | null;
  sizeBytes: number;
  sha256Hash: string;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: Date;
}
