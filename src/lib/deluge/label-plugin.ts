/** Deluge daemon error when a plugin RPC is not registered. */
export const UNKNOWN_METHOD = "Unknown method";

export const LABEL_PLUGIN_ENABLE_HINT =
  "Enable the Label plugin in Preferences → Plugins";

/** Official Label plugin RPC methods (Deluge 2 `deluge_label.core`). */
export const LABEL_RPC = {
  getLabels: "label.get_labels",
  add: "label.add",
  remove: "label.remove",
  setTorrent: "label.set_torrent",
  getOptions: "label.get_options",
  setOptions: "label.set_options",
} as const;

export function enabledPluginNames(source: unknown): string[] {
  if (Array.isArray(source)) return source.map(String);
  if (source && typeof source === "object") {
    const rec = source as Record<string, unknown>;
    const list = rec.enabled_plugins ?? rec.enabledPlugins;
    if (Array.isArray(list)) return list.map(String);
  }
  return [];
}

export function isPluginEnabled(plugins: unknown, name: string): boolean {
  const target = name.toLowerCase();
  return enabledPluginNames(plugins).some((plugin) => plugin.toLowerCase() === target);
}

export function isLabelPluginEnabled(plugins: unknown): boolean {
  return isPluginEnabled(plugins, "Label");
}

export function isUnknownMethodMessage(message: string): boolean {
  return /unknown method/i.test(message);
}

export function labelRpcErrorMessage(err: unknown, fallback = "Could not update labels"): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (isUnknownMethodMessage(raw) || /plugin not enabled/i.test(raw)) {
    return LABEL_PLUGIN_ENABLE_HINT;
  }
  return raw.trim() || fallback;
}

/** Deluge Label ids: lowercase `[a-z0-9_.-]+` after trim. */
const LABEL_ID_RE = /^[a-z0-9_.-]+$/;

export function normalizeLabelId(raw: string): string {
  return raw.trim().toLowerCase();
}

export function invalidLabelIdMessage(labelId: string): string | null {
  if (!labelId) return "Empty label";
  if (!LABEL_ID_RE.test(labelId)) {
    return "Invalid label, valid characters: [a-z0-9_-.]";
  }
  return null;
}
