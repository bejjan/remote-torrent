import { isUnknownMethodMessage } from "./label-plugin";
import { isLtConfigPlugin, pluginNameKey } from "./plugin-pages";

const GET_NAMES = ["get_settings", "get_config", "get_preferences", "get_lt_settings"] as const;
const SET_NAMES = ["set_preferences", "set_settings", "set_config"] as const;

export function ltConfigRpcPrefixes(pluginName: string): string[] {
  const fromName = pluginNameKey(pluginName);
  const out: string[] = [];
  for (const prefix of [fromName, "ltconfig", "itconfig"]) {
    if (prefix && !out.includes(prefix)) out.push(prefix);
  }
  return out;
}

export function ltConfigGetMethods(pluginName: string): string[] {
  return ltConfigRpcPrefixes(pluginName).flatMap((prefix) => GET_NAMES.map((name) => `${prefix}.${name}`));
}

export function ltConfigSetMethods(pluginName: string, getMethod?: string): string[] {
  const prefixes = getMethod
    ? [pluginNameKey(getMethod.split(".")[0] || ""), ...ltConfigRpcPrefixes(pluginName)]
    : ltConfigRpcPrefixes(pluginName);
  const uniquePrefixes: string[] = [];
  for (const prefix of prefixes) {
    if (prefix && !uniquePrefixes.includes(prefix)) uniquePrefixes.push(prefix);
  }
  return uniquePrefixes.flatMap((prefix) => SET_NAMES.map((name) => `${prefix}.${name}`));
}

export function parseLtConfigPayload(result: unknown): {
  settings: Record<string, unknown>;
  applyOnStart?: boolean;
} | null {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const rec = result as Record<string, unknown>;
  if ("settings" in rec && rec.settings && typeof rec.settings === "object" && !Array.isArray(rec.settings)) {
    const applyOnStart =
      typeof rec.apply_on_start === "boolean"
        ? rec.apply_on_start
        : typeof rec.applyOnStart === "boolean"
          ? rec.applyOnStart
          : undefined;
    return { settings: rec.settings as Record<string, unknown>, applyOnStart };
  }
  return { settings: rec };
}

export function isUnknownMethodError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return isUnknownMethodMessage(msg);
}

export type LtConfigLoadResult =
  | {
      ok: true;
      settings: Record<string, unknown>;
      applyOnStart: boolean;
      getMethod: string;
      setMethods: string[];
    }
  | { ok: false };

export async function loadLtConfig(
  call: (method: string, params?: unknown[]) => Promise<unknown>,
  pluginName: string
): Promise<LtConfigLoadResult> {
  let best: {
    method: string;
    settings: Record<string, unknown>;
    applyOnStart: boolean;
    size: number;
  } | null = null;

  for (const method of ltConfigGetMethods(pluginName)) {
    try {
      const parsed = parseLtConfigPayload(await call(method));
      if (!parsed) continue;
      const size = Object.keys(parsed.settings).length;
      if (!best) {
        best = {
          method,
          settings: parsed.settings,
          applyOnStart: parsed.applyOnStart ?? false,
          size,
        };
        continue;
      }
      if (parsed.applyOnStart != null) best.applyOnStart = parsed.applyOnStart;
      if (size > best.size) {
        best.method = method;
        best.settings = parsed.settings;
        best.size = size;
      }
    } catch (err) {
      if (isUnknownMethodError(err)) continue;
      throw err;
    }
  }

  if (!best) return { ok: false };
  return {
    ok: true,
    settings: best.settings,
    applyOnStart: best.applyOnStart,
    getMethod: best.method,
    setMethods: ltConfigSetMethods(pluginName, best.method),
  };
}

export function payloadForLtConfigSet(
  method: string,
  settings: Record<string, unknown>,
  applyOnStart: boolean
): unknown[] {
  if (method.endsWith(".set_preferences")) {
    return [{ apply_on_start: applyOnStart, settings }];
  }
  return [settings];
}

export async function saveLtConfig(
  call: (method: string, params?: unknown[]) => Promise<unknown>,
  setMethods: string[],
  settings: Record<string, unknown>,
  applyOnStart: boolean
): Promise<string> {
  let lastUnknown: Error | null = null;
  for (const method of setMethods) {
    try {
      await call(method, payloadForLtConfigSet(method, settings, applyOnStart));
      return method;
    } catch (err) {
      if (isUnknownMethodError(err)) {
        lastUnknown = err instanceof Error ? err : new Error(String(err));
        continue;
      }
      throw err;
    }
  }
  throw lastUnknown ?? new Error("Unknown method");
}

export function ltConfigPluginEnabled(enabled: readonly string[]): boolean {
  return enabled.some((name) => isLtConfigPlugin(name));
}
