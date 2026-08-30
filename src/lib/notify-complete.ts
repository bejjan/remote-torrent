import { parseMagnetInfoHash } from "@/lib/deluge/files-tree";
import { normalizeTorrentName } from "@/lib/deluge/torrent-name";
import { readLocalStorage, storageKey, writeLocalStorage } from "@/lib/storage";

export const NOTIFY_ON_COMPLETE_STORAGE_KEY = storageKey("notify-on-complete");
export const NOTIFY_TORRENT_IDS_STORAGE_KEY = storageKey("notify-torrent-ids");

/** Polls to watch for magnet / add IDs that appear after a successful add. */
export const PENDING_NOTIFY_POLLS = 30;

const TRANSIENT_STATES = new Set(["Checking", "Moving", "Allocating"]);

export type NotifyPermission = NotificationPermission | "unsupported";

export interface TorrentFinishSnapshot {
  state?: string;
  progress?: number;
  is_finished?: boolean;
}

export interface TorrentFinishRow extends TorrentFinishSnapshot {
  name?: string;
}

let sessionSeenIds = new Set<string>();
let snapshotBeforeAdd = new Set<string>();
let pendingPolls = 0;
let prevSnapshots = new Map<string, TorrentFinishSnapshot>();

export function parseNotifyOnComplete(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const value = raw.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function loadNotifyOnComplete(): boolean {
  return parseNotifyOnComplete(readLocalStorage(NOTIFY_ON_COMPLETE_STORAGE_KEY));
}

export function saveNotifyOnComplete(enabled: boolean) {
  writeLocalStorage(NOTIFY_ON_COMPLETE_STORAGE_KEY, enabled ? "1" : "0");
}

export function parseNotifyTorrentIds(raw: string | null | undefined): string[] {
  if (raw == null || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const ids = new Set<string>();
    for (const item of parsed) {
      const id = normalizeTorrentId(item);
      if (id) ids.add(id);
    }
    return [...ids];
  } catch {
    return [];
  }
}

export function loadNotifyTorrentIds(): Set<string> {
  return new Set(parseNotifyTorrentIds(readLocalStorage(NOTIFY_TORRENT_IDS_STORAGE_KEY)));
}

export function saveNotifyTorrentIds(ids: Iterable<string>) {
  const unique = [...new Set([...ids].map((id) => id.trim()).filter(Boolean))];
  writeLocalStorage(NOTIFY_TORRENT_IDS_STORAGE_KEY, JSON.stringify(unique));
}

export function addNotifyTorrentIds(ids: Iterable<string>): Set<string> {
  const next = loadNotifyTorrentIds();
  for (const id of ids) {
    const normalized = normalizeTorrentId(id);
    if (normalized) next.add(normalized);
  }
  saveNotifyTorrentIds(next);
  return next;
}

export function removeNotifyTorrentIds(ids: Iterable<string>): Set<string> {
  const next = loadNotifyTorrentIds();
  for (const id of ids) {
    const normalized = normalizeTorrentId(id);
    if (normalized) next.delete(normalized);
  }
  saveNotifyTorrentIds(next);
  return next;
}

export function pruneNotifyTorrentIds(liveIds: Iterable<string>): Set<string> {
  const live = new Set([...liveIds].map((id) => normalizeTorrentId(id)).filter(Boolean));
  const next = new Set<string>();
  for (const id of loadNotifyTorrentIds()) {
    if (live.has(id)) next.add(id);
  }
  saveNotifyTorrentIds(next);
  return next;
}

export function normalizeTorrentId(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[0-9a-fA-F]{32}$/.test(trimmed) || /^[0-9a-fA-F]{40}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

export function extractAddedTorrentIds(result: unknown): string[] {
  const ids = new Set<string>();
  collectAddedTorrentIds(result, ids);
  return [...ids];
}

function collectAddedTorrentIds(value: unknown, ids: Set<string>) {
  if (value == null || value === true || value === false) return;
  if (typeof value === "number" && Number.isFinite(value)) {
    ids.add(String(value));
    return;
  }
  if (typeof value === "string") {
    const id = normalizeTorrentId(value);
    if (id && id !== "true" && id !== "false") ids.add(id);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === "boolean") {
      collectAddedTorrentIds(value[1], ids);
      return;
    }
    for (const item of value) collectAddedTorrentIds(item, ids);
    return;
  }
  if (typeof value !== "object") return;
  const rec = value as Record<string, unknown>;
  if ("torrent-added" in rec) collectAddedTorrentIds(rec["torrent-added"], ids);
  if ("torrent-duplicate" in rec) collectAddedTorrentIds(rec["torrent-duplicate"], ids);
  const hash = rec.hashString ?? rec.hash ?? rec.info_hash ?? rec.infoHash;
  const torrentId = rec.torrent_id ?? rec.torrentId;
  if (typeof hash === "string" && hash.trim()) ids.add(normalizeTorrentId(hash));
  if (typeof torrentId === "string" && torrentId.trim()) ids.add(normalizeTorrentId(torrentId));
  if (typeof torrentId === "number" && Number.isFinite(torrentId)) ids.add(String(torrentId));
  if (typeof rec.id === "number" && Number.isFinite(rec.id)) ids.add(String(rec.id));
  if (typeof rec.id === "string" && rec.id.trim() && hash == null && torrentId == null) {
    ids.add(normalizeTorrentId(rec.id));
  }
}

export function torrentIdsFromAddForm(opts: { infoHash?: string; magnetText?: string }): string[] {
  const ids = new Set<string>();
  const hash = normalizeTorrentId(opts.infoHash ?? "");
  if (hash) ids.add(hash);
  if (opts.magnetText) {
    for (const line of opts.magnetText.split(/\n+/)) {
      const magnetHash = parseMagnetInfoHash(line.trim());
      if (magnetHash) ids.add(magnetHash);
    }
  }
  return [...ids];
}

export function isDownloadFinished(row: TorrentFinishSnapshot | undefined): boolean {
  if (!row) return false;
  const state = row.state ?? "";
  if (TRANSIENT_STATES.has(state)) return false;
  if (row.is_finished === true) return true;
  if ((row.progress ?? 0) >= 100) return true;
  return state === "Seeding";
}

/**
 * Notify only when an incomplete download becomes finished.
 * Recheck / move of an already-complete torrent must not fire.
 */
export function shouldNotifyDownloadFinished(
  prev: TorrentFinishSnapshot | undefined,
  next: TorrentFinishSnapshot
): boolean {
  if (!prev) return false;
  if (isDownloadFinished(prev)) return false;
  if (!isDownloadFinished(next)) return false;
  if (prev.state === "Checking" || prev.state === "Moving") {
    return (prev.progress ?? 0) < 99;
  }
  return true;
}

export function snapshotTorrentFinish(row: TorrentFinishRow): TorrentFinishSnapshot {
  return {
    state: row.state,
    progress: row.progress,
    is_finished: row.is_finished,
  };
}

export function notificationsSupported(): boolean {
  return typeof Notification !== "undefined";
}

export function currentNotifyPermission(): NotifyPermission {
  if (!notificationsSupported()) return "unsupported";
  try {
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

export async function requestNotifyPermissionFromGesture(): Promise<NotifyPermission> {
  if (!notificationsSupported()) return "unsupported";
  try {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

/** One-line add-dialog hint for empty / denied / missing Notification. */
export function notifyPermissionHint(
  permission: NotifyPermission,
  enabled: boolean
): string | null {
  if (permission === "unsupported") {
    return enabled
      ? "Notifications are not available in this browser."
      : null;
  }
  if (permission === "denied") {
    return "Notifications are blocked in the browser. Allow them in site settings.";
  }
  if (enabled && permission === "default") {
    return "Your browser will ask for permission to show notifications.";
  }
  return null;
}

export function showDownloadFinishedNotification(name: string) {
  if (!notificationsSupported()) return;
  try {
    if (Notification.permission !== "granted") return;
    const notification = new Notification("Download finished", {
      body: normalizeTorrentName(name || "Torrent"),
    });
    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      notification.close();
    };
  } catch {
    /* insecure context, missing Notification, or user-agent block */
  }
}

/** Snapshot current session IDs, then register torrents that appear after add. */
export function beginNotifyAdd() {
  snapshotBeforeAdd = new Set(sessionSeenIds);
  pendingPolls = PENDING_NOTIFY_POLLS;
}

export function cancelNotifyAdd() {
  pendingPolls = 0;
}

export function registerNotifyTorrentIds(
  ids: Iterable<string>,
  opts?: { seedIncomplete?: boolean }
): Set<string> {
  const added = addNotifyTorrentIds(ids);
  if (opts?.seedIncomplete) {
    for (const id of ids) {
      const normalized = normalizeTorrentId(id);
      if (!normalized) continue;
      if (!prevSnapshots.has(normalized)) {
        prevSnapshots.set(normalized, { state: "Downloading", progress: 0, is_finished: false });
      }
    }
  }
  return added;
}

export function rememberRemovedTorrentIds(ids: Iterable<string>) {
  removeNotifyTorrentIds(ids);
  for (const id of ids) {
    const normalized = normalizeTorrentId(id);
    if (!normalized) continue;
    prevSnapshots.delete(normalized);
    sessionSeenIds.delete(normalized);
  }
}

export function processDownloadFinishedNotifications(
  torrents: Record<string, TorrentFinishRow> | null | undefined,
  opts?: { pruneMissing?: boolean }
): { id: string; name: string }[] {
  if (!torrents) return [];
  const liveIds = Object.keys(torrents);
  for (const id of liveIds) sessionSeenIds.add(id);

  if (pendingPolls > 0) {
    const discovered: string[] = [];
    for (const id of liveIds) {
      if (!snapshotBeforeAdd.has(id)) discovered.push(id);
    }
    if (discovered.length) addNotifyTorrentIds(discovered);
    pendingPolls -= 1;
  }

  if (opts?.pruneMissing !== false) pruneNotifyTorrentIds(liveIds);

  const notifyIds = loadNotifyTorrentIds();
  const events: { id: string; name: string }[] = [];
  const nextPrev = new Map(prevSnapshots);

  for (const id of liveIds) {
    const row = torrents[id];
    const snap = snapshotTorrentFinish(row);
    const prev = prevSnapshots.get(id);
    if (prev && notifyIds.has(id) && shouldNotifyDownloadFinished(prev, snap)) {
      const name = typeof row.name === "string" ? row.name : "Torrent";
      events.push({ id, name });
    }
    nextPrev.set(id, snap);
  }

  for (const id of [...nextPrev.keys()]) {
    if (!torrents[id] && !notifyIds.has(id)) nextPrev.delete(id);
  }
  prevSnapshots = nextPrev;

  for (const event of events) {
    showDownloadFinishedNotification(event.name);
  }
  return events;
}

/** Test helper — wipe in-memory watch state (not localStorage). */
export function resetNotifyCompleteMemory() {
  sessionSeenIds = new Set();
  snapshotBeforeAdd = new Set();
  pendingPolls = 0;
  prevSnapshots = new Map();
}
