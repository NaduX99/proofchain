import type { Readable } from 'node:stream';
import type { EvidenceFileRow } from './evidence-file-row.interface';

export interface EvidenceDownloadResult {
  file: EvidenceFileRow;
  stream: Readable;
}
