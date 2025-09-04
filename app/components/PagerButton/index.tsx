import type { ReactNode } from "react";

export default function PagerButton({ children, title, onClick, disabled }: {
  children: ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-grid place-items-center h-8 w-8 rounded-lg border border-foreground/20 text-foreground transition hover:bg-foreground/[.06] disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}