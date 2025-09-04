import type { ReactNode } from "react";

export default function ActionButton({
  children,
  title,
  onClick,
  disabled,
  intent = "neutral",
}: {
  children: ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  intent?: "neutral" | "warning" | "danger";
}) {
  const styles =
    intent === "danger"
      ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
      : intent === "warning"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
      : "bg-foreground/[.04] border-foreground/20 text-foreground hover:bg-foreground/[.08]";

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${styles}`}
    >
      {children}
    </button>
  );
}