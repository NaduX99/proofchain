import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthResult } from './health.service';
import { Public } from '../auth/decorators/public.decorator';
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  checkHealth(): HealthResult {
    return this.healthService.check();
  }
}
