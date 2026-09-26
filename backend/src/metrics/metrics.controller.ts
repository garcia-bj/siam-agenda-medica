import { Controller, Get, Query } from '@nestjs/common';
import { MetricsQueryDto } from './dto/metrics-query.dto.js';
import { MetricsService, MetricsSummary } from './metrics.service.js';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('summary')
  async summary(@Query() query: MetricsQueryDto): Promise<MetricsSummary> {
    return this.metricsService.getSummary(query);
  }
}
