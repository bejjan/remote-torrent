"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FILE_PRIORITY_OPTIONS,
  FILE_PRIORITY_SELECT_ITEMS,
  canonicalizeFilePriority,
} from "@/lib/deluge/files-tree";

export function FilePrioritySelect({
  value,
  mixed,
  onChange,
  className,
}: {
  value: string | number;
  mixed?: boolean;
  onChange: (value: number) => void;
  className?: string;
}) {
  const selected = mixed ? "mixed" : String(canonicalizeFilePriority(Number(value)));
  const items = mixed ? { mixed: "Mixed", ...FILE_PRIORITY_SELECT_ITEMS } : FILE_PRIORITY_SELECT_ITEMS;
  return (
    <Select
      value={selected}
      items={items}
      onValueChange={(v) => {
        if (v == null || v === "mixed") return;
        onChange(Number(v));
      }}
    >
      <SelectTrigger size="sm" className={className ?? "w-36"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {mixed ? (
          <SelectItem value="mixed" disabled>
            Mixed
          </SelectItem>
        ) : null}
        {FILE_PRIORITY_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
