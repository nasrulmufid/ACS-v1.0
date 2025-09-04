import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";

export type Status = "online" | "offline";

export default function StatusBadge({ status }: { status: Status }) {
  const isOnline = status === "online";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
        isOnline
          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          : "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
      }`}
    >
      {isOnline ? (
        <CheckCircledIcon className="h-4 w-4" />
      ) : (
        <CrossCircledIcon className="h-4 w-4" />
      )}
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}