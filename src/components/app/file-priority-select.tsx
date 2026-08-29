"use client";

import {
  ChevronsDown,
  ChevronsUp,
  CircleSlash,
  Equal,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FILE_PRIORITY_OPTIONS,
  canonicalizeFilePriority,
  type CanonicalFilePriority,
} from "@/lib/deluge/files-tree";
import { cn } from "@/lib/utils";

const PRIORITY_ICONS = {
  0: CircleSlash,
  1: ChevronsDown,
  4: Minus,
  7: ChevronsUp,
} as const satisfies Record<CanonicalFilePriority, LucideIcon>;

/** Compact control labels (Skip / Low / Normal / High). */
const PRIORITY_NAMES = {
  0: "Skip",
  1: "Low",
  4: "Normal",
  7: "High",
} as const satisfies Record<CanonicalFilePriority, string>;

export function filePriorityPresentation(value: string | number, mixed = false) {
  if (mixed) {
    return { key: "mixed", label: "Mixed", Icon: Equal };
  }
  const priority = canonicalizeFilePriority(Number(value));
  return {
    key: String(priority),
    label: PRIORITY_NAMES[priority],
    Icon: PRIORITY_ICONS[priority],
  };
}

export function FilePrioritySelect({
  value,
  mixed,
  onChange,
  className,
  disabled,
}: {
  value: string | number;
  mixed?: boolean;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}) {
  const current = filePriorityPresentation(value, mixed);
  const CurrentIcon = current.Icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            className={cn("shrink-0 text-muted-foreground", className)}
            aria-label={`Priority: ${current.label}`}
            title={current.label}
          />
        }
      >
        <CurrentIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuRadioGroup
          value={mixed ? "" : current.key}
          onValueChange={(next) => {
            if (next == null || next === "" || next === "mixed") return;
            onChange(Number(next));
          }}
        >
          {FILE_PRIORITY_OPTIONS.map((opt) => {
            const ItemIcon = PRIORITY_ICONS[opt.value];
            return (
              <DropdownMenuRadioItem key={opt.value} value={String(opt.value)}>
                <ItemIcon />
                {PRIORITY_NAMES[opt.value]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
