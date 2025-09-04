import type { TdHTMLAttributes } from "react";

// Accept all standard <td> props (onClick, colSpan, className, etc.)
export default function Td({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 align-middle ${className ?? ""}`} {...rest}>
      {children}
    </td>
  );
}