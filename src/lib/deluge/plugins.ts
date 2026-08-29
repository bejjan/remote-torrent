/** Official Deluge core/web plugin RPC methods. */
export const PLUGIN_RPC = {
  enable: "core.enable_plugin",
  disable: "core.disable_plugin",
  getAvailable: "core.get_available_plugins",
  getEnabled: "core.get_enabled_plugins",
  webGetPlugins: "web.get_plugins",
} as const;

export function pluginToggleMethod(enable: boolean): string {
  return enable ? PLUGIN_RPC.enable : PLUGIN_RPC.disable;
}

/**
 * Live deluge-web often returns exactly "Unknown method" with no RPC name.
 * Append the method that was called so the toast is actionable.
 */
export function formatUnknownMethodMessage(method: string, message: string, fallback = "RPC error"): string {
  const trimmed = message.trim() || fallback;
  if (/^unknown method$/i.test(trimmed)) return `${trimmed}: ${method}`;
  return trimmed;
}

export function pluginToggleErrorMessage(method: string, err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  return formatUnknownMethodMessage(method, raw, "Plugin toggle failed");
}
