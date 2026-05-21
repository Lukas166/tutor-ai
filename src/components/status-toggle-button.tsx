"use client";

import { cn } from "@/lib/utils";

type StatusToggleButtonProps = {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
};

export function StatusToggleButton({
  active,
  onClick,
  disabled = false,
  activeLabel = "Aktif",
  inactiveLabel = "Nonaktif",
}: StatusToggleButtonProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted/30",
        active ? "text-foreground" : "text-muted-foreground",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
          active ? "bg-brand" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "size-4 rounded-full bg-background shadow-sm transition-transform",
            active && "translate-x-4"
          )}
        />
      </span>
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
