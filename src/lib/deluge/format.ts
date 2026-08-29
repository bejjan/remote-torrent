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

/** Tracker-only labels that usually have no website favicon of their own. */
const TRACKER_SUBDOMAIN_PREFIXES = new Set(["tracker", "bt", "announce"]);

/**
 * `tracker_host` filter names are already hostnames (`ubuntu.com`).
 * Skip empty strings, the catch-all `All`, and anything that is not a
 * plausible DNS name or IPv4 address so we do not hit a favicon CDN.
 */
export function trackerFaviconHost(name: string): string | null {
  const host = name.trim();
  if (!isPlausibleFaviconHost(host)) return null;
  return host;
}

/**
 * Hosts to ask favicon CDNs for: the tracker hostname, then a likely
 * registrable domain after stripping a leading `tracker.` / `bt.` / `announce.`.
 */
export function trackerFaviconHostCandidates(name: string): string[] {
  const host = trackerFaviconHost(name);
  if (!host) return [];
  const stripped = stripTrackerSubdomainPrefix(host);
  if (stripped && stripped !== host && isPlausibleFaviconHost(stripped)) {
    return [host, stripped];
  }
  return [host];
}

/**
 * Favicon URLs in try-next-on-error order:
 * DuckDuckGo → Google s2 → Yandex, for the original host then the parent domain.
 */
export function trackerFaviconSources(name: string): string[] {
  const urls: string[] = [];
  for (const host of trackerFaviconHostCandidates(name)) {
    urls.push(
      duckDuckGoFaviconUrl(host),
      googleFaviconUrl(host),
      yandexFaviconUrl(host)
    );
  }
  return urls;
}

export function trackerFaviconUrl(name: string): string | null {
  return trackerFaviconSources(name)[0] ?? null;
}

/** First character of the host for a letter avatar when every image source fails. */
export function trackerFaviconLetter(name: string): string | null {
  const host = name.trim();
  if (!host) return null;
  const first = [...host][0];
  return first ? first.toUpperCase() : null;
}

/**
 * Google s2 with `sz=32` still returns a 16×16 default globe when the site has
 * no favicon (HTTP 200). Treat that as a miss so we can try the next source.
 * Tiny or empty bitmaps from any CDN are also unusable.
 */
export function isUnusableTrackerFavicon(img: {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}): boolean {
  if (!Number.isFinite(img.naturalWidth) || !Number.isFinite(img.naturalHeight)) return true;
  if (img.naturalWidth < 2 || img.naturalHeight < 2) return true;
  if (img.src.includes("google.com/s2/favicons") && img.naturalWidth < 32) return true;
  return false;
}

function duckDuckGoFaviconUrl(host: string): string {
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`;
}

function googleFaviconUrl(host: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
}

function yandexFaviconUrl(host: string): string {
  return `https://favicon.yandex.net/favicon/${encodeURIComponent(host)}`;
}

function stripTrackerSubdomainPrefix(host: string): string | null {
  const labels = host.split(".");
  if (labels.length < 3) return null;
  const head = labels[0]?.toLowerCase();
  if (!head || !TRACKER_SUBDOMAIN_PREFIXES.has(head)) return null;
  return labels.slice(1).join(".");
}

function isPlausibleFaviconHost(host: string): boolean {
  if (!host || host.length > 253) return false;
  if (/[\s/\\?#:]/.test(host)) return false;
  const candidate = host.endsWith(".") ? host.slice(0, -1) : host;
  if (!candidate) return false;
  if (candidate.toLowerCase() === "localhost") return true;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(candidate)) {
    return candidate.split(".").every((octet) => {
      const n = Number(octet);
      return n >= 0 && n <= 255;
    });
  }
  const labels = candidate.split(".");
  if (labels.length < 2) return false;
  return labels.every((label) =>
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label)
  );
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
