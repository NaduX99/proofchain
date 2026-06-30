import {
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
    private readonly logger = new Logger(StorageService.name);
    private readonly client: Minio.Client;
    private readonly bucketName: string;

    constructor(private readonly configService: ConfigService) {
        this.bucketName =
            this.configService.get<string>('MINIO_BUCKET') ??
            'proofchain-evidence';

        this.client = new Minio.Client({
            endPoint:
                this.configService.get<string>('MINIO_ENDPOINT') ??
                'localhost',

            port: Number(
                this.configService.get<string>('MINIO_PORT') ??
                9000,
            ),

            useSSL:
                this.configService.get<string>('MINIO_USE_SSL') ===
                'true',

            accessKey:
                this.configService.get<string>(
                    'MINIO_ACCESS_KEY',
                ) ?? '',

            secretKey:
                this.configService.get<string>(
                    'MINIO_SECRET_KEY',
                ) ?? '',
        });
    }

    async onModuleInit(): Promise<void> {
        try {
            const exists = await this.client.bucketExists(
                this.bucketName,
            );

            if (!exists) {
                await this.client.makeBucket(this.bucketName);
                this.logger.log(
                    `MinIO bucket created: ${this.bucketName}`,
                );
            }

            this.logger.log('MinIO connected successfully');
        } catch (error) {
            this.logger.error('MinIO connection failed', error);
        }
    }

    async checkConnection(): Promise<boolean> {
        try {
            return await this.client.bucketExists(
                this.bucketName,
            );
        } catch {
            return false;
        }
    }
}