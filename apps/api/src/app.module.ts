import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/interceptors/audit.interceptor';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

import { CustodyModule } from './custody/custody.module';
import { DatabaseModule } from './database/database.module';
import { EvidenceModule } from './evidence/evidence.module';
import { HealthModule } from './health/health.module';
import { InvestigationsModule } from './investigations/investigations.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { StorageModule } from './storage/storage.module';
import { TransfersModule } from './transfers/transfers.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SearchModule } from './search/search.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    DatabaseModule,
    StorageModule,
    HealthModule,

    OrganizationsModule,
    UsersModule,
    AuthModule,

    InvestigationsModule,
    CustodyModule,
    EvidenceModule,
    TransfersModule,
    AuditModule,
    DashboardModule,
    SearchModule,
    ReportsModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
