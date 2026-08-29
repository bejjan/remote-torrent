import { Agent, fetch as undiciFetch } from "undici";
import { NextRequest, NextResponse } from "next/server";
import { normalizeDelugeWebUrl, sanitizePublicUrl } from "@/lib/deluge/web-url";

export const PROXY_TIMEOUT_MS = 15_000;

const insecureDispatcher = new Agent({
  connect: { rejectUnauthorized: false, timeout: PROXY_TIMEOUT_MS },
  bodyTimeout: PROXY_TIMEOUT_MS,
  headersTimeout: PROXY_TIMEOUT_MS,
});

const secureDispatcher = new Agent({
  connect: { timeout: PROXY_TIMEOUT_MS },
  bodyTimeout: PROXY_TIMEOUT_MS,
  headersTimeout: PROXY_TIMEOUT_MS,
});

export function tlsInsecureEnabled(req: NextRequest): boolean {
  const headers = [
    req.headers.get("x-deluge-tls-insecure"),
    req.headers.get("x-transmission-tls-insecure"),
    req.headers.get("x-torrent-tls-insecure"),
  ];
  if (headers.some((value) => value?.trim().toLowerCase() === "1" || value?.trim().toLowerCase() === "true")) {
    return true;
  }
  const env = [process.env.DELUGE_TLS_INSECURE, process.env.TRANSMISSION_TLS_INSECURE];
  return env.some((value) => value?.trim().toLowerCase() === "1" || value?.trim().toLowerCase() === "true");
}

export function shouldUseDemo(target: string): boolean {
  return process.env.DELUGE_DEMO === "1" || process.env.DELUGE_DEMO === "true" || !target;
}

export function resolveDelugeTarget(req: NextRequest): {
  target: string;
  demo: boolean;
  error?: string;
} {
  // Private/LAN hosts are allowed; this app's purpose is to reach a home NAS.
  const raw =
    req.headers.get("x-deluge-url")?.trim() || process.env.DELUGE_WEB_URL?.trim() || "";
  if (!raw) return { target: "", demo: shouldUseDemo("") };
  try {
    const target = normalizeDelugeWebUrl(raw);
    return { target, demo: shouldUseDemo(target) };
  } catch (err) {
    return {
      target: "",
      demo: false,
      error: err instanceof Error ? err.message : "Invalid Deluge Web URL",
    };
  }
}

export function rewriteSetCookie(value: string): string {
  let next = value
    .replace(/;\s*Domain=[^;]*/gi, "")
    .replace(/;\s*Secure/gi, "")
    .replace(/;\s*SameSite=[^;]*/gi, "");
  if (/;\s*Path=/i.test(next)) {
    next = next.replace(/;\s*Path=[^;]*/gi, "; Path=/");
  } else {
    next += "; Path=/";
  }
  if (!/;\s*SameSite=/i.test(next)) {
    next += "; SameSite=Lax";
  }
  return next;
}

type ErrorLike = {
  name?: string;
  message?: string;
  code?: string;
  cause?: unknown;
  errors?: unknown[];
};

function walkErrorCodes(err: unknown, seen = new Set<unknown>()): string[] {
  if (!err || typeof err !== "object" || seen.has(err)) return [];
  seen.add(err);
  const e = err as ErrorLike;
  const codes: string[] = [];
  if (typeof e.code === "string") codes.push(e.code);
  if (typeof e.name === "string") codes.push(e.name);
  if (Array.isArray(e.errors)) {
    for (const nested of e.errors) codes.push(...walkErrorCodes(nested, seen));
  }
  if (e.cause) codes.push(...walkErrorCodes(e.cause, seen));
  return codes;
}

function walkErrorMessages(err: unknown, seen = new Set<unknown>()): string[] {
  if (!err || typeof err !== "object" || seen.has(err)) return [];
  seen.add(err);
  const e = err as ErrorLike;
  const messages: string[] = [];
  if (typeof e.message === "string" && e.message.trim()) messages.push(e.message);
  if (Array.isArray(e.errors)) {
    for (const nested of e.errors) messages.push(...walkErrorMessages(nested, seen));
  }
  if (e.cause) messages.push(...walkErrorMessages(e.cause, seen));
  return messages;
}

function stripSecrets(text: string): string {
  return text
    .replace(/[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/\s'"]+/g, (url) => sanitizePublicUrl(url))
    .replace(/(password|passwd|pwd|secret|token)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 400);
}

export function describeProxyError(err: unknown, target: string, service = "Deluge Web"): string {
  const where = target ? ` (${sanitizePublicUrl(target)})` : "";
  const codes = walkErrorCodes(err);
  const rawMessages = walkErrorMessages(err);
  const messages = rawMessages.join(" ").toLowerCase();
  const usefulMessage =
    rawMessages.find((m) => m.trim() && m.toLowerCase() !== "fetch failed") ||
    rawMessages[0] ||
    (err instanceof Error ? err.message : "Proxy failure");
  const codeSet = new Set(codes);

  const isTimeout =
    codeSet.has("TimeoutError") ||
    codeSet.has("AbortError") ||
    codeSet.has("UND_ERR_CONNECT_TIMEOUT") ||
    codeSet.has("UND_ERR_HEADERS_TIMEOUT") ||
    codeSet.has("UND_ERR_BODY_TIMEOUT") ||
    messages.includes("timeout") ||
    messages.includes("aborted") ||
    (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"));

  if (isTimeout) {
    return `Timed out after ${PROXY_TIMEOUT_MS / 1000}s connecting to ${service}${where}. Check the URL and that the daemon is running.`;
  }
  if (codeSet.has("ECONNREFUSED")) {
    return `Connection refused (ECONNREFUSED)${where}. Is ${service} running at that host and port?`;
  }
  if (codeSet.has("ENOTFOUND") || codeSet.has("EAI_AGAIN")) {
    const code = codeSet.has("ENOTFOUND") ? "ENOTFOUND" : "EAI_AGAIN";
    return `Hostname not found (${code})${where}. Check the ${service} URL.`;
  }
  if (codeSet.has("EHOSTUNREACH") || codeSet.has("ENETUNREACH")) {
    const code = codeSet.has("EHOSTUNREACH") ? "EHOSTUNREACH" : "ENETUNREACH";
    return `Host unreachable (${code})${where}. Confirm this server can reach that LAN address.`;
  }
  if (codeSet.has("ECONNRESET") || codeSet.has("EPIPE") || codeSet.has("UND_ERR_SOCKET")) {
    return `Connection reset while talking to ${service}${where}.`;
  }

  const certCodes = [
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "CERT_HAS_EXPIRED",
    "CERT_NOT_YET_VALID",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "ERR_TLS_CERT_ALTNAME_INVALID",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  ];
  const certHit = certCodes.find((c) => codeSet.has(c));
  const looksLikeTls =
    Boolean(certHit) ||
    messages.includes("certificate") ||
    messages.includes("self-signed") ||
    messages.includes("ssl") ||
    messages.includes("tls") ||
    messages.includes("unable to verify");
  if (looksLikeTls) {
    const label = certHit ? ` (${certHit})` : "";
    return `TLS certificate error${label}${where}. Enable “Allow self-signed TLS” on the login screen, or set DELUGE_TLS_INSECURE=1.`;
  }

  if (messages.includes("bad port")) {
    return `Invalid or blocked port in Deluge Web URL${where}. Use the deluge-web port (default 8112).`;
  }

  const detail = stripSecrets(usefulMessage);
  return `Cannot reach ${service}${where}: ${detail}`;
}

function looksLikeJson(text: string): boolean {
  const start = text.trimStart();
  return start.startsWith("{") || start.startsWith("[");
}

function setCookiesFrom(headers: { getSetCookie?: () => string[]; get: (name: string) => string | null }): string[] {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function applyCookies(res: NextResponse, headers: { getSetCookie?: () => string[]; get: (name: string) => string | null }) {
  for (const cookie of setCookiesFrom(headers)) {
    res.headers.append("Set-Cookie", rewriteSetCookie(cookie));
  }
}

export function jsonRpcError(id: unknown, message: string, status = 502): NextResponse {
  return NextResponse.json(
    { id: id ?? null, result: null, error: { message } },
    { status }
  );
}

export function uploadError(message: string, status = 502): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function proxyDeluge(
  req: NextRequest,
  target: string,
  path: "/json" | "/upload",
  init: {
    method: string;
    headers?: Record<string, string>;
    body: string | FormData | Buffer | Uint8Array;
    rpcId?: unknown;
  }
): Promise<NextResponse> {
  const url = `${target}${path}`;
  const headers: Record<string, string> = { ...init.headers };
  const cookie = req.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const fail = (message: string, status = 502) =>
    path === "/upload" ? uploadError(message, status) : jsonRpcError(init.rpcId ?? null, message, status);

  try {
    const upstream = await undiciFetch(url, {
      method: init.method,
      headers,
      body: init.body as never,
      dispatcher: tlsInsecureEnabled(req) ? insecureDispatcher : secureDispatcher,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      redirect: "follow",
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "";
    const json = contentType.includes("json") || looksLikeJson(text);

    if (!json) {
      return fail(
        `Deluge Web at ${sanitizePublicUrl(target)} returned HTTP ${upstream.status} without JSON. Use a URL like http://192.168.1.10:8112 and confirm deluge-web is running.`
      );
    }

    const res = new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType.includes("json") ? contentType : "application/json",
      },
    });
    applyCookies(res, upstream.headers);
    return res;
  } catch (err) {
    return fail(describeProxyError(err, target));
  }
}
