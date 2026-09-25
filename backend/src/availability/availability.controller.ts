import { Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  async getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.availabilityService.getDay(query);
  }
}
