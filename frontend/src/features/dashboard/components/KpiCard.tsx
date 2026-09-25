export function KpiCard({ title, value, subtitle, icon, featured = false }: { title: string; value: string; subtitle?: string; icon: string; featured?: boolean }) {
  return (
    <article className={`min-h-36 rounded-2xl border p-5 shadow-sm ${featured ? "border-[#0F766E] bg-[#0F766E] text-white" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between"><span className="text-sm font-medium opacity-80">{title}</span><span aria-hidden="true" className="text-xl">{icon}</span></div>
      <p className="mt-4 text-3xl font-bold">{value}</p>
      {subtitle ? <p className="mt-1 text-sm opacity-75">{subtitle}</p> : null}
    </article>
  );
}
