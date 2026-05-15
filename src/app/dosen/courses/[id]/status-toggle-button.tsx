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
        "inline-flex h-7 shrink-0 items-center gap-2 rounded-lg border px-2 text-xs font-medium transition-colors",
        active
          ? "border-brand/40 bg-brand/10 text-foreground hover:bg-brand/15"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-7 items-center rounded-full p-0.5 transition-colors",
          active ? "bg-brand" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "size-3 rounded-full bg-background shadow-sm transition-transform",
            active && "translate-x-3"
          )}
        />
      </span>
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
