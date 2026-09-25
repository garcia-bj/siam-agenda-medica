import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-[#0F766E]">SIAM</Link>
        <nav aria-label="Navegación principal" className="flex items-center gap-1 text-sm font-medium">
          <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/">Agendar cita</Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/citas">Citas</Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/dashboard">Dashboard</Link>
        </nav>
      </div>
    </header>
  );
}
