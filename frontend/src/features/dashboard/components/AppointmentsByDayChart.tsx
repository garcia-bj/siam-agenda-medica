"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricsSummary } from "@/types/api";

export function AppointmentsByDayChart({ data }: { data: MetricsSummary["byDay"] }) {
  const chart = data.map((d) => ({ ...d, day: new Date(`${d.date}T12:00:00`).toLocaleDateString("es-BO", { weekday: "short", day: "2-digit" }) }));
  return <ChartCard title="Citas por día"><ResponsiveContainer width="100%" height={280}><BarChart data={chart}><CartesianGrid vertical={false} /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="active" name="Activas" fill="#0F766E" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-base font-semibold">{title}</h2>{children}</section>; }
