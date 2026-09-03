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

export function pruneNotifyTorrentIds(
  liveIds: Iterable<string>,
  seenIds?: Iterable<string>
): Set<string> {
  const live = new Set([...liveIds].map((id) => normalizeTorrentId(id)).filter(Boolean));
  const seen = seenIds
    ? new Set([...seenIds].map((id) => normalizeTorrentId(id)).filter(Boolean))
    : null;
  const next = new Set<string>();
  for (const id of loadNotifyTorrentIds()) {
    if (live.has(id)) next.add(id);
    else if (seen && !seen.has(id)) next.add(id);
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
  return state === "Seeding" || state === "Finished";
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

export const NOTIFY_INSECURE_CONTEXT_MESSAGE =
  "Notifications need https or http://localhost — a LAN IP will not ask for permission.";

function readNotifyWindow(): { isSecureContext?: boolean; location?: { hostname?: string } } | undefined {
  if (typeof window !== "undefined") return window;
  return (globalThis as { window?: { isSecureContext?: boolean; location?: { hostname?: string } } })
    .window;
}

export function isNotifySecureContext(ctx?: {
  isSecureContext?: boolean;
  hostname?: string;
}): boolean {
  const win = readNotifyWindow();
  const secure = ctx?.isSecureContext ?? win?.isSecureContext;
  if (secure === true) return true;
  const host = ctx?.hostname ?? win?.location?.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
  if (secure === false) return false;
  return true;
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

/**
 * Start the browser permission prompt in this turn.
 * Must be called from a user gesture — do not await unrelated work first.
 */
export function requestNotifyPermissionFromGesture(): Promise<NotifyPermission> {
  if (!isNotifySecureContext()) return Promise.resolve("unsupported");
  if (!notificationsSupported()) return Promise.resolve("unsupported");
  try {
    if (Notification.permission !== "default") {
      return Promise.resolve(Notification.permission);
    }
    const pending = Notification.requestPermission();
    return Promise.resolve(pending).then(
      (value) =>
        value === "granted" || value === "denied" || value === "default"
          ? value
          : Notification.permission,
      () => "unsupported" as NotifyPermission
    );
  } catch {
    return Promise.resolve("unsupported");
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

export type NotifyDeliveryReason = "unsupported" | "denied" | "insecure" | "error";

export type NotifyDeliveryResult =
  | { ok: true }
  | { ok: false; reason: NotifyDeliveryReason; message: string };

export function notifyDeliveryFailure(
  permission: NotifyPermission,
  secure = isNotifySecureContext()
): NotifyDeliveryResult {
  if (!secure) {
    return { ok: false, reason: "insecure", message: NOTIFY_INSECURE_CONTEXT_MESSAGE };
  }
  if (permission === "unsupported") {
    return {
      ok: false,
      reason: "unsupported",
      message: notifyPermissionHint("unsupported", true) ?? "Notifications are not available in this browser.",
    };
  }
  return {
    ok: false,
    reason: "denied",
    message:
      notifyPermissionHint(permission, true) ??
      "Notifications are blocked in the browser. Allow them in site settings.",
  };
}

export function showDownloadFinishedNotification(name: string): NotifyDeliveryResult {
  if (!isNotifySecureContext()) {
    return { ok: false, reason: "insecure", message: NOTIFY_INSECURE_CONTEXT_MESSAGE };
  }
  if (!notificationsSupported()) {
    return notifyDeliveryFailure("unsupported");
  }
  try {
    if (Notification.permission !== "granted") {
      return notifyDeliveryFailure(currentNotifyPermission());
    }
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
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message:
        err instanceof Error && err.message.trim()
          ? err.message
          : "The browser blocked the notification.",
    };
  }
}

export const NOTIFY_TEST_TORRENT_ID = "__torro_notify_test__";
export const NOTIFY_TEST_TORRENT_NAME = "Example torrent";

export function simulateFinishedDownloadNotification(
  name = NOTIFY_TEST_TORRENT_NAME
): {
  events: { id: string; name: string; delivery: NotifyDeliveryResult }[];
  delivery: NotifyDeliveryResult;
} {
  const id = normalizeTorrentId(NOTIFY_TEST_TORRENT_ID);
  prevSnapshots.delete(id);
  sessionSeenIds.delete(id);
  registerNotifyTorrentIds([id], { seedIncomplete: true });
  const events = processDownloadFinishedNotifications(
    {
      [id]: { name, state: "Seeding", progress: 100, is_finished: true },
    },
    { pruneMissing: false }
  );
  removeNotifyTorrentIds([id]);
  prevSnapshots.delete(id);
  sessionSeenIds.delete(id);
  return {
    events,
    delivery:
      events[0]?.delivery ?? {
        ok: false,
        reason: "error",
        message: "Finish watcher did not fire for the test torrent.",
      },
  };
}

/** Permission prompt (gesture-safe) then the same finish watcher + `new Notification`. */
export async function testDownloadFinishedNotificationFromGesture(): Promise<NotifyDeliveryResult> {
  if (!isNotifySecureContext()) {
    return { ok: false, reason: "insecure", message: NOTIFY_INSECURE_CONTEXT_MESSAGE };
  }
  const permission = await requestNotifyPermissionFromGesture();
  if (permission !== "granted") {
    return notifyDeliveryFailure(permission);
  }
  return simulateFinishedDownloadNotification().delivery;
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
  const rows = Object.entries(torrents).map(([rawId, row]) => ({
    id: normalizeTorrentId(rawId) || rawId,
    row,
  }));
  for (const { id } of rows) sessionSeenIds.add(id);

  if (pendingPolls > 0) {
    const discovered: string[] = [];
    for (const { id } of rows) {
      if (!snapshotBeforeAdd.has(id)) discovered.push(id);
    }
    if (discovered.length) {
      addNotifyTorrentIds(discovered);
      // Same seed as registerNotifyTorrentIds({ seedIncomplete }) so a torrent
      // that first appears already finished still transitions incomplete → done.
      for (const id of discovered) {
        if (!prevSnapshots.has(id)) {
          prevSnapshots.set(id, { state: "Downloading", progress: 0, is_finished: false });
        }
      }
    }
    pendingPolls -= 1;
  }

  if (opts?.pruneMissing !== false) {
    pruneNotifyTorrentIds(
      rows.map((item) => item.id),
      sessionSeenIds
    );
  }

  const notifyIds = loadNotifyTorrentIds();
  const events: { id: string; name: string; delivery: NotifyDeliveryResult }[] = [];
  const nextPrev = new Map(prevSnapshots);
  const liveNormalized = new Set(rows.map((item) => item.id));

  for (const { id, row } of rows) {
    const snap = snapshotTorrentFinish(row);
    const prev = prevSnapshots.get(id);
    if (prev && notifyIds.has(id) && shouldNotifyDownloadFinished(prev, snap)) {
      const name = typeof row.name === "string" ? row.name : "Torrent";
      events.push({ id, name, delivery: showDownloadFinishedNotification(name) });
    }
    nextPrev.set(id, snap);
  }

  for (const id of [...nextPrev.keys()]) {
    if (!liveNormalized.has(id) && !notifyIds.has(id)) nextPrev.delete(id);
  }
  prevSnapshots = nextPrev;

  return events;
}

/** Test helper — wipe in-memory watch state (not localStorage). */
export function resetNotifyCompleteMemory() {
  sessionSeenIds = new Set();
  snapshotBeforeAdd = new Set();
  pendingPolls = 0;
  prevSnapshots = new Map();
}
