/** Default listen port for Transmission's web/RPC interface. */
export const DEFAULT_TRANSMISSION_PORT = 9091;
export const DEFAULT_TRANSMISSION_RPC_PATH = "/transmission/rpc";

const HAS_SCHEME = /^https?:\/\//i;

export class TransmissionUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransmissionUrlError";
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
    throw new TransmissionUrlError("Transmission RPC URL must start with http:// or https://");
  }
  return `http://${bracketIpv6IfNeeded(trimmed)}`;
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

function rpcPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "") || "";
  if (!trimmed || trimmed === "/") return DEFAULT_TRANSMISSION_RPC_PATH;
  if (trimmed.endsWith("/rpc")) return trimmed;
  if (trimmed.endsWith("/transmission")) return `${trimmed}/rpc`;
  if (trimmed.includes("/transmission/")) return trimmed;
  return `${trimmed}${DEFAULT_TRANSMISSION_RPC_PATH}`;
}

export function normalizeTransmissionRpcUrl(input: string, portOverride?: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const raw = ensureHttpUrl(trimmed);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new TransmissionUrlError(
      "Invalid Transmission RPC URL. Use protocol, host, and port — for example http://127.0.0.1:9091"
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TransmissionUrlError("Transmission RPC URL must start with http:// or https://");
  }

  parsed.username = "";
  parsed.password = "";

  const override = portOverride?.trim();
  let port: string;
  if (override) {
    const n = Number(override);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      throw new TransmissionUrlError("Port must be a number between 1 and 65535.");
    }
    port = String(n);
  } else {
    port = parsed.port || extractExplicitPort(raw) || String(DEFAULT_TRANSMISSION_PORT);
  }

  const path = rpcPath(parsed.pathname);
  return `${parsed.protocol}//${formatHost(parsed.hostname)}:${port}${path}${parsed.search}`;
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
