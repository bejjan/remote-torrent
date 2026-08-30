"use client";

import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { asNumber } from "@/lib/deluge/pref-config";
import { cn } from "@/lib/utils";

export const PREF_DIALOG_SPLIT_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:flex-row";

export const PREF_DIALOG_NAV_CLASS =
  "flex shrink-0 gap-1 overflow-x-auto overscroll-x-contain border-b p-2 sm:w-48 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:border-r sm:border-b-0";

export const PREF_DIALOG_PAGE_CLASS = "@container min-w-0 px-4 py-4 sm:px-5 sm:py-5";

export function prefNavButtonClass(active: boolean) {
  return cn(
    "flex w-auto shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap sm:w-full",
    active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
  );
}

export function PrefPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="@container grid min-w-0 gap-7">
      <header className="grid gap-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}

export function PrefSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-2">
      {title || description ? (
        <div className="grid gap-0.5 px-0.5">
          {title ? <h4 className="text-[13px] font-medium">{title}</h4> : null}
          {description ? <p className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <div className="divide-y overflow-hidden rounded-xl border bg-card/70">{children}</div>
    </section>
  );
}

export function PrefRow({
  label,
  description,
  children,
  disabled,
  align = "center",
}: {
  label: string;
  description?: string;
  children: ReactNode;
  disabled?: boolean;
  align?: "center" | "start";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-2 px-3.5 py-3 @min-[32rem]:flex-row @min-[32rem]:justify-between @min-[32rem]:gap-6",
        align === "start" ? "@min-[32rem]:items-start" : "@min-[32rem]:items-center",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex w-full min-w-0 items-center justify-start @min-[32rem]:w-auto @min-[32rem]:shrink-0 @min-[32rem]:justify-end">
        {children}
      </div>
    </div>
  );
}

export function PrefSwitch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3 @min-[32rem]:gap-6",
        disabled && "pointer-events-none cursor-not-allowed opacity-50"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <Switch
        checked={checked === true}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
      />
    </label>
  );
}

export function PrefPath({
  label,
  description,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  mono,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <PrefRow label={label} description={description} disabled={disabled}>
      <Input
        type={type}
        placeholder={placeholder}
        className={cn("w-full min-w-0 @min-[32rem]:w-72", mono && "font-mono text-sm")}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </PrefRow>
  );
}

export function PrefNum({
  label,
  description,
  value,
  onChange,
  suffix,
  disabled,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <PrefRow label={label} description={description} disabled={disabled}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Input
          type="number"
          className="w-full max-w-28"
          disabled={disabled}
          value={Number.isFinite(value) ? String(value) : ""}
          onChange={(e) => onChange(asNumber(e.target.value, value))}
        />
        {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
    </PrefRow>
  );
}

export function PrefNumPair({
  label,
  description,
  from,
  to,
  onFrom,
  onTo,
  disabled,
  fromLabel = "From",
  toLabel = "To",
}: {
  label: string;
  description?: string;
  from: number;
  to: number;
  onFrom: (value: number) => void;
  onTo: (value: number) => void;
  disabled?: boolean;
  fromLabel?: string;
  toLabel?: string;
}) {
  return (
    <PrefRow label={label} description={description} disabled={disabled}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Input
          type="number"
          aria-label={fromLabel}
          className="w-full max-w-28"
          disabled={disabled}
          value={Number.isFinite(from) ? String(from) : ""}
          onChange={(e) => onFrom(asNumber(e.target.value, from))}
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="number"
          aria-label={toLabel}
          className="w-full max-w-28"
          disabled={disabled}
          value={Number.isFinite(to) ? String(to) : ""}
          onChange={(e) => onTo(asNumber(e.target.value, to))}
        />
      </div>
    </PrefRow>
  );
}

export function PrefActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 pt-1">{children}</div>;
}
