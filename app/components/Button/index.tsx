import type { ReactNode } from "react";

export default function Button({ children, onClick, intent = "neutral", variant = "solid", type = "button", disabled, className }: {
  children: ReactNode;
  onClick?: () => void;
  intent?: "neutral" | "warning" | "danger";
  variant?: "solid" | "ghost";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}) {
  const base = "h-9 px-3 rounded-lg text-sm font-medium transition";
  const map: Record<string, string> = {
    neutral_solid: "bg-foreground/[.06] text-foreground border border-foreground/20 hover:bg-foreground/[.1]",
    neutral_ghost: "text-foreground hover:bg-foreground/[.06]",
    warning_solid: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20",
    warning_ghost: "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
    danger_solid: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20",
    danger_ghost: "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10",
  };
  const cls = map[`${intent}_${variant}`] ?? map.neutral_solid;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${cls} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}>
      {children}
    </button>
  );
}