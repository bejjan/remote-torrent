import { readLocalStorage, storageKey, writeLocalStorage } from "@/lib/storage";
import type { TorrentStatus } from "./types";

/** Browser-local torrent list column visibility. Official Deluge Web stores ExtJS grid state separately. */
export const TORRENT_COLUMNS_STORAGE_KEY = storageKey("torrent-columns");
/** Browser-local torrent list column order, including hidden columns. */
export const TORRENT_COLUMN_ORDER_STORAGE_KEY = storageKey("torrent-column-order");
/** Pointer movement (px) before a header press becomes a reorder drag instead of a sort click. */
export const COLUMN_REORDER_DRAG_THRESHOLD = 8;

export const REQUIRED_TORRENT_COLUMN_ID = "name" as const;

export type TorrentColumnId =
  | "queue"
  | "name"
  | "size"
  | "progress"
  | "status"
  | "down"
  | "up"
  | "eta"
  | "ratio"
  | "seeds"
  | "peers"
  | "label"
  | "avail"
  | "added"
  | "tracker"
  | "save_path"
  | "downloaded"
  | "uploaded"
  | "remaining"
  | "complete_seen"
  | "completed"
  | "auto_managed"
  | "down_limit"
  | "up_limit"
  | "seeds_peers"
  | "last_transfer";

export interface TorrentColumn {
  id: TorrentColumnId;
  label: string;
  sortKey: keyof TorrentStatus;
  hideable: boolean;
  defaultVisible: boolean;
}

/** Catalog order is the default table order. Name is the identity column and cannot be hidden. */
export const TORRENT_COLUMNS: readonly TorrentColumn[] = [
  { id: "queue", label: "#", sortKey: "queue", hideable: true, defaultVisible: true },
  { id: "name", label: "Name", sortKey: "name", hideable: false, defaultVisible: true },
  { id: "size", label: "Size", sortKey: "total_wanted", hideable: true, defaultVisible: true },
  { id: "progress", label: "Progress", sortKey: "progress", hideable: true, defaultVisible: true },
  { id: "status", label: "Status", sortKey: "state", hideable: true, defaultVisible: true },
  {
    id: "down",
    label: "Down",
    sortKey: "download_payload_rate",
    hideable: true,
    defaultVisible: true,
  },
  { id: "up", label: "Up", sortKey: "upload_payload_rate", hideable: true, defaultVisible: true },
  { id: "eta", label: "ETA", sortKey: "eta", hideable: true, defaultVisible: true },
  { id: "ratio", label: "Ratio", sortKey: "ratio", hideable: true, defaultVisible: true },
  { id: "seeds", label: "Seeds", sortKey: "num_seeds", hideable: true, defaultVisible: true },
  { id: "peers", label: "Peers", sortKey: "num_peers", hideable: true, defaultVisible: true },
  { id: "label", label: "Label", sortKey: "label", hideable: true, defaultVisible: true },
  {
    id: "avail",
    label: "Avail",
    sortKey: "distributed_copies",
    hideable: true,
    defaultVisible: false,
  },
  { id: "added", label: "Added", sortKey: "time_added", hideable: true, defaultVisible: false },
  { id: "tracker", label: "Tracker", sortKey: "tracker_host", hideable: true, defaultVisible: false },
  {
    id: "save_path",
    label: "Download Folder",
    sortKey: "download_location",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "downloaded",
    label: "Downloaded",
    sortKey: "total_done",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "uploaded",
    label: "Uploaded",
    sortKey: "total_uploaded",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "remaining",
    label: "Remaining",
    sortKey: "total_remaining",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "complete_seen",
    label: "Complete Seen",
    sortKey: "last_seen_complete",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "completed",
    label: "Completed",
    sortKey: "completed_time",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "auto_managed",
    label: "Auto Managed",
    sortKey: "is_auto_managed",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "down_limit",
    label: "Down Limit",
    sortKey: "max_download_speed",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "up_limit",
    label: "Up Limit",
    sortKey: "max_upload_speed",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "seeds_peers",
    label: "Seeds:Peers",
    sortKey: "seeds_peers_ratio",
    hideable: true,
    defaultVisible: false,
  },
  {
    id: "last_transfer",
    label: "Last Transfer",
    sortKey: "time_since_transfer",
    hideable: true,
    defaultVisible: false,
  },
];

const COLUMN_IDS = new Set<string>(TORRENT_COLUMNS.map((column) => column.id));

export function isTorrentColumnId(value: unknown): value is TorrentColumnId {
  return typeof value === "string" && COLUMN_IDS.has(value);
}

export function defaultVisibleTorrentColumns(): Set<TorrentColumnId> {
  return new Set(
    TORRENT_COLUMNS.filter((column) => column.defaultVisible).map((column) => column.id)
  );
}

export function defaultTorrentColumnOrder(): TorrentColumnId[] {
  return TORRENT_COLUMNS.map((column) => column.id);
}

export function normalizeColumnOrder(
  order: readonly string[] | null | undefined
): TorrentColumnId[] {
  const seen = new Set<TorrentColumnId>();
  const next: TorrentColumnId[] = [];
  if (order) {
    for (const id of order) {
      if (!isTorrentColumnId(id) || seen.has(id)) continue;
      seen.add(id);
      next.push(id);
    }
  }
  for (const column of TORRENT_COLUMNS) {
    if (!seen.has(column.id)) next.push(column.id);
  }
  return next;
}

export function sameColumnOrder(
  a: readonly TorrentColumnId[],
  b: readonly TorrentColumnId[]
): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Move `draggedId` so it sits immediately before `beforeId` in the full order.
 * `beforeId === null` appends after every other column (including hidden ones).
 */
export function moveColumnBefore(
  order: readonly TorrentColumnId[],
  draggedId: TorrentColumnId,
  beforeId: TorrentColumnId | null
): TorrentColumnId[] {
  const current = normalizeColumnOrder(order);
  if (!current.includes(draggedId) || draggedId === beforeId) return current;
  const from = current.indexOf(draggedId);
  const without = current.filter((id) => id !== draggedId);
  let insertAt = beforeId == null ? without.length : without.indexOf(beforeId);
  if (insertAt < 0) insertAt = without.length;
  if (insertAt === from) return current;
  const next = [...without.slice(0, insertAt), draggedId, ...without.slice(insertAt)];
  return sameColumnOrder(next, current) ? current : next;
}

/** Visible insert index from pointer X vs column midpoints. 0 = before first, length = after last. */
export function dropIndexFromX(midpoints: readonly number[], clientX: number): number {
  for (let i = 0; i < midpoints.length; i++) {
    const mid = midpoints[i];
    if (typeof mid === "number" && Number.isFinite(mid) && clientX < mid) return i;
  }
  return midpoints.length;
}

/** Dropping on either edge of the dragged column leaves visible order unchanged. */
export function isIdentityColumnDrop(fromIndex: number, dropIndex: number): boolean {
  return dropIndex === fromIndex || dropIndex === fromIndex + 1;
}

/**
 * Which header edge draws the drop line. Identity targets stay on the dragged
 * column so the line is visible on its left/right instead of being omitted.
 */
export function columnDropEdge(
  index: number,
  dropIndex: number,
  fromIndex: number,
  columnCount: number
): "before" | "after" | null {
  if (fromIndex < 0 || columnCount <= 0) return null;
  if (index === fromIndex && dropIndex === fromIndex) return "before";
  if (index === fromIndex && dropIndex === fromIndex + 1) return "after";
  if (isIdentityColumnDrop(fromIndex, dropIndex)) return null;
  if (dropIndex === index) return "before";
  if (dropIndex === columnCount && index === columnCount - 1) return "after";
  return null;
}

export function visibleTorrentColumns(
  visibleIds: ReadonlySet<TorrentColumnId>,
  order?: readonly TorrentColumnId[]
): TorrentColumn[] {
  if (!order || order.length === 0) {
    return TORRENT_COLUMNS.filter((column) => visibleIds.has(column.id));
  }
  const byId = new Map(TORRENT_COLUMNS.map((column) => [column.id, column]));
  const shown: TorrentColumn[] = [];
  for (const id of normalizeColumnOrder(order)) {
    if (!visibleIds.has(id)) continue;
    const column = byId.get(id);
    if (column) shown.push(column);
  }
  return shown;
}

export function applyColumnVisibility(
  current: ReadonlySet<TorrentColumnId>,
  id: TorrentColumnId,
  visible: boolean
): Set<TorrentColumnId> {
  const next = new Set(current);
  next.add(REQUIRED_TORRENT_COLUMN_ID);
  if (id === REQUIRED_TORRENT_COLUMN_ID) return next;
  if (visible) next.add(id);
  else next.delete(id);
  if (!next.has(REQUIRED_TORRENT_COLUMN_ID)) next.add(REQUIRED_TORRENT_COLUMN_ID);
  return next;
}

export function serializeTorrentColumnVisibility(
  visibleIds: ReadonlySet<TorrentColumnId>
): TorrentColumnId[] {
  const ids = TORRENT_COLUMNS.filter((column) => visibleIds.has(column.id)).map(
    (column) => column.id
  );
  if (!ids.includes(REQUIRED_TORRENT_COLUMN_ID)) ids.unshift(REQUIRED_TORRENT_COLUMN_ID);
  return ids;
}

export function parseStoredColumnVisibility(raw: string | null | undefined): Set<TorrentColumnId> {
  if (!raw) return defaultVisibleTorrentColumns();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultVisibleTorrentColumns();
    const ids = parsed.filter(isTorrentColumnId);
    if (!ids.length) return defaultVisibleTorrentColumns();
    if (!ids.includes(REQUIRED_TORRENT_COLUMN_ID)) ids.unshift(REQUIRED_TORRENT_COLUMN_ID);
    return new Set(ids);
  } catch {
    return defaultVisibleTorrentColumns();
  }
}

export function loadTorrentColumnVisibility(): Set<TorrentColumnId> {
  return parseStoredColumnVisibility(readLocalStorage(TORRENT_COLUMNS_STORAGE_KEY));
}

export function saveTorrentColumnVisibility(visibleIds: ReadonlySet<TorrentColumnId>) {
  writeLocalStorage(
    TORRENT_COLUMNS_STORAGE_KEY,
    JSON.stringify(serializeTorrentColumnVisibility(visibleIds))
  );
}

export function parseStoredColumnOrder(raw: string | null | undefined): TorrentColumnId[] {
  if (!raw) return defaultTorrentColumnOrder();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultTorrentColumnOrder();
    return normalizeColumnOrder(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return defaultTorrentColumnOrder();
  }
}

export function loadTorrentColumnOrder(): TorrentColumnId[] {
  return parseStoredColumnOrder(readLocalStorage(TORRENT_COLUMN_ORDER_STORAGE_KEY));
}

export function saveTorrentColumnOrder(order: readonly TorrentColumnId[]) {
  writeLocalStorage(TORRENT_COLUMN_ORDER_STORAGE_KEY, JSON.stringify(normalizeColumnOrder(order)));
}
