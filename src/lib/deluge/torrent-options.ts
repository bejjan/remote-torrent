/**
 * Fields sent to `core.set_torrent_options`.
 * Status GET uses `prioritize_first_last`; TorrentOptions uses `prioritize_first_last_pieces`.
 */
export type TorrentOptionsPayload = {
  max_download_speed: number;
  max_upload_speed: number;
  max_connections: number;
  max_upload_slots: number;
  is_auto_managed: boolean;
  stop_at_ratio: boolean;
  stop_ratio: number;
  remove_at_ratio: boolean;
  move_completed: boolean;
  move_completed_path: string;
  super_seeding: boolean;
  prioritize_first_last_pieces: boolean;
};

export type TorrentOptionsFormValues = {
  maxDownloadSpeed: string;
  maxUploadSpeed: string;
  maxConnections: string;
  maxUploadSlots: string;
  isAutoManaged: boolean;
  stopAtRatio: boolean;
  stopRatio: string;
  removeAtRatio: boolean;
  moveCompleted: boolean;
  moveCompletedPath: string;
  superSeeding: boolean;
  prioritizeFirstLast: boolean;
};

/** JSON cannot carry NaN; Deluge treats -1 as unlimited for speed/slot fields. */
export function optionNumber(raw: string, fallback = -1): number {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

export function buildTorrentOptionsPayload(values: TorrentOptionsFormValues): TorrentOptionsPayload {
  return {
    max_download_speed: optionNumber(values.maxDownloadSpeed),
    max_upload_speed: optionNumber(values.maxUploadSpeed),
    max_connections: optionNumber(values.maxConnections),
    max_upload_slots: optionNumber(values.maxUploadSlots),
    is_auto_managed: values.isAutoManaged,
    stop_at_ratio: values.stopAtRatio,
    stop_ratio: optionNumber(values.stopRatio, 2),
    remove_at_ratio: values.removeAtRatio,
    move_completed: values.moveCompleted,
    move_completed_path: values.moveCompletedPath,
    super_seeding: values.superSeeding,
    prioritize_first_last_pieces: values.prioritizeFirstLast,
  };
}
