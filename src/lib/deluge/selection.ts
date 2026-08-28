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
