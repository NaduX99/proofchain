export interface ChainVerificationResult {
  evidenceId: string;
  valid: boolean;
  totalEvents: number;
  brokenAtSequence: number | null;
  brokenEventId: string | null;
  message: string;
  checkedAt: string;
}
