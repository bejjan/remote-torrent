import { GRID_KEYS } from "@/lib/deluge/keys";
import type { SessionStats, TorrentStatus, UiUpdate } from "@/lib/deluge/types";

/** Compare the fields the torrent grid actually renders / sorts on. */
export function torrentStatusEqual(a: TorrentStatus, b: TorrentStatus): boolean {
  if (a === b) return true;
  for (const key of GRID_KEYS) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Reuse previous torrent object identities when `web.update_ui` returns the same
 * field values. Rows that did not change can then skip React work.
 */
export function reuseTorrentMap(
  prev: Record<string, TorrentStatus> | null | undefined,
  next: Record<string, TorrentStatus> | null
): Record<string, TorrentStatus> | null {
  if (!next) return next;
  if (!prev) return next;

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  let changed = prevKeys.length !== nextKeys.length;
  const out: Record<string, TorrentStatus> = {};

  for (const id of nextKeys) {
    const incoming = next[id];
    const existing = prev[id];
    const reused =
      existing && torrentStatusEqual(existing, incoming) ? existing : incoming;
    out[id] = reused;
    if (reused !== existing) changed = true;
  }

  if (!changed) return prev;
  return out;
}

function statsEqual(a: SessionStats, b: SessionStats): boolean {
  if (a === b) return true;
  return (
    a.max_download === b.max_download &&
    a.max_upload === b.max_upload &&
    a.max_num_connections === b.max_num_connections &&
    a.num_connections === b.num_connections &&
    a.upload_rate === b.upload_rate &&
    a.download_rate === b.download_rate &&
    a.download_protocol_rate === b.download_protocol_rate &&
    a.upload_protocol_rate === b.upload_protocol_rate &&
    a.dht_nodes === b.dht_nodes &&
    a.has_incoming_connections === b.has_incoming_connections &&
    a.free_space === b.free_space &&
    a.external_ip === b.external_ip
  );
}

/**
 * Merge a poll result into the previous UI snapshot, preserving object identity
 * for unchanged torrents / stats so the table does not remount or rebuild rows.
 */
export function mergeUiUpdate(prev: UiUpdate | null, next: UiUpdate): UiUpdate {
  if (!prev) return next;

  const torrents = reuseTorrentMap(prev.torrents, next.torrents);
  const stats =
    prev.stats && next.stats && statsEqual(prev.stats, next.stats) ? prev.stats : next.stats;
  const filters = next.filters;

  if (
    prev.connected === next.connected &&
    torrents === prev.torrents &&
    filters === prev.filters &&
    stats === prev.stats
  ) {
    return prev;
  }

  return { connected: next.connected, torrents, filters, stats };
}
