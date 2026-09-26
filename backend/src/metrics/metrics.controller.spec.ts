import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { MetricsController } from './metrics.controller.js';
import { MetricsService, MetricsSummary } from './metrics.service.js';

describe('MetricsController', () => {
  let controller: MetricsController;
  let serviceMock: { getSummary: ReturnType<typeof vi.fn> };

  const fakeSummary: MetricsSummary = {
    range: { from: '2026-09-28', to: '2026-10-02', businessDays: 5 },
    totals: { active: 10, cancelled: 2, capacity: 360, occupancyRate: 0.028, cancellationRate: 0.167 },
    bySpecialty: [],
    byDay: [],
    byHour: [],
  };

  beforeEach(async () => {
    serviceMock = {
      getSummary: vi.fn().mockResolvedValue(fakeSummary),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('delega la llamada a metricsService.getSummary con el DTO recibido', async () => {
    const query = { from: '2026-09-28', to: '2026-10-02', specialty: 'PEDIATRIA' as const };
    const result = await controller.summary(query);

    expect(serviceMock.getSummary).toHaveBeenCalledWith(query);
    expect(result).toBe(fakeSummary);
  });
});
