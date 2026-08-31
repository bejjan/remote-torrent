/** Default listen port for qBittorrent's Web UI. */
export const DEFAULT_QBITTORRENT_PORT = 8080;

const HAS_SCHEME = /^https?:\/\//i;
const API_SUFFIX = "/api/v2";

export class QbittorrentUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QbittorrentUrlError";
  }
}

function colonCount(value: string): number {
  return (value.match(/:/g) ?? []).length;
}

function bracketIpv6IfNeeded(hostPort: string): string {
  if (hostPort.startsWith("[")) return hostPort;
  if (colonCount(hostPort) < 2) return hostPort;
  const withPort = hostPort.match(/^(.*):(\d+)$/);
  if (withPort && colonCount(withPort[1]) >= 2) {
    return `[${withPort[1]}]:${withPort[2]}`;
  }
  return `[${hostPort}]`;
}

function ensureHttpUrl(input: string): string {
  const trimmed = input.trim();
  if (HAS_SCHEME.test(trimmed)) return trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    throw new QbittorrentUrlError("qBittorrent Web URL must start with http:// or https://");
  }
  return `http://${bracketIpv6IfNeeded(trimmed)}`;
}

/** HTTPS without a port is almost always a reverse proxy on 443, not :8080. */
export function defaultQbittorrentPort(protocol: string): string {
  return protocol === "https:" ? "443" : String(DEFAULT_QBITTORRENT_PORT);
}

export function suggestedQbittorrentPort(input: string): string {
  const explicit = extractExplicitPort(input);
  if (explicit) return explicit;
  return /^https:\/\//i.test(input.trim())
    ? "443"
    : String(DEFAULT_QBITTORRENT_PORT);
}

export function extractExplicitPort(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withScheme = ensureHttpUrl(trimmed);
    const match = withScheme.match(
      /^https?:\/\/(?:[^/?#]*@)?(?:\[[^\]]+\]|[^/?#:]+)(?::(\d+))?/i
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function formatHost(hostname: string): string {
  if (hostname.startsWith("[")) return hostname;
  if (hostname.includes(":")) return `[${hostname}]`;
  return hostname;
}

/** Strip `/api/v2` but keep reverse-proxy prefixes such as `/qbittorrent`. */
function webPath(pathname: string): string {
  let trimmed = pathname.replace(/\/+$/, "") || "";
  if (trimmed.endsWith(API_SUFFIX)) {
    trimmed = trimmed.slice(0, -API_SUFFIX.length).replace(/\/+$/, "");
  }
  if (!trimmed || trimmed === "/") return "";
  return trimmed;
}

export function normalizeQbittorrentWebUrl(input: string, portOverride?: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const raw = ensureHttpUrl(trimmed);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new QbittorrentUrlError(
      "Invalid qBittorrent Web URL. Use protocol, host, and port — for example http://127.0.0.1:8080"
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new QbittorrentUrlError("qBittorrent Web URL must start with http:// or https://");
  }

  parsed.username = "";
  parsed.password = "";

  const override = portOverride?.trim();
  let port: string;
  if (override) {
    const n = Number(override);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      throw new QbittorrentUrlError("Port must be a number between 1 and 65535.");
    }
    port = String(n);
  } else {
    port = parsed.port || extractExplicitPort(raw) || defaultQbittorrentPort(parsed.protocol);
  }

  const path = webPath(parsed.pathname);
  return `${parsed.protocol}//${formatHost(parsed.hostname)}:${port}${path}${parsed.search}`;
}

export function qbittorrentWebOrigin(target: string): string {
  return new URL(target).origin;
}

export function sanitizePublicUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}
