import { compareQueue } from "@/lib/deluge/format";
import type { TorrentStatus } from "@/lib/deluge/types";
import { normalizeSearchText } from "@/lib/highlight-text";

export type TorrentSortKey = keyof TorrentStatus | "id";

export type TorrentRowEntry = [id: string, torrent: TorrentStatus];

export function filterAndSortTorrents(
  torrents: Record<string, TorrentStatus> | null | undefined,
  search: string,
  sortKey: TorrentSortKey,
  sortDir: "asc" | "desc"
): TorrentRowEntry[] {
  const entries = Object.entries(torrents || {}) as TorrentRowEntry[];
  const q = normalizeSearchText(search);
  const filtered = q
    ? entries.filter(([, t]) => normalizeSearchText(t.name).includes(q))
    : entries;
  filtered.sort((a, b) => {
    if (sortKey === "id") {
      const cmp = a[0].localeCompare(b[0]);
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (sortKey === "queue") {
      const cmp = compareQueue(a[1].queue, b[1].queue);
      return sortDir === "asc" ? cmp : -cmp;
    }
    const av = a[1][sortKey];
    const bv = b[1][sortKey];
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const as = String(av ?? "");
    const bs = String(bv ?? "");
    return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  });
  return filtered;
}

/** Reuse the previous row array when ids and torrent object identities match in order. */
export function reuseTorrentRows(prev: TorrentRowEntry[], next: TorrentRowEntry[]): TorrentRowEntry[] {
  if (prev.length !== next.length) return next;
  for (let i = 0; i < next.length; i++) {
    if (prev[i][0] !== next[i][0] || prev[i][1] !== next[i][1]) return next;
  }
  return prev;
}
