/**
 * Header-checkbox and post-poll selection helpers.
 * Search/sidebar filters change which ids are visible without clearing the Set.
 */

export function countSelectedVisible(ids: readonly string[], selected: Set<string>): number {
  let n = 0;
  for (const id of ids) if (selected.has(id)) n++;
  return n;
}

export function visibleSelectionState(
  ids: readonly string[],
  selected: Set<string>
): { checked: boolean; indeterminate: boolean } {
  const visibleSelected = countSelectedVisible(ids, selected);
  return {
    checked: ids.length > 0 && visibleSelected === ids.length,
    indeterminate: visibleSelected > 0 && visibleSelected < ids.length,
  };
}

/** Select/deselect only `ids`, leaving hidden selected torrents alone. */
export function applyVisibleSelection(prev: Set<string>, ids: readonly string[], select: boolean): Set<string> {
  const next = new Set(prev);
  if (select) {
    for (const id of ids) next.add(id);
  } else {
    for (const id of ids) next.delete(id);
  }
  return next;
}

/**
 * Drop ids that left the torrent map (removed, or filtered out by `web.update_ui`).
 * A `null` map is a missed/disconnected frame — keep the previous selection.
 */
export function pruneSelectedIds(
  selected: Set<string>,
  torrents: Record<string, unknown> | null | undefined
): Set<string> {
  if (!torrents) return selected;
  let changed = false;
  const next = new Set<string>();
  for (const id of selected) {
    if (id in torrents) next.add(id);
    else changed = true;
  }
  return changed ? next : selected;
}

export function pruneActiveId(
  activeId: string | null,
  torrents: Record<string, unknown> | null | undefined
): string | null {
  if (!activeId) return null;
  if (!torrents) return activeId;
  return activeId in torrents ? activeId : null;
}

/** Ignore an in-flight RPC whose generation was superseded by a newer request. */
export function isCurrentGeneration(current: number, token: number): boolean {
  return current === token;
}

/** Inclusive contiguous ids from one row to another (order-independent). */
export function idsBetween(ids: readonly string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 && to < 0) return [];
  if (from < 0) return to >= 0 ? [toId] : [];
  if (to < 0) return [fromId];
  const [lo, hi] = from < to ? [from, to] : [to, from];
  return ids.slice(lo, hi + 1);
}

/** Prefer a still-visible stored Shift-range anchor; otherwise the fallback (usually the active row). */
export function resolveRangeAnchor(
  ids: readonly string[],
  anchorId: string | null | undefined,
  fallbackId: string | null | undefined
): string | null {
  if (anchorId && ids.includes(anchorId)) return anchorId;
  if (fallbackId && ids.includes(fallbackId)) return fallbackId;
  return null;
}

export type ListSelectionMove = {
  ids: readonly string[];
  activeId: string | null;
  /** Stable start of the current Shift range. */
  anchorId: string | null;
  nextIndex: number;
  shift: boolean;
};

export type ListSelectionMoveResult = {
  selected: string[];
  activeId: string;
  anchorId: string;
};

/**
 * Finder-style list navigation: a plain move replaces the selection;
 * Shift selects the contiguous range from a stable anchor to the new head.
 */
export function moveListSelection(input: ListSelectionMove): ListSelectionMoveResult | null {
  const lastIndex = input.ids.length - 1;
  if (lastIndex < 0) return null;
  const nextIndex = Math.max(0, Math.min(lastIndex, input.nextIndex));
  const headId = input.ids[nextIndex];
  if (!headId) return null;
  if (!input.shift) {
    return { selected: [headId], activeId: headId, anchorId: headId };
  }
  const anchorId = resolveRangeAnchor(input.ids, input.anchorId, input.activeId) ?? headId;
  return {
    selected: idsBetween(input.ids, anchorId, headId),
    activeId: headId,
    anchorId,
  };
}
