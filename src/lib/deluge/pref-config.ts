export function hasConfigKey(cfg: Record<string, unknown> | null | undefined, key: string): boolean {
  return Boolean(cfg && Object.prototype.hasOwnProperty.call(cfg, key));
}

export function asBool(value: unknown): boolean {
  return value === true || value === 1;
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value);
}

export function asPortPair(value: unknown, fallback: [number, number] = [0, 0]): [number, number] {
  if (Array.isArray(value) && value.length >= 2) {
    return [asNumber(value[0], fallback[0]), asNumber(value[1], fallback[1])];
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return [value, value];
  }
  return fallback;
}

export function cloneConfig<T>(value: T): T {
  return structuredClone(value);
}

function equalValues(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return a === b;
  if (typeof a !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** Keys in `current` whose values differ from `original` (shallow keys, deep values). */
export function dirtyConfig(
  original: Record<string, unknown>,
  current: Record<string, unknown>
): Record<string, unknown> {
  const dirty: Record<string, unknown> = {};
  for (const key of Object.keys(current)) {
    if (!equalValues(original[key], current[key])) dirty[key] = current[key];
  }
  return dirty;
}

export function isEmptyConfig(cfg: Record<string, unknown>): boolean {
  return Object.keys(cfg).length === 0;
}

export function proxyRecord(core: Record<string, unknown>): Record<string, unknown> {
  const proxy = core.proxy;
  if (proxy && typeof proxy === "object" && !Array.isArray(proxy)) {
    return proxy as Record<string, unknown>;
  }
  return {};
}
