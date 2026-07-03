export interface IntegrityResult {
  fileId: string;
  originalFilename: string;
  storedHash: string;
  calculatedHash: string;
  matches: boolean;
  checkedAt: string;
}
