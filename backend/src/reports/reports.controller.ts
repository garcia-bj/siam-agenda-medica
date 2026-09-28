import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportQueryDto } from './dto/report-query.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('appointments')
  async appointments(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType, filename } =
      await this.reportsService.generateReport(query);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
