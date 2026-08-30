import { trackerHost } from "@/lib/deluge/format";
import { DEFAULT_FILE_PRIORITY } from "@/lib/deluge/files-tree";
import { normalizeTorrentName } from "@/lib/deluge/torrent-name";
import type {
  FileDir,
  FileLeaf,
  FilterDict,
  FilterTuple,
  SessionStats,
  TorrentPeer,
  TorrentState,
  TorrentStatus,
  TorrentTracker,
  UiUpdate,
} from "@/lib/deluge/types";
import {
  QBITTORRENT_ETA_INFINITE,
  type QbittorrentCategory,
  type QbittorrentFile,
  type QbittorrentMaindata,
  type QbittorrentPeer,
  type QbittorrentPreferences,
  type QbittorrentServerState,
  type QbittorrentTorrent,
  type QbittorrentTracker,
} from "./types";

export const QBITTORRENT_STATE_FILTERS = [
  "All",
  "Downloading",
  "Seeding",
  "Paused",
  "Checking",
  "Queued",
  "Error",
  "Active",
] as const;

/** Deluge 0/1/4/7 → qBittorrent 0 (skip), 1 (normal), 6 (high). */
export function qbittorrentPriorityFromDeluge(priority: number): number {
  if (!Number.isFinite(priority) || priority <= 0) return 0;
  if (priority >= 5) return 6;
  return 1;
}

/** qBittorrent 0/1/6/7 → Deluge 0 / DEFAULT_FILE_PRIORITY / 7. */
export function delugePriorityFromQbittorrent(priority: number): number {
  if (!Number.isFinite(priority) || priority <= 0) return 0;
  if (priority >= 6) return 7;
  return DEFAULT_FILE_PRIORITY;
}

export function torrentKey(torrent: QbittorrentTorrent): string {
  return String(torrent.hash || "").trim().toLowerCase();
}

export function mapQbittorrentState(state: string | undefined): TorrentState {
  const s = String(state ?? "");
  if (s === "error" || s === "missingFiles") return "Error";
  if (s.startsWith("checking")) return "Checking";
  if (s.startsWith("queued")) return "Queued";
  if (s.startsWith("paused") || s.startsWith("stopped")) return "Paused";
  if (s === "allocating") return "Allocating";
  if (s === "moving") return "Moving";
  if (s === "uploading" || s === "forcedUP" || s === "stalledUP") return "Seeding";
  if (s === "downloading" || s === "forcedDL" || s === "metaDL" || s === "stalledDL") {
    return "Downloading";
  }
  return "Paused";
}

function bytesToKibLimit(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return -1;
  return bytes / 1024;
}

export function kibToBytesLimit(kib: number): number {
  if (!Number.isFinite(kib) || kib < 0) return 0;
  return Math.round(kib * 1024);
}

export function mapQbittorrentTorrent(torrent: QbittorrentTorrent): TorrentStatus {
  const size = Number(torrent.total_size ?? torrent.size ?? 0) || 0;
  const done = Number(torrent.downloaded ?? torrent.completed ?? 0) || 0;
  const remaining = Number(torrent.amount_left ?? Math.max(0, size - done)) || 0;
  let progress = Number(torrent.progress ?? 0);
  if (Number.isFinite(progress) && progress <= 1) progress *= 100;
  if (!Number.isFinite(progress) || progress < 0) {
    progress = size > 0 ? (done / size) * 100 : 0;
  }
  const down = Number(torrent.dlspeed ?? 0) || 0;
  const up = Number(torrent.upspeed ?? 0) || 0;
  const seeds = Number(torrent.num_seeds ?? 0) || 0;
  const peers = Number(torrent.num_leechs ?? 0) || 0;
  const swarmSeeds = torrent.num_complete;
  const swarmPeers = torrent.num_incomplete;
  const ratio = Number(torrent.ratio ?? 0);
  const state = mapQbittorrentState(torrent.state);
  const etaRaw = Number(torrent.eta ?? -1);
  const eta =
    !Number.isFinite(etaRaw) || etaRaw < 0 || etaRaw >= QBITTORRENT_ETA_INFINITE ? -1 : etaRaw;
  const ratioLimit = Number(torrent.ratio_limit ?? torrent.max_ratio ?? -1);
  const dlLimit = Number(torrent.dl_limit ?? 0);
  const upLimit = Number(torrent.up_limit ?? 0);
  const queue = Number(torrent.priority ?? 0);
  const lastActivity = Number(torrent.last_activity ?? 0);
  const tracker = torrent.tracker || "";
  const queued = state === "Queued" || state === "Downloading" || state === "Paused";
  return {
    queue: queued && queue >= 0 ? queue : -1,
    name: normalizeTorrentName(torrent.name || torrentKey(torrent)),
    total_wanted: size,
    state,
    progress,
    is_finished:
      state !== "Checking" &&
      state !== "Downloading" &&
      state !== "Allocating" &&
      (progress >= 100 || (size > 0 && remaining === 0)),
    num_seeds: seeds,
    total_seeds: typeof swarmSeeds === "number" && swarmSeeds >= 0 ? swarmSeeds : -1,
    num_peers: peers,
    total_peers: typeof swarmPeers === "number" && swarmPeers >= 0 ? swarmPeers : -1,
    download_payload_rate: down,
    upload_payload_rate: up,
    eta,
    ratio: Number.isFinite(ratio) && ratio >= 0 ? ratio : 0,
    distributed_copies: Number(torrent.availability ?? 0) || 0,
    is_auto_managed: Boolean(torrent.auto_tmm),
    time_added: Number(torrent.added_on ?? 0) || 0,
    tracker_host: tracker ? trackerHost(tracker) : "",
    download_location: torrent.save_path || "",
    last_seen_complete: Number(torrent.seen_complete ?? 0) || 0,
    total_done: done,
    total_uploaded: Number(torrent.uploaded ?? 0) || 0,
    max_download_speed: bytesToKibLimit(dlLimit),
    max_upload_speed: bytesToKibLimit(upLimit),
    seeds_peers_ratio: peers + seeds > 0 ? seeds / (peers + seeds) : 0,
    total_remaining: remaining,
    completed_time: Number(torrent.completion_on ?? 0) || 0,
    time_since_transfer: lastActivity ? Math.max(0, Math.round(Date.now() / 1000 - lastActivity)) : 0,
    total_payload_download: done,
    total_payload_upload: Number(torrent.uploaded ?? 0) || 0,
    next_announce: 0,
    tracker_status: state === "Error" ? "Error" : "",
    num_pieces: Number(torrent.pieces_num ?? 0) || 0,
    piece_length: Number(torrent.piece_size ?? 0) || 0,
    active_time: Number(torrent.time_active ?? 0) || 0,
    seeding_time: Number(torrent.seeding_time ?? 0) || 0,
    seed_rank: queue,
    owner: "",
    public: torrent.private !== true,
    shared: false,
    total_size: size,
    num_files: 0,
    message: state === "Error" ? "Error" : "",
    comment: torrent.comment || "",
    creator: "",
    max_connections: -1,
    max_upload_slots: -1,
    stop_at_ratio: ratioLimit >= 0,
    stop_ratio: ratioLimit >= 0 ? ratioLimit : 2,
    remove_at_ratio: false,
    private: torrent.private === true,
    prioritize_first_last: Boolean(torrent.f_l_piece_prio),
    move_completed: false,
    move_completed_path: "",
    super_seeding: Boolean(torrent.super_seeding),
    sequential_download: Boolean(torrent.seq_dl),
    label: (torrent.category || "").trim() || undefined,
  };
}

export function filesTreeFromQbittorrent(files: QbittorrentFile[] | undefined): FileDir {
  const root: FileDir = { type: "dir", contents: {} };
  (files ?? []).forEach((file, i) => {
    const index = file.index ?? i;
    const size = Number(file.size ?? 0) || 0;
    let progress = Number(file.progress ?? 0) || 0;
    if (progress > 1) progress /= 100;
    const leaf: FileLeaf = {
      type: "file",
      index,
      size,
      progress,
      priority: delugePriorityFromQbittorrent(file.priority),
      offset: 0,
    };
    const parts = String(file.name || `file-${index}`).split(/[/\\]/).filter(Boolean);
    if (!parts.length) parts.push(`file-${index}`);
    let dir = root;
    for (let p = 0; p < parts.length - 1; p++) {
      const part = parts[p];
      const existing = dir.contents[part];
      if (!existing || existing.type !== "dir") dir.contents[part] = { type: "dir", contents: {} };
      dir = dir.contents[part] as FileDir;
    }
    dir.contents[parts[parts.length - 1]] = leaf;
  });
  return root;
}

export function mapQbittorrentPeers(
  peers: Record<string, QbittorrentPeer> | undefined
): TorrentPeer[] {
  return Object.values(peers ?? {}).map((peer) => ({
    client: peer.client || "",
    country: peer.country || peer.country_code || "",
    down_speed: Number(peer.dl_speed ?? 0) || 0,
    up_speed: Number(peer.up_speed ?? 0) || 0,
    ip: peer.port ? `${peer.ip || ""}:${peer.port}` : peer.ip || "",
    progress: Number(peer.progress ?? 0) || 0,
    seed: (Number(peer.progress ?? 0) || 0) >= 1 ? 1 : 0,
  }));
}

export function mapQbittorrentTrackers(
  trackers: QbittorrentTracker[] | undefined
): TorrentTracker[] {
  return (trackers ?? [])
    .filter((t) => t.url && !t.url.startsWith("**"))
    .map((t) => ({ url: t.url, tier: Number(t.tier ?? 0) || 0 }));
}

export function uniqueCategories(
  torrents: QbittorrentTorrent[],
  extra?: Record<string, QbittorrentCategory> | string[]
): string[] {
  const set = new Set<string>();
  if (Array.isArray(extra)) {
    for (const name of extra) {
      const trimmed = String(name).trim();
      if (trimmed) set.add(trimmed);
    }
  } else if (extra) {
    for (const name of Object.keys(extra)) {
      const trimmed = name.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  for (const torrent of torrents) {
    const trimmed = String(torrent.category ?? "").trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort();
}

export function buildQbittorrentFilters(
  torrents: QbittorrentTorrent[],
  extra?: Record<string, QbittorrentCategory> | string[]
): Record<string, FilterTuple[]> {
  const counts = new Map<string, number>();
  for (const name of QBITTORRENT_STATE_FILTERS) counts.set(name, 0);
  const trackers = new Map<string, number>();
  const labels = new Map<string, number>();
  let unlabeled = 0;
  for (const torrent of torrents) {
    const status = mapQbittorrentTorrent(torrent);
    counts.set("All", (counts.get("All") ?? 0) + 1);
    counts.set(status.state, (counts.get(status.state) ?? 0) + 1);
    if (status.download_payload_rate > 0 || status.upload_payload_rate > 0) {
      counts.set("Active", (counts.get("Active") ?? 0) + 1);
    }
    trackers.set(status.tracker_host || "", (trackers.get(status.tracker_host || "") ?? 0) + 1);
    const category = String(torrent.category ?? "").trim();
    if (!category) unlabeled += 1;
    else labels.set(category, (labels.get(category) ?? 0) + 1);
  }
  if (Array.isArray(extra)) {
    for (const name of extra) {
      const trimmed = String(name).trim();
      if (trimmed && !labels.has(trimmed)) labels.set(trimmed, 0);
    }
  } else if (extra) {
    for (const name of Object.keys(extra)) {
      const trimmed = name.trim();
      if (trimmed && !labels.has(trimmed)) labels.set(trimmed, 0);
    }
  }
  return {
    state: QBITTORRENT_STATE_FILTERS.map((name) => [name, counts.get(name) ?? 0]),
    tracker_host: [
      ["All", counts.get("All") ?? 0],
      ...[...trackers.entries()].map(([name, count]) => [name, count] as FilterTuple),
    ],
    label: [
      ["All", counts.get("All") ?? 0],
      ["", unlabeled],
      ...[...labels.entries()].map(([name, count]) => [name, count] as FilterTuple),
    ],
  };
}

export function matchesQbittorrentFilter(
  torrent: QbittorrentTorrent,
  filter: FilterDict | undefined
): boolean {
  if (!filter) return true;
  const status = mapQbittorrentTorrent(torrent);
  if (filter.state?.[0] && filter.state[0] !== "All") {
    const wanted = filter.state[0];
    if (wanted === "Active") {
      if (status.download_payload_rate <= 0 && status.upload_payload_rate <= 0) return false;
    } else if (status.state !== wanted) return false;
  }
  if (filter.tracker_host?.[0] && status.tracker_host !== filter.tracker_host[0]) return false;
  if (filter.label && filter.label[0] !== undefined) {
    const wanted = filter.label[0];
    const category = String(torrent.category ?? "").trim();
    if (wanted === "") {
      if (category) return false;
    } else if (category !== wanted) return false;
  }
  return true;
}

export function mapSessionStats(
  server: QbittorrentServerState | null | undefined,
  torrents: QbittorrentTorrent[]
): SessionStats {
  let download = 0;
  let upload = 0;
  let peers = 0;
  if (server) {
    download = Number(server.dl_info_speed ?? 0) || 0;
    upload = Number(server.up_info_speed ?? 0) || 0;
  } else {
    for (const torrent of torrents) {
      download += Number(torrent.dlspeed ?? 0) || 0;
      upload += Number(torrent.upspeed ?? 0) || 0;
    }
  }
  for (const torrent of torrents) {
    peers += (Number(torrent.num_seeds ?? 0) || 0) + (Number(torrent.num_leechs ?? 0) || 0);
  }
  const dlLimit = Number(server?.dl_rate_limit ?? 0);
  const upLimit = Number(server?.up_rate_limit ?? 0);
  return {
    max_download: dlLimit > 0 ? dlLimit : -1,
    max_upload: upLimit > 0 ? upLimit : -1,
    max_num_connections: 0,
    num_connections: peers,
    upload_rate: upload,
    download_rate: download,
    download_protocol_rate: 0,
    upload_protocol_rate: 0,
    dht_nodes: Number(server?.dht_nodes ?? 0) || 0,
    has_incoming_connections: server
      ? server.connection_status === "connected" || peers > 0
      : peers > 0,
    free_space: Number(server?.free_space_on_disk ?? 0) || 0,
    external_ip: "",
  };
}

export function mapUiUpdate(
  torrents: QbittorrentTorrent[],
  server: QbittorrentServerState | null | undefined,
  filter: FilterDict | undefined,
  keys: string[],
  extra?: Record<string, QbittorrentCategory> | string[]
): UiUpdate {
  const visible = torrents.filter((t) => matchesQbittorrentFilter(t, filter));
  const mapped: Record<string, TorrentStatus> = {};
  for (const torrent of visible) {
    const status = mapQbittorrentTorrent(torrent);
    const id = torrentKey(torrent);
    if (keys.length) {
      const picked: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in status) picked[key] = status[key as keyof TorrentStatus];
      }
      mapped[id] = picked as unknown as TorrentStatus;
    } else {
      mapped[id] = status;
    }
  }
  return {
    connected: true,
    torrents: mapped,
    filters: buildQbittorrentFilters(torrents, extra),
    stats: mapSessionStats(server, torrents),
  };
}

export function prefsToCoreConfig(prefs: QbittorrentPreferences): Record<string, unknown> {
  const dl = Number(prefs.dl_limit ?? 0);
  const ul = Number(prefs.up_limit ?? 0);
  const port = Number(prefs.listen_port ?? 6881) || 6881;
  return {
    download_location: prefs.save_path ?? "",
    move_completed: Boolean(prefs.temp_path_enabled),
    move_completed_path: prefs.temp_path ?? "",
    add_paused: Boolean(prefs.start_paused_enabled),
    sequential_download: false,
    prioritize_first_last_pieces: false,
    max_download_speed: bytesToKibLimit(dl),
    max_upload_speed: bytesToKibLimit(ul),
    max_download_speed_per_torrent: -1,
    max_upload_speed_per_torrent: -1,
    max_connections_global: Number(prefs.max_connec ?? 500) || 500,
    max_connections_per_torrent: Number(prefs.max_connec_per_torrent ?? -1) || -1,
    listen_ports: [port, port],
    random_port: Boolean(prefs.random_port),
    dht: prefs.dht !== false,
    utpex: prefs.pex !== false,
    lsd: prefs.lsd !== false,
    upnp: Boolean(prefs.upnp),
    natpmp: Boolean(prefs.upnp),
    max_active_downloading: Number(prefs.max_active_downloads ?? 5) || 5,
    max_active_seeding: Number(prefs.max_active_uploads ?? 5) || 5,
    share_ratio_limit: Number(prefs.max_ratio ?? 2) || 2,
    stop_seed_at_ratio: Boolean(prefs.max_ratio_enabled),
    stop_seed_ratio: Number(prefs.max_ratio ?? 2) || 2,
    ...prefs,
  };
}

export function coreConfigToPrefs(patch: Record<string, unknown>): QbittorrentPreferences {
  const out: QbittorrentPreferences = {};
  const nativeKeys: (keyof QbittorrentPreferences)[] = [
    "save_path",
    "temp_path",
    "temp_path_enabled",
    "start_paused_enabled",
    "preallocate_all",
    "incomplete_files_ext",
    "dl_limit",
    "up_limit",
    "alt_dl_limit",
    "alt_up_limit",
    "scheduler_enabled",
    "max_connec",
    "max_connec_per_torrent",
    "listen_port",
    "random_port",
    "upnp",
    "dht",
    "pex",
    "lsd",
    "anonymous_mode",
    "queueing_enabled",
    "max_active_downloads",
    "max_active_uploads",
    "max_active_torrents",
    "max_ratio_enabled",
    "max_ratio",
    "max_seeding_time_enabled",
    "max_seeding_time",
    "encryption",
    "current_network_interface",
    "current_interface_address",
  ];
  for (const key of nativeKeys) {
    if (key in patch) (out as Record<string, unknown>)[key] = patch[key];
  }
  if ("download_location" in patch) out.save_path = String(patch.download_location ?? "");
  if ("move_completed_path" in patch) out.temp_path = String(patch.move_completed_path ?? "");
  if ("move_completed" in patch) out.temp_path_enabled = Boolean(patch.move_completed);
  if ("add_paused" in patch) out.start_paused_enabled = Boolean(patch.add_paused);
  if ("max_download_speed" in patch) out.dl_limit = kibToBytesLimit(Number(patch.max_download_speed));
  if ("max_upload_speed" in patch) out.up_limit = kibToBytesLimit(Number(patch.max_upload_speed));
  if ("max_connections_global" in patch) out.max_connec = Number(patch.max_connections_global);
  if ("max_connections_per_torrent" in patch) {
    out.max_connec_per_torrent = Number(patch.max_connections_per_torrent);
  }
  if ("dht" in patch) out.dht = Boolean(patch.dht);
  if ("utpex" in patch) out.pex = Boolean(patch.utpex);
  if ("lsd" in patch) out.lsd = Boolean(patch.lsd);
  if ("upnp" in patch || "natpmp" in patch) out.upnp = Boolean(patch.upnp ?? patch.natpmp);
  if ("random_port" in patch) out.random_port = Boolean(patch.random_port);
  if ("listen_ports" in patch && Array.isArray(patch.listen_ports) && patch.listen_ports[0] != null) {
    out.listen_port = Number(patch.listen_ports[0]);
  }
  if ("max_active_downloading" in patch) {
    out.max_active_downloads = Number(patch.max_active_downloading);
    out.queueing_enabled = Number(patch.max_active_downloading) > 0;
  }
  if ("max_active_seeding" in patch) out.max_active_uploads = Number(patch.max_active_seeding);
  if ("share_ratio_limit" in patch || "stop_seed_ratio" in patch) {
    out.max_ratio = Number(patch.share_ratio_limit ?? patch.stop_seed_ratio);
  }
  if ("stop_seed_at_ratio" in patch) out.max_ratio_enabled = Boolean(patch.stop_seed_at_ratio);
  return out;
}

export function joinHashes(ids: unknown): string {
  const list = Array.isArray(ids) ? ids : ids == null || ids === "" ? [] : [ids];
  return list
    .map((id) => String(id).trim().toLowerCase())
    .filter(Boolean)
    .join("|");
}

export function parseHashList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  }
  if (value == null || value === "") return [];
  return String(value)
    .split(/[|,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function torrentsFromMaindata(
  data: QbittorrentMaindata | null | undefined
): QbittorrentTorrent[] {
  if (!data?.torrents) return [];
  return Object.entries(data.torrents).map(([hash, torrent]) => ({
    ...torrent,
    hash: torrent.hash || hash,
  }));
}
