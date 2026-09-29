import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ScheduleModule } from './schedule/schedule.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { DatabaseModule } from './database/database.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { DoctorsModule } from './doctors/doctors.module.js';

@Module({
  imports: [ScheduleModule, AvailabilityModule, AppointmentsModule, DatabaseModule, MetricsModule, ReportsModule, DoctorsModule],
  controllers: [AppController],
})
export class AppModule {}
