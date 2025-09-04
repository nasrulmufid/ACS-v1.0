import type { ReactNode } from "react";

export default function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
      {children}
    </th>
  );
}