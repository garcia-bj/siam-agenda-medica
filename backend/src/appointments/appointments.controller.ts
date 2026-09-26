import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { QueryAppointmentsDto } from './dto/query-appointments.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryAppointmentsDto) {
    return this.appointmentsService.findAll(query);
  }

  @Patch(':id')
  reschedule(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.reschedule(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }
}
