import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name);
    private readonly pool: Pool;

    constructor(private readonly configService: ConfigService) {
        const databaseUrl =
            this.configService.get<string>('DATABASE_URL');

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
        } catch (error) {
            this.logger.error('PostgreSQL connection failed', error);
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

    async onModuleDestroy(): Promise<void> {
        await this.pool.end();
    }
}