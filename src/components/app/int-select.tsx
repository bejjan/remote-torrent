"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type IntSelectOption = { value: number; label: string };
type StringSelectOption = { id: string; label: string };

export function IntSelect({
  value,
  onChange,
  options,
  items,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  options: readonly IntSelectOption[];
  items: Record<string, string>;
  className?: string;
}) {
  const allowed = new Set(options.map((opt) => opt.value));
  const fallback = options[0] ? options[0].value : 0;
  const selected = allowed.has(value) ? value : fallback;
  return (
    <Select
      value={String(selected)}
      items={items}
      onValueChange={(v) => {
        if (v == null) return;
        onChange(Number(v));
      }}
    >
      <SelectTrigger className={className ?? "w-40"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StringSelect({
  value,
  onChange,
  options,
  items,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly StringSelectOption[];
  items: Record<string, string>;
  className?: string;
}) {
  const allowed = new Set(options.map((opt) => opt.id));
  const fallback = options[0] ? options[0].id : "";
  const selected = allowed.has(value) ? value : fallback;
  return (
    <Select
      value={selected}
      items={items}
      onValueChange={(v) => {
        if (v == null) return;
        onChange(String(v));
      }}
    >
      <SelectTrigger className={className ?? "w-56"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id || "system"} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
