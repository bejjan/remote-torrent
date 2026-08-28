const UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"] as const;

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(value >= 100 || exp === 0 ? 0 : digits)} ${UNITS[exp]}`;
}

export function formatRate(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return "0 B/s";
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatLimit(kibPerSec: number): string {
  if (kibPerSec < 0) return "∞";
  if (kibPerSec === 0) return "0 KiB/s";
  return `${formatBytes(kibPerSec * 1024)}/s`;
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 365 * 24 * 3600) {
    return "∞";
  }
  const s = Math.round(seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio < 0) return "—";
  return ratio.toFixed(3);
}

export function formatProgress(progress: number): string {
  if (!Number.isFinite(progress)) return "0%";
  return `${progress.toFixed(progress >= 99.95 ? 0 : 1)}%`;
}

/** Deluge stores a 0-based queue; -1 means not in the download queue (seeding/finished). */
export function formatQueue(queue: number | null | undefined): string {
  if (queue == null || !Number.isFinite(queue) || queue < 0) return "—";
  return String(Math.trunc(queue) + 1);
}

/**
 * Connected peers/seeds plus tracker swarm size.
 * `total < 0` means unknown (tracker has not reported a count) — official Deluge
 * omits the parenthetical instead of painting `-1`.
 */
export function formatSwarmCount(connected: number, total: number): string {
  const n = Number.isFinite(connected) ? Math.trunc(connected) : 0;
  if (!Number.isFinite(total) || total < 0) return String(n);
  return `${n} (${Math.trunc(total)})`;
}

/** Queued torrents (queue >= 0) sort before unqueued (-1) in ascending order. */
export function compareQueue(
  a: number | null | undefined,
  b: number | null | undefined
): number {
  const aq = typeof a === "number" && Number.isFinite(a) && a >= 0 ? a : Number.POSITIVE_INFINITY;
  const bq = typeof b === "number" && Number.isFinite(b) && b >= 0 ? b : Number.POSITIVE_INFINITY;
  if (aq === bq) return 0;
  return aq - bq;
}

export function formatDate(epochSeconds: number): string {
  if (!epochSeconds) return "—";
  return new Date(epochSeconds * 1000).toLocaleString();
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  return formatEta(seconds);
}

export function trackerHost(url: string): string {
  try {
    const normalized = url.includes("://") ? url : `http://${url}`;
    const host = new URL(normalized).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function parseMagnetName(uri: string): string {
  try {
    const query = uri.includes("?") ? uri.slice(uri.indexOf("?") + 1) : uri;
    const params = new URLSearchParams(query);
    return params.get("dn") || params.get("xt") || "Magnet download";
  } catch {
    return "Magnet download";
  }
}
