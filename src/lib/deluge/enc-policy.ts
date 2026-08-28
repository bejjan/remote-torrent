/** Official Deluge `enc_in_policy` / `enc_out_policy` (libtorrent). */
export const ENC_POLICY_OPTIONS = [
  { value: 0, label: "Forced" },
  { value: 1, label: "Enabled" },
  { value: 2, label: "Disabled" },
] as const;

/** Official Deluge `enc_level`. */
export const ENC_LEVEL_OPTIONS = [
  { value: 0, label: "Handshake" },
  { value: 1, label: "Full stream" },
  { value: 2, label: "Either" },
] as const;

export type EncPolicy = (typeof ENC_POLICY_OPTIONS)[number]["value"];
export type EncLevel = (typeof ENC_LEVEL_OPTIONS)[number]["value"];

/** Base UI Select `items` map: value → displayed label (never the raw int). */
export const ENC_POLICY_SELECT_ITEMS: Record<string, string> = Object.fromEntries(
  ENC_POLICY_OPTIONS.map((opt) => [String(opt.value), opt.label])
);

export const ENC_LEVEL_SELECT_ITEMS: Record<string, string> = Object.fromEntries(
  ENC_LEVEL_OPTIONS.map((opt) => [String(opt.value), opt.label])
);

export const DEFAULT_ENC_POLICY = 1;
export const DEFAULT_ENC_LEVEL = 2;

function canonicalizeIntOption<T extends number>(
  value: number,
  options: readonly { value: T }[],
  fallback: T
): T {
  if (!Number.isFinite(value)) return fallback;
  const truncated = Math.trunc(value) as T;
  return options.some((opt) => opt.value === truncated) ? truncated : fallback;
}

export function canonicalizeEncPolicy(value: number): EncPolicy {
  return canonicalizeIntOption(value, ENC_POLICY_OPTIONS, DEFAULT_ENC_POLICY);
}

export function canonicalizeEncLevel(value: number): EncLevel {
  return canonicalizeIntOption(value, ENC_LEVEL_OPTIONS, DEFAULT_ENC_LEVEL);
}

export function encPolicyLabel(value: number): string {
  const policy = canonicalizeEncPolicy(value);
  return ENC_POLICY_OPTIONS.find((opt) => opt.value === policy)?.label ?? "Enabled";
}

export function encLevelLabel(value: number): string {
  const level = canonicalizeEncLevel(value);
  return ENC_LEVEL_OPTIONS.find((opt) => opt.value === level)?.label ?? "Either";
}
