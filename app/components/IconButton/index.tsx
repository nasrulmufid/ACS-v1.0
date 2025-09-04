import type { ReactNode } from "react";

export default function IconButton({
  children,
  title,
  onClick,
  intent = "neutral",
}: {
  children: ReactNode;
  title: string;
  onClick?: () => void;
  intent?: "neutral" | "warning" | "danger";
}) {
  const styles =
    intent === "danger"
      ? "border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
      : intent === "warning"
      ? "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
      : "border-foreground/20 text-foreground hover:bg-foreground/[.06]";

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-grid place-items-center h-8 w-8 rounded-lg border transition ${styles}`}
    >
      {children}
    </button>
  );
}