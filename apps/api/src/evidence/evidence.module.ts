import { Module } from '@nestjs/common';

import { CustodyModule } from '../custody/custody.module';
import { DatabaseModule } from '../database/database.module';
import { InvestigationsModule } from '../investigations/investigations.module';
import { StorageModule } from '../storage/storage.module';

import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';

@Module({
  imports: [DatabaseModule, StorageModule, InvestigationsModule, CustodyModule],
  controllers: [EvidenceController],
  providers: [EvidenceService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
