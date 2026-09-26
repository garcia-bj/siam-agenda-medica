import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';

describe('AvailabilityController', () => {
  let controller: AvailabilityController;
  let serviceMock: { getDay: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    serviceMock = {
      getDay: vi.fn().mockResolvedValue({
        date: '2026-09-28',
        isBusinessDay: true,
        slots: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvailabilityController],
      providers: [
        {
          provide: AvailabilityService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<AvailabilityController>(AvailabilityController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('delega la consulta a availabilityService.getDay', async () => {
    const query = { date: '2026-09-28', specialty: 'PEDIATRIA' as const };
    const result = await controller.getAvailability(query);

    expect(serviceMock.getDay).toHaveBeenCalledWith(query);
    expect(result).toEqual({
      date: '2026-09-28',
      isBusinessDay: true,
      slots: [],
    });
  });
});
