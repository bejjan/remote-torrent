/** First-party plugin preference pages this UI implements. */
export const FIRST_PARTY_PLUGIN_PAGES = [
  { id: "label", label: "Label", plugin: "Label" },
  { id: "scheduler", label: "Scheduler", plugin: "Scheduler" },
  { id: "extractor", label: "Extractor", plugin: "Extractor" },
  { id: "execute", label: "Execute", plugin: "Execute" },
  { id: "notifications", label: "Notifications", plugin: "Notifications" },
  { id: "blocklist", label: "Blocklist", plugin: "Blocklist" },
  { id: "autoadd", label: "AutoAdd", plugin: "AutoAdd" },
] as const;

export const LTCONFIG_PAGE_ID = "ltconfig";

export const PLUGIN_STUB_NOTE = "This UI doesn’t load the GTK/ExtJS form.";

export const LTCONFIG_CORE_KEYS = [
  "max_connections_global",
  "max_connections_per_torrent",
  "max_upload_slots_global",
  "max_upload_slots_per_torrent",
  "max_download_speed",
  "max_upload_speed",
  "max_half_open_connections",
  "cache_size",
  "cache_expiry",
  "dht",
  "lsd",
  "utpex",
  "upnp",
  "natpmp",
  "rate_limit_ip_overhead",
  "ignore_limits_on_local_network",
] as const;

export function pluginNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function pluginNamesEqual(a: string, b: string): boolean {
  return pluginNameKey(a) === pluginNameKey(b);
}

/**
 * ltConfig is often misread as ItConfig (lowercase L vs capital I).
 * Match both so routing still opens the libtorrent page.
 */
export function isLtConfigPlugin(name: string): boolean {
  const key = pluginNameKey(name).replace(/[^a-z0-9]/g, "");
  return key === "ltconfig" || key === "itconfig";
}

export type PluginNavKind = "first-party" | "ltconfig" | "unknown";

export type PluginNavItem = {
  id: string;
  label: string;
  plugin: string;
  kind: PluginNavKind;
};

export function unknownPluginPageId(name: string): string {
  return `plugin:${pluginNameKey(name)}`;
}

export function isUnknownPluginPage(page: string): boolean {
  return page.startsWith("plugin:");
}

function navDedupeKey(name: string): string {
  if (isLtConfigPlugin(name)) return LTCONFIG_PAGE_ID;
  return pluginNameKey(name);
}

/** Sidebar plugin section: every enabled plugin, using daemon-reported names. */
export function pluginPrefNavItems(enabled: readonly string[]): PluginNavItem[] {
  const seen = new Set<string>();
  const items: PluginNavItem[] = [];
  for (const raw of enabled) {
    const name = String(raw ?? "").trim();
    if (!name) continue;
    const key = navDedupeKey(name);
    if (seen.has(key)) continue;
    seen.add(key);

    const first = FIRST_PARTY_PLUGIN_PAGES.find((p) => pluginNamesEqual(p.plugin, name));
    if (first) {
      items.push({ id: first.id, label: first.label, plugin: name, kind: "first-party" });
      continue;
    }
    if (isLtConfigPlugin(name)) {
      items.push({ id: LTCONFIG_PAGE_ID, label: name, plugin: name, kind: "ltconfig" });
      continue;
    }
    items.push({ id: unknownPluginPageId(name), label: name, plugin: name, kind: "unknown" });
  }
  return items;
}

export function pluginNavItemForPage(
  items: readonly PluginNavItem[],
  page: string
): PluginNavItem | undefined {
  return items.find((item) => item.id === page);
}

export function relatedCoreConfigEntries(
  pluginName: string,
  core: Record<string, unknown>,
  extraKeys: readonly string[] = []
): [string, unknown][] {
  const needle = pluginNameKey(pluginName).replace(/[^a-z0-9]/g, "");
  const extra = new Set(extraKeys.map((k) => k.toLowerCase()));
  const out: [string, unknown][] = [];
  const seen = new Set<string>();
  for (const [k, v] of Object.entries(core)) {
    const key = k.toLowerCase();
    const compact = key.replace(/[^a-z0-9]/g, "");
    const match =
      extra.has(key) || (needle.length > 0 && (compact.includes(needle) || needle.includes(compact)));
    if (!match || seen.has(key)) continue;
    seen.add(key);
    out.push([k, v]);
  }
  return out.sort(([a], [b]) => a.localeCompare(b));
}
