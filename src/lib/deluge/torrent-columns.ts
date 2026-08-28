import type { TorrentStatus } from "./types";

/** Browser-local torrent list column visibility. Official Deluge Web stores ExtJS grid state separately. */
export const TORRENT_COLUMNS_STORAGE_KEY = "deluge-nova:torrent-columns";

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

/** Catalog order is the table order. Name is the identity column and cannot be hidden. */
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

export function visibleTorrentColumns(visibleIds: ReadonlySet<TorrentColumnId>): TorrentColumn[] {
  return TORRENT_COLUMNS.filter((column) => visibleIds.has(column.id));
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
  if (typeof window === "undefined") return defaultVisibleTorrentColumns();
  try {
    return parseStoredColumnVisibility(localStorage.getItem(TORRENT_COLUMNS_STORAGE_KEY));
  } catch {
    return defaultVisibleTorrentColumns();
  }
}

export function saveTorrentColumnVisibility(visibleIds: ReadonlySet<TorrentColumnId>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      TORRENT_COLUMNS_STORAGE_KEY,
      JSON.stringify(serializeTorrentColumnVisibility(visibleIds))
    );
  } catch {
    /* quota / private mode */
  }
}
