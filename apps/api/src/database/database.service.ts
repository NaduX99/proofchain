import {
    Injectable,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService
    implements OnModuleInit, OnModuleDestroy {
    private readonly pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    async onModuleInit(): Promise<void> {
        await this.pool.query('SELECT 1');
        console.log('PostgreSQL connected');
    }

    async checkConnection(): Promise<boolean> {
        try {
            await this.pool.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }

    async query<T>(
        text: string,
        values: unknown[] = [],
    ): Promise<T[]> {
        const result = await this.pool.query<T>(text, values);
        return result.rows;
    }

    async onModuleDestroy(): Promise<void> {
        await this.pool.end();
    }
}