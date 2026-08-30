/** qBittorrent Web API v2 torrent `state` values, including 5.x `stopped*` aliases. */
export type QbittorrentState =
  | "error"
  | "missingFiles"
  | "uploading"
  | "pausedUP"
  | "stoppedUP"
  | "queuedUP"
  | "stalledUP"
  | "checkingUP"
  | "forcedUP"
  | "allocating"
  | "downloading"
  | "metaDL"
  | "pausedDL"
  | "stoppedDL"
  | "queuedDL"
  | "stalledDL"
  | "checkingDL"
  | "forcedDL"
  | "checkingResumeData"
  | "moving"
  | "unknown";

/** `8640000` is qBittorrent's "infinity" ETA sentinel. */
export const QBITTORRENT_ETA_INFINITE = 8_640_000;

export interface QbittorrentTorrent {
  hash: string;
  name: string;
  size?: number;
  progress?: number;
  dlspeed?: number;
  upspeed?: number;
  eta?: number;
  ratio?: number;
  state?: QbittorrentState | string;
  num_seeds?: number;
  num_complete?: number;
  num_leechs?: number;
  num_incomplete?: number;
  category?: string;
  tags?: string;
  save_path?: string;
  added_on?: number;
  completion_on?: number;
  last_activity?: number;
  seen_complete?: number;
  uploaded?: number;
  downloaded?: number;
  amount_left?: number;
  completed?: number;
  total_size?: number;
  priority?: number;
  seq_dl?: boolean;
  super_seeding?: boolean;
  auto_tmm?: boolean;
  f_l_piece_prio?: boolean;
  dl_limit?: number;
  up_limit?: number;
  max_ratio?: number;
  ratio_limit?: number;
  seeding_time?: number;
  time_active?: number;
  comment?: string;
  tracker?: string;
  availability?: number;
  magnet_uri?: string;
  piece_size?: number;
  pieces_have?: number;
  pieces_num?: number;
  private?: boolean;
}

export interface QbittorrentFile {
  index?: number;
  name: string;
  size: number;
  progress: number;
  priority: number;
  is_seed?: boolean;
}

export interface QbittorrentTracker {
  url: string;
  status?: number;
  tier?: number;
  num_peers?: number;
  num_seeds?: number;
  num_leechs?: number;
  msg?: string;
}

export interface QbittorrentPeer {
  client?: string;
  country?: string;
  country_code?: string;
  dl_speed?: number;
  up_speed?: number;
  ip?: string;
  port?: number;
  progress?: number;
}

export interface QbittorrentTransferInfo {
  dl_info_speed?: number;
  up_info_speed?: number;
  dl_info_data?: number;
  up_info_data?: number;
  dl_rate_limit?: number;
  up_rate_limit?: number;
  dht_nodes?: number;
  connection_status?: string;
}

export interface QbittorrentServerState extends QbittorrentTransferInfo {
  free_space_on_disk?: number;
  queueing?: boolean;
  use_alt_speed_limits?: boolean;
}

export interface QbittorrentCategory {
  name?: string;
  savePath?: string;
}

export interface QbittorrentPreferences {
  save_path?: string;
  temp_path?: string;
  temp_path_enabled?: boolean;
  start_paused_enabled?: boolean;
  preallocate_all?: boolean;
  incomplete_files_ext?: boolean;
  dl_limit?: number;
  up_limit?: number;
  alt_dl_limit?: number;
  alt_up_limit?: number;
  scheduler_enabled?: boolean;
  max_connec?: number;
  max_connec_per_torrent?: number;
  listen_port?: number;
  random_port?: boolean;
  upnp?: boolean;
  dht?: boolean;
  pex?: boolean;
  lsd?: boolean;
  anonymous_mode?: boolean;
  queueing_enabled?: boolean;
  max_active_downloads?: number;
  max_active_uploads?: number;
  max_active_torrents?: number;
  max_ratio_enabled?: boolean;
  max_ratio?: number;
  max_seeding_time_enabled?: boolean;
  max_seeding_time?: number;
  encryption?: number;
  current_network_interface?: string;
  current_interface_address?: string;
  [key: string]: unknown;
}

export interface QbittorrentBuildInfo {
  qt?: string;
  libtorrent?: string;
  boost?: string;
  openssl?: string;
  bitness?: number;
  platform?: string;
}

export interface QbittorrentMaindata {
  rid?: number;
  full_update?: boolean;
  torrents?: Record<string, QbittorrentTorrent>;
  categories?: Record<string, QbittorrentCategory>;
  server_state?: QbittorrentServerState;
}

export interface QbittorrentTorrentPeers {
  full_update?: boolean;
  rid?: number;
  peers?: Record<string, QbittorrentPeer>;
}

export type QbittorrentRequest = {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  form?: Record<string, string | number | boolean | undefined>;
  files?: { field: string; filename: string; data: Buffer }[];
};

export type QbittorrentCallResult = {
  data: unknown;
  setCookies?: string[];
};

export type QbittorrentCaller = (req: QbittorrentRequest) => Promise<QbittorrentCallResult>;
