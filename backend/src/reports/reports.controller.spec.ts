import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { vi } from 'vitest';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

describe('ReportsController', () => {
  let controller: ReportsController;
  let serviceMock: { generateReport: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    serviceMock = {
      generateReport: vi.fn().mockResolvedValue({
        buffer: Buffer.from('test-content'),
        contentType: 'text/csv; charset=utf-8',
        filename: 'siam-citas_2026-09-28_2026-10-02.csv',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('configura headers HTTP de Content-Type, Content-Disposition y Content-Length y envía el buffer', async () => {
    const resMock = {
      setHeader: vi.fn(),
      end: vi.fn(),
    } as unknown as Response;

    const query = { from: '2026-09-28', to: '2026-10-02', format: 'csv' as const };
    await controller.appointments(query, resMock);

    expect(serviceMock.generateReport).toHaveBeenCalledWith(query);
    expect(resMock.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(resMock.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="siam-citas_2026-09-28_2026-10-02.csv"',
    );
    expect(resMock.setHeader).toHaveBeenCalledWith('Content-Length', Buffer.from('test-content').length);
    expect(resMock.end).toHaveBeenCalledWith(Buffer.from('test-content'));
  });
});
