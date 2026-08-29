import { decodeHtmlEntities } from "@/lib/html-entities";
import type { TorrentStatus } from "@/lib/deluge/types";

/** Decode HTML entities in a torrent name exactly once. */
export function normalizeTorrentName(name: string): string {
  return decodeHtmlEntities(name);
}

/**
 * Normalize `name` when a torrent status first enters UI state.
 * Returns the same object when the name is already decoded.
 */
export function normalizeTorrentStatus<T extends { name?: unknown }>(status: T): T {
  if (typeof status.name !== "string") return status;
  const name = normalizeTorrentName(status.name);
  if (name === status.name) return status;
  return { ...status, name };
}

/** Decode names in a torrent map. Reuses the map when nothing changed. */
export function normalizeTorrentMap(
  torrents: Record<string, TorrentStatus> | null | undefined
): Record<string, TorrentStatus> | null {
  if (!torrents) return torrents ?? null;
  let changed = false;
  const out: Record<string, TorrentStatus> = {};
  for (const id of Object.keys(torrents)) {
    const incoming = normalizeTorrentStatus(torrents[id]);
    out[id] = incoming;
    if (incoming !== torrents[id]) changed = true;
  }
  return changed ? out : torrents;
}
