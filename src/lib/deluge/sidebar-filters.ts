import type { FilterTuple } from "./types";

export interface SidebarFilterSelection {
  state: string;
  tracker: string;
  label: string;
}

/** Hide empty rows unless Deluge's "show zero" preference is on. "All" stays visible. */
export function visibleFilterTuples(
  items: FilterTuple[],
  showZero: boolean,
  alwaysShow: (name: string) => boolean = () => false
): FilterTuple[] {
  return items.filter(([name, count]) => showZero || count > 0 || alwaysShow(name));
}

export function clampSidebarSelection(
  selected: SidebarFilterSelection,
  states: FilterTuple[],
  trackers: FilterTuple[],
  labels: FilterTuple[],
  showZero: boolean
): SidebarFilterSelection {
  const visStates = visibleFilterTuples(states, showZero, (name) => name === "All");
  const visTrackers = visibleFilterTuples(trackers, showZero);
  const visLabels = visibleFilterTuples(labels, showZero);

  const next: SidebarFilterSelection = { ...selected };
  if (!visStates.some(([name]) => name === selected.state)) next.state = "All";
  if (selected.tracker !== "" && !visTrackers.some(([name]) => name === selected.tracker)) {
    next.tracker = "";
  }
  if (selected.label !== "__all__") {
    const match = visLabels.some(([name]) => (name || "__none__") === selected.label);
    if (!match) next.label = "__all__";
  }
  return next;
}
