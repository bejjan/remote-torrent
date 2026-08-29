"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FILE_PRIORITY_ICONS,
  FILE_PRIORITY_NAMES,
  filePriorityPresentation,
} from "@/components/app/file-priority-presentation";
import { FILE_PRIORITY_OPTIONS } from "@/lib/deluge/files-tree";
import { cn } from "@/lib/utils";

export { filePriorityPresentation } from "@/components/app/file-priority-presentation";

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
            variant="outline"
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
            const ItemIcon = FILE_PRIORITY_ICONS[opt.value];
            return (
              <DropdownMenuRadioItem key={opt.value} value={String(opt.value)}>
                <ItemIcon />
                {FILE_PRIORITY_NAMES[opt.value]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
