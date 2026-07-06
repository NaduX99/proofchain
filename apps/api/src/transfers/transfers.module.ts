import { Module } from '@nestjs/common';

import { CustodyModule } from '../custody/custody.module';
import { DatabaseModule } from '../database/database.module';

import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [DatabaseModule, CustodyModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
