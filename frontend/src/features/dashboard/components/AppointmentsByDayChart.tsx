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

interface DayEntry {
  date: string;
  active: number;
  cancelled: number;
}

interface AppointmentsByDayChartProps {
  data: DayEntry[];
}

function shortDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const dayName = d.toLocaleDateString('es', { weekday: 'short', timeZone: 'UTC' });
  const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', '');
  return `${capitalized} ${d.getUTCDate()}`;
}

export default function AppointmentsByDayChart({ data }: AppointmentsByDayChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: shortDayLabel(d.date),
  }));

  const maxActive = Math.max(...chartData.map((d) => d.active), 0);

  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header">
        <h3 className="dashboard-card__title">Citas por día</h3>
        <p className="dashboard-card__desc">Citas activas por día hábil</p>
      </div>
      <div className="dashboard-chart" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 8, bottom: 4, left: -16 }}
            role="img"
            aria-label="Gráfico de citas por día"
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 13, fill: 'var(--color-muted)' }}
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
              formatter={(value) => [String(value), 'Citas activas']}
              wrapperStyle={{ outline: 'none' }}
            />
            <Bar
              dataKey="active"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              tabIndex={0}
              aria-label="Citas activas por día"
            >
              <LabelList
                dataKey="active"
                position="top"
                style={{ fontSize: 13, fontWeight: 600, fill: 'var(--color-ink)' }}
              />
              {chartData.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.active === maxActive ? 'var(--color-primary)' : 'var(--color-chart-2, #7DD3C7)'}
                  tabIndex={0}
                  aria-label={`${entry.label}: ${entry.active} citas activas`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
