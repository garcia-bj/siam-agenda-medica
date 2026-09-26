import { Module } from '@nestjs/common';
import { ScheduleModule } from '../schedule/schedule.module.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';

@Module({
  imports: [ScheduleModule],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
