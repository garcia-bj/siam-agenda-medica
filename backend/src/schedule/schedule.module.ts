import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service.js';

@Module({
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
