/** Transmission RPC 16+ torrent status codes. */
export const TR_STATUS = {
  STOPPED: 0,
  CHECK_WAIT: 1,
  CHECK: 2,
  DOWNLOAD_WAIT: 3,
  DOWNLOAD: 4,
  SEED_WAIT: 5,
  SEED: 6,
} as const;

export const TORRENT_GET_FIELDS = [
  "id",
  "name",
  "status",
  "percentDone",
  "rateDownload",
  "rateUpload",
  "eta",
  "sizeWhenDone",
  "totalSize",
  "downloadedEver",
  "uploadedEver",
  "uploadRatio",
  "peersConnected",
  "peersGettingFromUs",
  "peersSendingToUs",
  "addedDate",
  "doneDate",
  "activityDate",
  "downloadDir",
  "hashString",
  "labels",
  "files",
  "fileStats",
  "trackers",
  "trackerStats",
  "peers",
  "bandwidthPriority",
  "honorsSessionLimits",
  "downloadLimited",
  "downloadLimit",
  "uploadLimited",
  "uploadLimit",
  "seedIdleLimit",
  "seedRatioLimit",
  "seedRatioMode",
  "queuePosition",
  "error",
  "errorString",
  "isFinished",
  "leftUntilDone",
  "pieceCount",
  "pieceSize",
  "comment",
  "creator",
  "isPrivate",
  "metadataPercentComplete",
  "recheckProgress",
  "secondsDownloading",
  "secondsSeeding",
  "magnetLink",
] as const;

export interface TransmissionFile {
  name: string;
  length: number;
  bytesCompleted: number;
}

export interface TransmissionFileStat {
  bytesCompleted: number;
  wanted: boolean;
  priority: number;
}

export interface TransmissionTracker {
  announce: string;
  scrape?: string;
  id?: number;
  tier?: number;
}

export interface TransmissionTrackerStat {
  announce?: string;
  host?: string;
  id?: number;
  lastAnnounceSucceeded?: boolean;
  lastAnnounceResult?: string;
  nextAnnounceTime?: number;
  seederCount?: number;
  leecherCount?: number;
  tier?: number;
}

export interface TransmissionPeer {
  address: string;
  clientName?: string;
  port?: number;
  progress: number;
  rateToClient?: number;
  rateToPeer?: number;
  isDownloadingFrom?: boolean;
  isUploadingTo?: boolean;
}

export interface TransmissionTorrent {
  id: number;
  name: string;
  status: number;
  percentDone?: number;
  rateDownload?: number;
  rateUpload?: number;
  eta?: number;
  sizeWhenDone?: number;
  totalSize?: number;
  downloadedEver?: number;
  uploadedEver?: number;
  uploadRatio?: number;
  peersConnected?: number;
  peersGettingFromUs?: number;
  peersSendingToUs?: number;
  addedDate?: number;
  doneDate?: number;
  activityDate?: number;
  downloadDir?: string;
  hashString?: string;
  labels?: string[];
  files?: TransmissionFile[];
  fileStats?: TransmissionFileStat[];
  trackers?: TransmissionTracker[];
  trackerStats?: TransmissionTrackerStat[];
  peers?: TransmissionPeer[];
  bandwidthPriority?: number;
  honorsSessionLimits?: boolean;
  downloadLimited?: boolean;
  downloadLimit?: number;
  uploadLimited?: boolean;
  uploadLimit?: number;
  seedIdleLimit?: number;
  seedRatioLimit?: number;
  seedRatioMode?: number;
  queuePosition?: number;
  error?: number;
  errorString?: string;
  isFinished?: boolean;
  leftUntilDone?: number;
  pieceCount?: number;
  pieceSize?: number;
  comment?: string;
  creator?: string;
  isPrivate?: boolean;
  metadataPercentComplete?: number;
  recheckProgress?: number;
  secondsDownloading?: number;
  secondsSeeding?: number;
  magnetLink?: string;
}

export interface TransmissionRpcRequest {
  method: string;
  arguments?: Record<string, unknown>;
  tag?: number | string;
}

export interface TransmissionRpcResponse {
  result: string;
  arguments?: Record<string, unknown>;
  tag?: number | string;
}

export interface TransmissionSession {
  version?: string;
  "rpc-version"?: number;
  "download-dir"?: string;
  "incomplete-dir"?: string;
  "incomplete-dir-enabled"?: boolean;
  "start-added-torrents"?: boolean;
  "rename-partial-files"?: boolean;
  "speed-limit-down"?: number;
  "speed-limit-down-enabled"?: boolean;
  "speed-limit-up"?: number;
  "speed-limit-up-enabled"?: boolean;
  "alt-speed-down"?: number;
  "alt-speed-up"?: number;
  "alt-speed-enabled"?: boolean;
  "peer-limit-global"?: number;
  "peer-limit-per-torrent"?: number;
  "peer-port"?: number;
  "peer-port-random-on-start"?: boolean;
  "port-forwarding-enabled"?: boolean;
  "dht-enabled"?: boolean;
  "pex-enabled"?: boolean;
  "lpd-enabled"?: boolean;
  "utp-enabled"?: boolean;
  encryption?: string;
  "seed-queue-size"?: number;
  "seed-queue-enabled"?: boolean;
  "download-queue-size"?: number;
  "download-queue-enabled"?: boolean;
  "queue-stalled-enabled"?: boolean;
  "queue-stalled-minutes"?: number;
  "idle-seeding-limit"?: number;
  "idle-seeding-limit-enabled"?: boolean;
  "ratio-limit"?: number;
  "ratio-limit-enabled"?: boolean;
  "download-dir-free-space"?: number;
  "cache-size-mb"?: number;
  "blocklist-enabled"?: boolean;
  "blocklist-url"?: string;
}

export const SESSION_GET_FIELDS = [
  "version",
  "rpc-version",
  "download-dir",
  "incomplete-dir",
  "incomplete-dir-enabled",
  "start-added-torrents",
  "rename-partial-files",
  "speed-limit-down",
  "speed-limit-down-enabled",
  "speed-limit-up",
  "speed-limit-up-enabled",
  "alt-speed-down",
  "alt-speed-up",
  "alt-speed-enabled",
  "peer-limit-global",
  "peer-limit-per-torrent",
  "peer-port",
  "peer-port-random-on-start",
  "port-forwarding-enabled",
  "dht-enabled",
  "pex-enabled",
  "lpd-enabled",
  "utp-enabled",
  "encryption",
  "seed-queue-size",
  "seed-queue-enabled",
  "download-queue-size",
  "download-queue-enabled",
  "queue-stalled-enabled",
  "queue-stalled-minutes",
  "idle-seeding-limit",
  "idle-seeding-limit-enabled",
  "ratio-limit",
  "ratio-limit-enabled",
  "download-dir-free-space",
  "cache-size-mb",
  "blocklist-enabled",
  "blocklist-url",
] as const;
