"use client";

import type { Specialty } from "@/types/api";

export type RangeMode = "week" | "month" | "custom";

export function DateRangeFilter({
  mode, from, to, specialty, onChange,
}: {
  mode: RangeMode; from: string; to: string; specialty: Specialty | "ALL";
  onChange: (value: { mode: RangeMode; from: string; to: string; specialty: Specialty | "ALL" }) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_auto_auto_1fr_1fr_1fr] lg:items-end">
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
          <input type="radio" checked={mode === "week"} onChange={() => onChange({ mode: "week", from, to, specialty })} /> Esta semana
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
          <input type="radio" checked={mode === "month"} onChange={() => onChange({ mode: "month", from, to, specialty })} /> Este mes
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
          <input type="radio" checked={mode === "custom"} onChange={() => onChange({ mode: "custom", from, to, specialty })} /> Personalizado
        </label>
        <label className="text-sm font-medium">Desde<input aria-label="Fecha desde" type="date" disabled={mode !== "custom"} value={from} onChange={(e) => onChange({ mode, from: e.target.value, to, specialty })} className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
        <label className="text-sm font-medium">Hasta<input aria-label="Fecha hasta" type="date" disabled={mode !== "custom"} value={to} onChange={(e) => onChange({ mode, from, to: e.target.value, specialty })} className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
        <label className="text-sm font-medium">Especialidad<select aria-label="Especialidad" value={specialty} onChange={(e) => onChange({ mode, from, to, specialty: e.target.value as Specialty | "ALL" })} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="ALL">Todas</option><option value="MEDICINA_GENERAL">Medicina general</option><option value="PEDIATRIA">Pediatría</option><option value="CARDIOLOGIA">Cardiología</option><option value="DERMATOLOGIA">Dermatología</option></select></label>
      </div>
    </section>
  );
}
