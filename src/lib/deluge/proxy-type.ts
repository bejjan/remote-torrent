/** Official Deluge `proxy.type` (libtorrent/session). */
export const PROXY_TYPE_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "Socksv4" },
  { value: 2, label: "Socksv5" },
  { value: 3, label: "Socksv5 with Auth" },
  { value: 4, label: "HTTP" },
  { value: 5, label: "HTTP with Auth" },
] as const;

export type ProxyType = (typeof PROXY_TYPE_OPTIONS)[number]["value"];

/** Base UI Select `items` map: value → displayed label (never the raw number). */
export const PROXY_TYPE_SELECT_ITEMS: Record<string, string> = Object.fromEntries(
  PROXY_TYPE_OPTIONS.map((opt) => [String(opt.value), opt.label])
);

export const DEFAULT_PROXY_TYPE = 0;

export function canonicalizeProxyType(type: number): ProxyType {
  if (!Number.isFinite(type)) return DEFAULT_PROXY_TYPE;
  const value = Math.trunc(type);
  if (value >= 0 && value <= 5) return value as ProxyType;
  return DEFAULT_PROXY_TYPE;
}

export function proxyTypeLabel(type: number): string {
  const value = canonicalizeProxyType(type);
  return PROXY_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? "None";
}
