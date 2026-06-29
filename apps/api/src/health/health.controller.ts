import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthResult } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  checkHealth(): HealthResult {
    return this.healthService.check();
  }
}