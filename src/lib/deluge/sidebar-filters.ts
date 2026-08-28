import type { FilterTuple } from "./types";

export const FILTER_ALL = "All";

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
}

/** Hide empty rows unless Deluge's "show zero" preference is on. "All" stays visible. */
export function visibleFilterTuples(
  items: FilterTuple[],
  showZero: boolean,
  alwaysShow: (name: string) => boolean = () => false
): FilterTuple[] {
  return items.filter(([name, count]) => showZero || count > 0 || alwaysShow(name));
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
  items: FilterTuple[],
  options: {
    showZero: boolean;
    fallbackAllCount: number;
    allValue: string;
    emptyLabel: string;
    namedAllLabel: string;
    emptyValue?: string;
  }
): SidebarFilterRow[] {
  const { special, rest } = splitSpecialAll(items);
  const allCount = special ? special[1] : options.fallbackAllCount;
  const rows: SidebarFilterRow[] = [
    { value: options.allValue, label: FILTER_ALL, count: allCount, isAll: true },
  ];
  for (const [name, count] of visibleFilterTuples(rest, options.showZero)) {
    rows.push({
      value: name ? name : (options.emptyValue ?? name),
      label: name === FILTER_ALL ? options.namedAllLabel : name || options.emptyLabel,
      count,
      isAll: false,
    });
  }
  return rows;
}

export function clampSidebarSelection(
  selected: SidebarFilterSelection,
  states: FilterTuple[],
  trackers: FilterTuple[],
  labels: FilterTuple[],
  showZero: boolean
): SidebarFilterSelection {
  const visStates = visibleFilterTuples(states, showZero, (name) => name === FILTER_ALL);
  const visTrackers = visibleFilterTuples(splitSpecialAll(trackers).rest, showZero);
  const visLabels = visibleFilterTuples(splitSpecialAll(labels).rest, showZero);

  const next: SidebarFilterSelection = { ...selected };
  if (!visStates.some(([name]) => name === selected.state)) next.state = FILTER_ALL;
  if (selected.tracker !== "" && !visTrackers.some(([name]) => name === selected.tracker)) {
    next.tracker = "";
  }
  if (selected.label !== "__all__") {
    const match = visLabels.some(([name]) => (name || "__none__") === selected.label);
    if (!match) next.label = "__all__";
  }
  return next;
}
