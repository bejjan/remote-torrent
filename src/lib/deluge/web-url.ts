/** Default listen port for `deluge-web`. */
export const DEFAULT_WEB_PORT = 8112;

const HAS_SCHEME = /^https?:\/\//i;

export class DelugeWebUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DelugeWebUrlError";
  }
}

function colonCount(value: string): number {
  return (value.match(/:/g) ?? []).length;
}

/**
 * Wrap bare IPv6 hosts so `new URL` can parse them.
 * `nas:8112` stays host:port; `fe80::1` becomes `[fe80::1]`.
 */
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
    throw new DelugeWebUrlError("Deluge Web URL must start with http:// or https://");
  }
  return `http://${bracketIpv6IfNeeded(trimmed)}`;
}

/** Port written in the string itself (not HTTP/HTTPS default 80/443). */
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

function formatTarget(protocol: string, hostname: string, port: string, pathname: string, search: string): string {
  const path = pathname === "/" ? "" : pathname.replace(/\/$/, "");
  return `${protocol}//${formatHost(hostname)}:${port}${path}${search}`;
}

/**
 * Turn a login-form value into the base URL we proxy to.
 * Blank stays blank (demo mode). Missing scheme → `http://`. Missing port → 8112.
 */
export function normalizeDelugeWebUrl(input: string, portOverride?: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const raw = ensureHttpUrl(trimmed);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new DelugeWebUrlError(
      "Invalid Deluge Web URL. Use protocol, host, and port — for example http://192.168.1.10:8112"
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new DelugeWebUrlError("Deluge Web URL must start with http:// or https://");
  }

  parsed.username = "";
  parsed.password = "";

  const override = portOverride?.trim();
  let port: string;
  if (override) {
    const n = Number(override);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      throw new DelugeWebUrlError("Port must be a number between 1 and 65535.");
    }
    port = String(n);
  } else {
    port = parsed.port || extractExplicitPort(raw) || String(DEFAULT_WEB_PORT);
  }

  return formatTarget(parsed.protocol, parsed.hostname, port, parsed.pathname, parsed.search);
}

export function applyPortToUrl(input: string, port: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    return normalizeDelugeWebUrl(trimmed, port.trim() || String(DEFAULT_WEB_PORT));
  } catch {
    return trimmed;
  }
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
