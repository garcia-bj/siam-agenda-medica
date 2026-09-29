import { Module } from '@nestjs/common';
import { ScheduleModule } from '../schedule/schedule.module.js';
import { DoctorsController } from './doctors.controller.js';
import { DoctorsService } from './doctors.service.js';

@Module({
  imports: [ScheduleModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
