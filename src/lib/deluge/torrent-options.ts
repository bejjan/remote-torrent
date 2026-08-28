/** Fields sent to `core.set_torrent_options` from the details Options tab. */
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
  prioritize_first_last: boolean;
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

export function buildTorrentOptionsPayload(values: TorrentOptionsFormValues): TorrentOptionsPayload {
  return {
    max_download_speed: Number(values.maxDownloadSpeed),
    max_upload_speed: Number(values.maxUploadSpeed),
    max_connections: Number(values.maxConnections),
    max_upload_slots: Number(values.maxUploadSlots),
    is_auto_managed: values.isAutoManaged,
    stop_at_ratio: values.stopAtRatio,
    stop_ratio: Number(values.stopRatio),
    remove_at_ratio: values.removeAtRatio,
    move_completed: values.moveCompleted,
    move_completed_path: values.moveCompletedPath,
    super_seeding: values.superSeeding,
    prioritize_first_last: values.prioritizeFirstLast,
  };
}
