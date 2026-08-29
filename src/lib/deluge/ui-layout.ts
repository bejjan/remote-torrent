/** Browser-local layout for the filter sidebar, details panel, and torrent table columns. */

export const SIDEBAR_WIDTH_STORAGE_KEY = "deluge-nova:sidebar-width";
export const DETAILS_HEIGHT_STORAGE_KEY = "deluge-nova:details-height";
export const DETAILS_WIDTH_STORAGE_KEY = "deluge-nova:details-width";
export const DETAILS_DOCK_STORAGE_KEY = "deluge-nova:details-dock";
export const TORRENT_COLUMN_WIDTHS_STORAGE_KEY = "deluge-nova:torrent-column-widths";
/** Collapsed filter-sidebar group ids. Default is all expanded (empty set). */
export const SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY = "deluge-nova:sidebar-collapsed-groups";

/** Default collapsed set: none (every group starts expanded). */
export function emptyCollapsedGroups(): Set<string> {
  return new Set();
}

export const SELECT_COLUMN_ID = "select";

export const SIDEBAR_DEFAULT_WIDTH = 224;
export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 480;
/** Leave at least this much room for the torrent table when resizing the sidebar. */
export const MAIN_MIN_WIDTH = 360;

/** Matches the previous CSS default `min(16rem, 36vh)`. */
export const DETAILS_DEFAULT_HEIGHT = 256;
export const DETAILS_MIN_HEIGHT = 120;
export const DETAILS_MAX_VH = 0.7;
/** Fallback cap when viewport height is unknown (parse / SSR). */
export const DETAILS_ABS_MAX = 4096;
/** Leave at least this much room for the torrent table when resizing details. */
export const TABLE_MIN_HEIGHT = 160;

export type DetailsDock = "bottom" | "right";
export const DETAILS_DEFAULT_DOCK: DetailsDock = "bottom";
export const DETAILS_DEFAULT_WIDTH = 400;
export const DETAILS_MIN_WIDTH = 280;
/** Cap right-docked details at this fraction of the main (table + details) area. */
export const DETAILS_MAX_RATIO = 0.7;

export type DetailsDock = "bottom" | "right";
export const DETAILS_DEFAULT_DOCK: DetailsDock = "bottom";
export const DETAILS_DEFAULT_WIDTH = 360;
export const DETAILS_MIN_WIDTH = 280;
export const DETAILS_MAX_VW = 0.7;
/** Fallback cap when viewport width is unknown (parse / SSR). */
export const DETAILS_ABS_MAX_WIDTH = 4096;

export const COLUMN_MAX_WIDTH = 720;
export const COLUMN_MIN_WIDTH = 48;
export const SELECT_COLUMN_MIN_WIDTH = 32;
export const NAME_COLUMN_MIN_WIDTH = 96;
export const QUEUE_COLUMN_MIN_WIDTH = 36;

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  [SELECT_COLUMN_ID]: 36,
  queue: 44,
  name: 280,
  size: 88,
  progress: 148,
  status: 112,
  down: 88,
  up: 88,
  eta: 80,
  ratio: 64,
  seeds: 92,
  peers: 92,
  label: 96,
  avail: 72,
  added: 156,
  tracker: 140,
  save_path: 180,
  downloaded: 96,
  uploaded: 96,
  remaining: 96,
  complete_seen: 156,
  completed: 156,
  auto_managed: 108,
  down_limit: 96,
  up_limit: 96,
  seeds_peers: 92,
  last_transfer: 120,
};

export function defaultColumnWidth(id: string): number {
  return DEFAULT_COLUMN_WIDTHS[id] ?? 100;
}

export function minColumnWidth(id: string): number {
  if (id === SELECT_COLUMN_ID) return SELECT_COLUMN_MIN_WIDTH;
  if (id === "name") return NAME_COLUMN_MIN_WIDTH;
  if (id === "queue") return QUEUE_COLUMN_MIN_WIDTH;
  return COLUMN_MIN_WIDTH;
}

export function clampColumnWidth(width: number, id = ""): number {
  if (!Number.isFinite(width)) return defaultColumnWidth(id);
  const min = minColumnWidth(id);
  return Math.round(Math.min(COLUMN_MAX_WIDTH, Math.max(min, width)));
}

export function clampSidebarWidth(width: number, containerWidth?: number): number {
  if (!Number.isFinite(width)) return SIDEBAR_DEFAULT_WIDTH;
  let max = SIDEBAR_MAX_WIDTH;
  if (typeof containerWidth === "number" && Number.isFinite(containerWidth) && containerWidth > 0) {
    max = Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, containerWidth - MAIN_MIN_WIDTH));
  }
  return Math.round(Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, width)));
}

export function clampDetailsHeight(
  height: number,
  viewportHeight?: number,
  containerHeight?: number
): number {
  if (!Number.isFinite(height)) return DETAILS_DEFAULT_HEIGHT;
  let max = DETAILS_ABS_MAX;
  if (typeof viewportHeight === "number" && Number.isFinite(viewportHeight) && viewportHeight > 0) {
    max = Math.min(max, viewportHeight * DETAILS_MAX_VH);
  }
  if (typeof containerHeight === "number" && Number.isFinite(containerHeight) && containerHeight > 0) {
    max = Math.min(max, Math.max(DETAILS_MIN_HEIGHT, containerHeight - TABLE_MIN_HEIGHT));
  }
  return Math.round(Math.min(max, Math.max(DETAILS_MIN_HEIGHT, height)));
}

export function parseStoredSidebarWidth(raw: string | null | undefined): number {
  if (raw == null || raw === "") return SIDEBAR_DEFAULT_WIDTH;
  const value = Number(raw);
  return clampSidebarWidth(value);
}

export function parseStoredDetailsHeight(
  raw: string | null | undefined,
  viewportHeight?: number,
  containerHeight?: number
): number {
  if (raw == null || raw === "") return DETAILS_DEFAULT_HEIGHT;
  const value = Number(raw);
  return clampDetailsHeight(value, viewportHeight, containerHeight);
}

export function clampDetailsWidth(width: number, containerWidth?: number): number {
  if (!Number.isFinite(width)) return DETAILS_DEFAULT_WIDTH;
  let max = DETAILS_ABS_MAX;
  if (typeof containerWidth === "number" && Number.isFinite(containerWidth) && containerWidth > 0) {
    max = Math.min(max, Math.max(DETAILS_MIN_WIDTH, containerWidth * DETAILS_MAX_RATIO));
  }
  return Math.round(Math.min(max, Math.max(DETAILS_MIN_WIDTH, width)));
}

export function parseStoredDetailsWidth(
  raw: string | null | undefined,
  containerWidth?: number
): number {
  if (raw == null || raw === "") return DETAILS_DEFAULT_WIDTH;
  const value = Number(raw);
  return clampDetailsWidth(value, containerWidth);
}

export function parseStoredDetailsDock(raw: string | null | undefined): DetailsDock {
  return raw === "right" ? "right" : DETAILS_DEFAULT_DOCK;
}

export function clampDetailsWidth(
  width: number,
  viewportWidth?: number,
  containerWidth?: number
): number {
  if (!Number.isFinite(width)) return DETAILS_DEFAULT_WIDTH;
  let max = DETAILS_ABS_MAX_WIDTH;
  if (typeof viewportWidth === "number" && Number.isFinite(viewportWidth) && viewportWidth > 0) {
    max = Math.min(max, viewportWidth * DETAILS_MAX_VW);
  }
  if (typeof containerWidth === "number" && Number.isFinite(containerWidth) && containerWidth > 0) {
    max = Math.min(max, Math.max(DETAILS_MIN_WIDTH, containerWidth - MAIN_MIN_WIDTH));
  }
  return Math.round(Math.min(max, Math.max(DETAILS_MIN_WIDTH, width)));
}

export function parseStoredDetailsWidth(
  raw: string | null | undefined,
  viewportWidth?: number,
  containerWidth?: number
): number {
  if (raw == null || raw === "") return DETAILS_DEFAULT_WIDTH;
  const value = Number(raw);
  return clampDetailsWidth(value, viewportWidth, containerWidth);
}

export function parseStoredDetailsDock(raw: string | null | undefined): DetailsDock {
  return raw === "right" ? "right" : DETAILS_DEFAULT_DOCK;
}

export function parseStoredColumnWidths(
  raw: string | null | undefined
): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!key || typeof value !== "number" || !Number.isFinite(value)) continue;
      out[key] = clampColumnWidth(value, key);
    }
    return out;
  } catch {
    return {};
  }
}

export function parseStoredCollapsedGroups(raw: string | null | undefined): Set<string> {
  if (!raw) return emptyCollapsedGroups();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return emptyCollapsedGroups();
    return new Set(
      parsed.filter((value): value is string => typeof value === "string" && value.length > 0)
    );
  } catch {
    return emptyCollapsedGroups();
  }
}

export function serializeCollapsedGroups(ids: Iterable<string>): string[] {
  return [...new Set([...ids].filter((id) => id.length > 0))].sort();
}

export function toggleCollapsedGroup(collapsed: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(collapsed);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function loadSidebarCollapsedGroups(): Set<string> {
  if (typeof window === "undefined") return emptyCollapsedGroups();
  try {
    return parseStoredCollapsedGroups(localStorage.getItem(SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY));
  } catch {
    return emptyCollapsedGroups();
  }
}

export function saveSidebarCollapsedGroups(ids: Iterable<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY,
      JSON.stringify(serializeCollapsedGroups(ids))
    );
  } catch {
    /* quota / private mode */
  }
}

export function loadSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
  try {
    return parseStoredSidebarWidth(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

export function saveSidebarWidth(width: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clampSidebarWidth(width)));
  } catch {
    /* quota / private mode */
  }
}

export function loadDetailsHeight(): number {
  if (typeof window === "undefined") return DETAILS_DEFAULT_HEIGHT;
  try {
    return parseStoredDetailsHeight(
      localStorage.getItem(DETAILS_HEIGHT_STORAGE_KEY),
      window.innerHeight
    );
  } catch {
    return DETAILS_DEFAULT_HEIGHT;
  }
}

export function saveDetailsHeight(height: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      DETAILS_HEIGHT_STORAGE_KEY,
      String(clampDetailsHeight(height, window.innerHeight))
    );
  } catch {
    /* quota / private mode */
  }
}

export function loadDetailsDock(): DetailsDock {
  if (typeof window === "undefined") return DETAILS_DEFAULT_DOCK;
  try {
    return parseStoredDetailsDock(localStorage.getItem(DETAILS_DOCK_STORAGE_KEY));
  } catch {
    return DETAILS_DEFAULT_DOCK;
  }
}

export function saveDetailsDock(dock: DetailsDock) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DETAILS_DOCK_STORAGE_KEY, parseStoredDetailsDock(dock));
  } catch {
    /* quota / private mode */
  }
}

export function loadDetailsWidth(): number {
  if (typeof window === "undefined") return DETAILS_DEFAULT_WIDTH;
  try {
    return parseStoredDetailsWidth(
      localStorage.getItem(DETAILS_WIDTH_STORAGE_KEY),
      window.innerWidth
    );
  } catch {
    return DETAILS_DEFAULT_WIDTH;
  }
}

export function saveDetailsWidth(width: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      DETAILS_WIDTH_STORAGE_KEY,
      String(clampDetailsWidth(width, window.innerWidth))
    );
  } catch {
    /* quota / private mode */
  }
}

export function loadDetailsWidth(): number {
  if (typeof window === "undefined") return DETAILS_DEFAULT_WIDTH;
  try {
    return parseStoredDetailsWidth(
      localStorage.getItem(DETAILS_WIDTH_STORAGE_KEY),
      window.innerWidth
    );
  } catch {
    return DETAILS_DEFAULT_WIDTH;
  }
}

export function saveDetailsWidth(width: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      DETAILS_WIDTH_STORAGE_KEY,
      String(clampDetailsWidth(width, window.innerWidth))
    );
  } catch {
    /* quota / private mode */
  }
}

export function loadDetailsDock(): DetailsDock {
  if (typeof window === "undefined") return DETAILS_DEFAULT_DOCK;
  try {
    return parseStoredDetailsDock(localStorage.getItem(DETAILS_DOCK_STORAGE_KEY));
  } catch {
    return DETAILS_DEFAULT_DOCK;
  }
}

export function saveDetailsDock(dock: DetailsDock) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DETAILS_DOCK_STORAGE_KEY, parseStoredDetailsDock(dock));
  } catch {
    /* quota / private mode */
  }
}

export function loadTorrentColumnWidths(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return parseStoredColumnWidths(localStorage.getItem(TORRENT_COLUMN_WIDTHS_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function saveTorrentColumnWidths(widths: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    const clamped: Record<string, number> = {};
    for (const [key, value] of Object.entries(widths)) {
      clamped[key] = clampColumnWidth(value, key);
    }
    localStorage.setItem(TORRENT_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(clamped));
  } catch {
    /* quota / private mode */
  }
}

export function columnWidthFor(id: string, stored: Record<string, number> | undefined): number {
  const value = stored?.[id];
  return value == null ? defaultColumnWidth(id) : clampColumnWidth(value, id);
}
