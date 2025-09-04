import type { ElementType } from "react";

export default function StatCard({
  title,
  value,
  subtitle,
  intent = "neutral",
  Icon,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  intent?: "success" | "danger" | "neutral";
  Icon: ElementType;
}) {
  const color =
    intent === "success"
      ? "from-emerald-500/20 to-emerald-500/0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
      : intent === "danger"
      ? "from-rose-500/20 to-rose-500/0 border-rose-500/30 text-rose-600 dark:text-rose-400"
      : "from-indigo-500/20 to-indigo-500/0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400";

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-background/60 p-5 sm:p-6 ${color}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${color} pointer-events-none`} />
      <div className="relative flex items-center gap-4">
        <div className="grid place-items-center h-12 w-12 rounded-xl bg-foreground/[.06]">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-foreground/60">{title}</p>
          <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-foreground/50 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}