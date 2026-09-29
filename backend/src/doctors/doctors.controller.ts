import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DoctorsService } from './doctors.service.js';
import { CreateDoctorDto, UpdateDoctorDto } from './dto/doctor.dto.js';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  findAll() {
    return this.doctorsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.update(id, dto);
  }
}
