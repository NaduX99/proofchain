import { Injectable } from '@nestjs/common';

export interface HealthResult {
  status: string;
  api: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  check(): HealthResult {
    return {
      status: 'healthy',
      api: 'running',
      timestamp: new Date().toISOString(),
    };
  }
}