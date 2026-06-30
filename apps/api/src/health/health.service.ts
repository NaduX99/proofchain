import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';

export interface HealthResult {
  status: 'healthy' | 'unhealthy';
  api: string;
  database: string;
  storage: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) { }

  async check(): Promise<HealthResult> {
    const [databaseConnected, storageConnected] =
      await Promise.all([
        this.databaseService.checkConnection(),
        this.storageService.checkConnection(),
      ]);

    return {
      status:
        databaseConnected && storageConnected
          ? 'healthy'
          : 'unhealthy',

      api: 'running',

      database: databaseConnected
        ? 'connected'
        : 'disconnected',

      storage: storageConnected
        ? 'available'
        : 'unavailable',

      timestamp: new Date().toISOString(),
    };
  }
}