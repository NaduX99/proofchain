import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.pool.query('SELECT 1');

      this.logger.log('PostgreSQL connected successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`PostgreSQL connection failed: ${message}`);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');

      return true;
    } catch {
      return false;
    }
  }

  async query<T extends QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  async withTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await operation(client);

      await client.query('COMMIT');

      return result;
    } catch (error: unknown) {
      await client.query('ROLLBACK');

      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
