import type { ReactNode } from "react";

export default function PagerNumber({ children, onClick, active }: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-8 px-2 h-8 rounded-lg border transition ${
        active
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-foreground/20 text-foreground hover:bg-foreground/[.06]"
      }`}
    >
      {children}
    </button>
  );
}