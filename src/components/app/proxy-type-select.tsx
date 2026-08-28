"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROXY_TYPE_OPTIONS,
  PROXY_TYPE_SELECT_ITEMS,
  canonicalizeProxyType,
} from "@/lib/deluge/proxy-type";

export function ProxyTypeSelect({
  value,
  onChange,
  className,
}: {
  value: string | number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const selected = String(canonicalizeProxyType(Number(value)));
  return (
    <Select
      value={selected}
      items={PROXY_TYPE_SELECT_ITEMS}
      onValueChange={(v) => {
        if (v == null) return;
        onChange(canonicalizeProxyType(Number(v)));
      }}
    >
      <SelectTrigger className={className ?? "w-full"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROXY_TYPE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
