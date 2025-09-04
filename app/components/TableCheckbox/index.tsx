"use client";
import * as Checkbox from "@radix-ui/react-checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";

export default function TableCheckbox({
  checked,
  onCheckedChange,
  ariaLabel,
}: {
  checked: CheckedState;
  onCheckedChange: (value: CheckedState) => void;
  ariaLabel?: string;
}) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className="h-5 w-5 rounded-md border border-foreground/30 bg-background data-[state=checked]:bg-primary/80 data-[state=indeterminate]:bg-primary/60 data-[state=checked]:border-primary/50 data-[state=indeterminate]:border-primary/50 grid place-items-center shadow-sm"
    >
      <Checkbox.Indicator>
        <CheckIcon className="h-3.5 w-3.5 text-background" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}