import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";

export default function ThSortable({
  label,
  onClick,
  active,
  direction,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  direction?: "asc" | "desc";
}) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide select-none">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded px-2 py-1 -mx-2 -my-1 hover:bg-foreground/[.06] transition ${
          active ? "text-foreground" : "text-foreground/70"
        }`}
        aria-label={`Urutkan berdasarkan ${label}`}
      >
        <span>{label}</span>
        {active ? (
          direction === "asc" ? (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          )
        ) : (
          <span className="inline-block h-3 w-3" />
        )}
      </button>
    </th>
  );
}