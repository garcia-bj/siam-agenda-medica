export function StatusMessage({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="font-semibold text-slate-800">{title}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
