'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { findPeakHour } from '../utils/dateRanges';

interface HourEntry {
  hour: string;
  active: number;
}

interface PeakHoursChartProps {
  data: HourEntry[];
}

export default function PeakHoursChart({ data }: PeakHoursChartProps) {
  const peak = findPeakHour(data);

  const chartData = data.map((d) => ({
    ...d,
    label: d.hour.replace(':00', 'h'),
  }));

  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h3 className="dashboard-card__title">Horarios más solicitados</h3>
          <p className="dashboard-card__desc">Citas activas según la hora de inicio</p>
        </div>
        {peak && (
          <span className="peak-badge" aria-label={`Hora pico: ${peak.hour}`}>
            Hora pico: {peak.hour}
          </span>
        )}
      </div>
      <div className="dashboard-chart" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 8, bottom: 4, left: 8 }}
            role="img"
            aria-label="Gráfico de horarios más solicitados"
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--color-line)',
                fontSize: 13,
              }}
              labelStyle={{ fontWeight: 600 }}
              formatter={(value) => [String(value), 'Citas']}
              wrapperStyle={{ outline: 'none' }}
            />
            <Bar
              dataKey="active"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
              tabIndex={0}
              aria-label="Citas por hora"
            >
              <LabelList
                dataKey="active"
                position="top"
                style={{ fontSize: 12, fontWeight: 600, fill: 'var(--color-ink)' }}
              />
              {chartData.map((entry) => (
                <Cell
                  key={entry.hour}
                  fill={peak && entry.hour === peak.hour ? 'var(--color-primary)' : 'var(--color-chart-2, #7DD3C7)'}
                  tabIndex={0}
                  aria-label={`${entry.hour}: ${entry.active} citas`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
