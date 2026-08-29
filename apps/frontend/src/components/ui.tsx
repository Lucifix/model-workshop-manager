import type { PropsWithChildren } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-workshop-panel p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-3xl font-semibold text-slate-50">{value}</span>
    </Card>
  );
}

export function Badge({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "warn" | "ok" }>) {
  const toneClass =
    tone === "warn"
      ? "bg-amber-500/15 text-amber-400"
      : tone === "ok"
        ? "bg-emerald-500/15 text-emerald-400"
        : "bg-slate-700/40 text-slate-300";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{children}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{message}</p>;
}

export function LoadingState() {
  return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
}

export function ErrorState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-red-400">{message}</p>;
}
