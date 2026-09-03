import { STATE_FILTERS } from "./keys";
import type { FilterTuple, TorrentStatus } from "./types";

export const FILTER_ALL = "All";
export const FILTER_DOWNLOADING = "Downloading";

/** Same update as clicking a State row in the sidebar. */
export function selectSidebarState(
  selected: SidebarFilterSelection,
  state: string
): SidebarFilterSelection {
  return { ...selected, state };
}

/** Cap named tracker rows so a live 2k+ catalog cannot mount thousands of filter buttons. */
export const SIDEBAR_TRACKER_ROW_CAP = 80;

export interface SidebarFilterSelection {
  state: string;
  tracker: string;
  label: string;
}

export interface SidebarFilterRow {
  /** Value stored in sidebar selection / sent as the filter. */
  value: string;
  /** Text shown in the sidebar. */
  label: string;
  count: number;
  /** Clears this group's filter (at most one per group). */
  isAll: boolean;
  /** Defined labels from `label.get_labels` stay listed at count 0. */
  keepZero?: boolean;
}

/** Coerce JSON from `web.update_ui` into `[name, count]` rows. */
export function normalizeFilterTuples(items: unknown): FilterTuple[] {
  if (items == null) return [];
  if (Array.isArray(items)) {
    const out: FilterTuple[] = [];
    for (const item of items) {
      const tuple = coerceFilterTuple(item);
      if (tuple) out.push(tuple);
    }
    return out;
  }
  if (typeof items === "object") {
    return Object.entries(items as Record<string, unknown>).flatMap((entry) => {
      const tuple = coerceFilterTuple(entry);
      return tuple ? [tuple] : [];
    });
  }
  return [];
}

function coerceFilterTuple(item: unknown): FilterTuple | null {
  if (Array.isArray(item) && item.length >= 2 && item[0] != null) {
    const n = Number(item[1]);
    return [String(item[0]), Number.isFinite(n) ? n : 0];
  }
  if (item && typeof item === "object") {
    const rec = item as Record<string, unknown>;
    if ("filter" in rec && "count" in rec && rec.filter != null) {
      const n = Number(rec.count);
      return [String(rec.filter), Number.isFinite(n) ? n : 0];
    }
  }
  return null;
}

/** Hide empty rows unless Deluge's "show zero" preference is on. */
export function isVisibleFilterRow(
  name: string,
  count: unknown,
  showZero: boolean,
  alwaysShow = false
): boolean {
  if (alwaysShow) return true;
  if (showZero) return true;
  const n = Number(count);
  return Number.isFinite(n) && n > 0;
}

/**
 * Drop count === 0 unless `showZero` / `alwaysShow`. Normalizes first so a live
 * Deluge catalog (tuples, dict, or `{filter,count}` objects) cannot skip the gate.
 */
export function visibleFilterTuples(
  items: unknown,
  showZero: boolean,
  alwaysShow: (name: string) => boolean = () => false
): FilterTuple[] {
  return normalizeFilterTuples(items).filter(([name, count]) =>
    isVisibleFilterRow(name, count, showZero, alwaysShow(name))
  );
}

/**
 * Live Deluge `core.get_filter_tree` always injects every known state at 0
 * (`_init_state_tree`). Keep that full catalog, then hide zeros unless
 * `sidebar_show_zero` is on. Extra live states (Allocating, Moving) stay.
 */
export function completeStateFilters(
  items: unknown,
  catalog: readonly string[] = STATE_FILTERS
): FilterTuple[] {
  const counts = new Map<string, number>();
  for (const [name, count] of normalizeFilterTuples(items)) {
    counts.set(name, count);
  }
  const rows: FilterTuple[] = [];
  const seen = new Set<string>();
  for (const name of catalog) {
    seen.add(name);
    rows.push([name, counts.get(name) ?? 0]);
  }
  for (const [name, count] of counts) {
    if (!seen.has(name)) rows.push([name, count]);
  }
  return rows;
}

/** State sidebar rows: inject the full catalog, then drop count === 0. */
export function stateSidebarRows(items: unknown, showZero: boolean): FilterTuple[] {
  return visibleFilterTuples(completeStateFilters(items), showZero, (name) => name === FILTER_ALL);
}

export function stateAllCount(states: FilterTuple[]): number {
  return states.find(([name]) => name === FILTER_ALL)?.[1] ?? 0;
}

/**
 * The first `["All", n]` is Deluge's catch-all (torrent count). Later `All`
 * rows are treated as a real value — a tracker host or label named All.
 */
export function splitSpecialAll(items: FilterTuple[]): {
  special: FilterTuple | null;
  rest: FilterTuple[];
} {
  let special: FilterTuple | null = null;
  const rest: FilterTuple[] = [];
  for (const item of items) {
    if (item[0] === FILTER_ALL && special === null) {
      special = item;
    } else {
      rest.push(item);
    }
  }
  return { special, rest };
}

/**
 * Rows for Trackers / Labels: at most one All, counted as torrents (State All),
 * never the sum of per-host or per-label hits. Reuses `["All", n]` from
 * `web.update_ui` when present; only synthesizes All when the list omits it.
 */
export function sidebarGroupRows(
  items: unknown,
  options: {
    showZero: boolean;
    fallbackAllCount: number;
    allValue: string;
    emptyLabel: string;
    namedAllLabel: string;
    emptyValue?: string;
    /** Names that should appear even when count is 0 (e.g. labels from `label.get_labels`). */
    knownNames?: readonly string[];
    /** Keep the busiest named rows; All is never dropped. */
    maxNamedRows?: number;
    /** Always keep this named value even when it falls outside the cap. */
    keepValue?: string;
  }
): SidebarFilterRow[] {
  const { special, rest } = splitSpecialAll(mergeKnownFilterNames(items, options.knownNames));
  const allCount = special ? special[1] : options.fallbackAllCount;
  const known = new Set(options.knownNames ?? []);
  const rows: SidebarFilterRow[] = [
    { value: options.allValue, label: FILTER_ALL, count: allCount, isAll: true },
  ];
  for (const [name, count] of visibleFilterTuples(rest, options.showZero, (name) =>
    known.has(name)
  )) {
    rows.push({
      value: name ? name : (options.emptyValue ?? name),
      label: name === FILTER_ALL ? options.namedAllLabel : name || options.emptyLabel,
      count,
      isAll: false,
      keepZero: known.has(name),
    });
  }
  return capNamedSidebarRows(rows, options.maxNamedRows, options.keepValue);
}

/** Keep All plus the highest-count named rows (and an optional selected value). */
export function capNamedSidebarRows(
  rows: SidebarFilterRow[],
  maxNamedRows?: number,
  keepValue?: string
): SidebarFilterRow[] {
  if (maxNamedRows == null || maxNamedRows < 1) return rows;
  const all = rows.filter((row) => row.isAll);
  const named = rows.filter((row) => !row.isAll);
  if (named.length <= maxNamedRows) return rows;
  const kept = new Set<string>();
  if (keepValue) kept.add(keepValue);
  const ranked = [...named].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  for (const row of ranked) {
    if (kept.size >= maxNamedRows) break;
    kept.add(row.value);
  }
  return [...all, ...named.filter((row) => kept.has(row.value))];
}

/** Insert known filter names missing from `web.update_ui` so a fresh label still lists. */
export function mergeKnownFilterNames(tree: unknown, names: readonly string[] | undefined): FilterTuple[] {
  const tuples = normalizeFilterTuples(tree);
  if (!names?.length) return tuples;
  const seen = new Set(tuples.map(([name]) => name));
  const extra: FilterTuple[] = [];
  for (const name of names) {
    if (!seen.has(name)) {
      seen.add(name);
      extra.push([name, 0]);
    }
  }
  return extra.length ? [...tuples, ...extra] : tuples;
}

export function clampSidebarSelection(
  selected: SidebarFilterSelection,
  states: unknown,
  trackers: unknown,
  labels: unknown,
  _showZero: boolean,
  knownLabels: string[] = []
): SidebarFilterSelection {
  const catalogStates = completeStateFilters(states);
  const trackerRest = splitSpecialAll(normalizeFilterTuples(trackers)).rest;
  const labelRest = splitSpecialAll(mergeKnownFilterNames(labels, knownLabels)).rest;

  const next: SidebarFilterSelection = { ...selected };
  if (!catalogStates.some(([name]) => name === selected.state)) next.state = FILTER_ALL;
  if (selected.tracker !== "" && !trackerRest.some(([name]) => name === selected.tracker)) {
    next.tracker = "";
  }
  if (selected.label !== "__all__") {
    const match = labelRest.some(([name]) => (name || "__none__") === selected.label);
    if (!match) next.label = "__all__";
  }
  return next;
}

export function torrentMatchesSidebarFilter(
  torrent: TorrentStatus,
  selected: SidebarFilterSelection,
  ignore?: "state" | "tracker" | "label"
): boolean {
  if (ignore !== "state" && selected.state && selected.state !== FILTER_ALL) {
    if (selected.state === "Active") {
      if (torrent.download_payload_rate <= 0 && torrent.upload_payload_rate <= 0) return false;
    } else if (torrent.state !== selected.state) {
      return false;
    }
  }
  if (ignore !== "tracker" && selected.tracker) {
    if ((torrent.tracker_host || "") !== selected.tracker) return false;
  }
  if (ignore !== "label" && selected.label && selected.label !== "__all__") {
    const wanted = selected.label === "__none__" ? "" : selected.label;
    if ((torrent.label || "") !== wanted) return false;
  }
  return true;
}

export function filterTorrentMap(
  torrents: Record<string, TorrentStatus> | null | undefined,
  selected: SidebarFilterSelection
): Record<string, TorrentStatus> | null | undefined {
  if (!torrents) return torrents;
  const next: Record<string, TorrentStatus> = {};
  for (const [id, torrent] of Object.entries(torrents)) {
    if (torrentMatchesSidebarFilter(torrent, selected)) next[id] = torrent;
  }
  return next;
}

/** Session filter names that should stay listed when another filter zeroes their count. */
export function sidebarSessionCatalog(torrents: Iterable<TorrentStatus>): {
  states: string[];
  trackers: string[];
  labels: string[];
} {
  const states = new Set<string>();
  const trackers = new Set<string>();
  const labels = new Set<string>();
  for (const torrent of torrents) {
    if (torrent.state) states.add(torrent.state);
    if (torrent.download_payload_rate > 0 || torrent.upload_payload_rate > 0) {
      states.add("Active");
    }
    trackers.add(torrent.tracker_host || "");
    labels.add(torrent.label || "");
  }
  return { states: [...states], trackers: [...trackers], labels: [...labels] };
}

/** Counts for each sidebar group, excluding that group's own selection. */
export function sidebarFilterTreeFromTorrents(
  torrents: Iterable<TorrentStatus>,
  selected: SidebarFilterSelection
): Record<string, FilterTuple[]> {
  const forState: TorrentStatus[] = [];
  const forTracker: TorrentStatus[] = [];
  const forLabel: TorrentStatus[] = [];
  const sessionStates = new Set<string>();
  const trackers = new Map<string, number>();
  const labels = new Map<string, number>();
  for (const torrent of torrents) {
    if (torrent.state) sessionStates.add(torrent.state);
    if (torrent.download_payload_rate > 0 || torrent.upload_payload_rate > 0) {
      sessionStates.add("Active");
    }
    trackers.set(torrent.tracker_host || "", 0);
    labels.set(torrent.label || "", 0);
    if (torrentMatchesSidebarFilter(torrent, selected, "state")) forState.push(torrent);
    if (torrentMatchesSidebarFilter(torrent, selected, "tracker")) forTracker.push(torrent);
    if (torrentMatchesSidebarFilter(torrent, selected, "label")) forLabel.push(torrent);
  }

  const stateCounts = new Map<string, number>();
  for (const name of STATE_FILTERS) stateCounts.set(name, 0);
  stateCounts.set(FILTER_ALL, forState.length);
  for (const torrent of forState) {
    stateCounts.set(torrent.state, (stateCounts.get(torrent.state) ?? 0) + 1);
    if (torrent.download_payload_rate > 0 || torrent.upload_payload_rate > 0) {
      stateCounts.set("Active", (stateCounts.get("Active") ?? 0) + 1);
    }
  }
  for (const torrent of forTracker) {
    const host = torrent.tracker_host || "";
    trackers.set(host, (trackers.get(host) ?? 0) + 1);
  }
  for (const torrent of forLabel) {
    const name = torrent.label || "";
    labels.set(name, (labels.get(name) ?? 0) + 1);
  }

  const states: FilterTuple[] = [];
  for (const name of STATE_FILTERS) {
    const count = stateCounts.get(name) ?? 0;
    if (name === FILTER_ALL || sessionStates.has(name) || count > 0) {
      states.push([name, count]);
    }
  }
  for (const [name, count] of stateCounts) {
    if (!STATE_FILTERS.includes(name as (typeof STATE_FILTERS)[number])) {
      states.push([name, count]);
    }
  }

  return {
    state: states,
    tracker_host: [["All", forTracker.length], ...trackers.entries()],
    label: [["All", forLabel.length], ...labels.entries()],
  };
}
