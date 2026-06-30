import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface HealthResult {
  status: 'healthy' | 'unhealthy';
  api: string;
  database: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) { }

  async check(): Promise<HealthResult> {
    const databaseConnected =
      await this.databaseService.checkConnection();

    return {
      status: databaseConnected ? 'healthy' : 'unhealthy',
      api: 'running',
      database: databaseConnected
        ? 'connected'
        : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}