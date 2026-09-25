"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { MetricsSummary } from "@/types/api";
import { calculatePeakHour } from "@/lib/utils/peakHour";
export function PeakHoursChart({ data }: { data: MetricsSummary["byHour"] }) {
  const peak = calculatePeakHour(data);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-base font-semibold">Horarios más solicitados</h2><ResponsiveContainer width="100%" height={280}><BarChart data={data}><CartesianGrid vertical={false} /><XAxis dataKey="hour" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="active" name="Citas" radius={[5, 5, 0, 0]}>{data.map((entry) => <Cell key={entry.hour} fill={entry.hour === peak?.hour ? "#0F766E" : "#99A3A3"} /></Bar></BarChart></ResponsiveContainer>{peak ? <p className="mt-2 text-sm text-slate-600">Hora pico: <strong>{peak.hour}</strong> · {peak.count} citas</p> : null}</section>;
}
