export const GRID_KEYS = [
  "queue",
  "name",
  "total_wanted",
  "state",
  "progress",
  "is_finished",
  "num_seeds",
  "total_seeds",
  "num_peers",
  "total_peers",
  "download_payload_rate",
  "upload_payload_rate",
  "eta",
  "ratio",
  "distributed_copies",
  "is_auto_managed",
  "time_added",
  "tracker_host",
  "download_location",
  "last_seen_complete",
  "total_done",
  "total_uploaded",
  "max_download_speed",
  "max_upload_speed",
  "seeds_peers_ratio",
  "total_remaining",
  "completed_time",
  "time_since_transfer",
  "label",
  "message",
] as const;

export const STATUS_KEYS = [
  ...GRID_KEYS,
  "total_payload_download",
  "total_payload_upload",
  "next_announce",
  "tracker_status",
  "num_pieces",
  "piece_length",
  "active_time",
  "seeding_time",
  "seed_rank",
  "owner",
  "public",
  "shared",
] as const;

export const DETAILS_KEYS = [
  "name",
  "download_location",
  "total_size",
  "num_files",
  "message",
  "tracker_host",
  "comment",
  "creator",
] as const;

export const OPTIONS_KEYS = [
  "max_download_speed",
  "max_upload_speed",
  "max_connections",
  "max_upload_slots",
  "is_auto_managed",
  "stop_at_ratio",
  "stop_ratio",
  "remove_at_ratio",
  "private",
  "prioritize_first_last",
  "move_completed",
  "move_completed_path",
  "super_seeding",
] as const;

/**
 * Inspector `web.get_torrent_status` keys. Deluge SessionProxy treats an empty
 * list as "whatever `update_ui` already cached" (grid fields only), so trackers,
 * peers, and options never come back unless they are named here.
 */
export const INSPECT_KEYS: string[] = [
  ...new Set<string>([
    ...STATUS_KEYS,
    ...OPTIONS_KEYS,
    ...DETAILS_KEYS,
    "sequential_download",
    "peers",
    "trackers",
  ]),
];

export const STATE_FILTERS = [
  "All",
  "Downloading",
  "Seeding",
  "Paused",
  "Checking",
  "Queued",
  "Error",
  "Active",
] as const;

export type GridKey = (typeof GRID_KEYS)[number];
