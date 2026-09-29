import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { ScheduleModule } from '../schedule/schedule.module.js';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';

@Module({
  imports: [ScheduleModule, DoctorsModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
