import { Agent, fetch as undiciFetch } from "undici";
import { NextRequest, NextResponse } from "next/server";
import { parseAdminDemoHeader } from "@/lib/demo/admin-catalog";
import {
  PROXY_TIMEOUT_MS,
  describeProxyError,
  jsonRpcError,
  rewriteSetCookie,
  tlsInsecureEnabled,
  uploadError,
} from "@/lib/deluge/proxy";
import { normalizeQbittorrentWebUrl, qbittorrentWebOrigin, sanitizePublicUrl } from "./url";
import type { QbittorrentCallResult, QbittorrentRequest } from "./types";

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

export function shouldUseQbittorrentDemo(target: string): boolean {
  return (
    process.env.QBITTORRENT_DEMO === "1" ||
    process.env.QBITTORRENT_DEMO === "true" ||
    !target
  );
}

export function resolveQbittorrentTarget(req: NextRequest): {
  target: string;
  demo: boolean;
  error?: string;
} {
  if (parseAdminDemoHeader(req.headers.get("x-nova-admin-demo"))?.enabled) {
    return { target: "", demo: true };
  }
  const raw =
    req.headers.get("x-qbittorrent-url")?.trim() ||
    process.env.QBITTORRENT_WEB_URL?.trim() ||
    "";
  if (!raw) return { target: "", demo: shouldUseQbittorrentDemo("") };
  try {
    return { target: normalizeQbittorrentWebUrl(raw), demo: shouldUseQbittorrentDemo(raw) };
  } catch (err) {
    return {
      target: "",
      demo: false,
      error: err instanceof Error ? err.message : "Invalid qBittorrent Web URL",
    };
  }
}

function parseCookie(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function qbittorrentCredentials(req: NextRequest): { username: string; password: string } {
  const username = req.headers.get("x-qbittorrent-username") ?? "";
  const password = req.headers.get("x-qbittorrent-password") ?? "";
  if (username || password) return { username, password };
  const fromCookie = parseCookie(req.headers.get("cookie"))["nova_qb_auth"];
  if (fromCookie) {
    try {
      const decoded = Buffer.from(fromCookie, "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      if (idx >= 0) return { username: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
    } catch {
      /* ignore */
    }
  }
  return { username: "", password: "" };
}

export function authSetCookie(req: NextRequest): string | null {
  const { username, password } = qbittorrentCredentials(req);
  if (!username && !password) return null;
  if (!req.headers.get("x-qbittorrent-username") && !req.headers.get("x-qbittorrent-password")) {
    return null;
  }
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return `nova_qb_auth=${token}; Path=/; HttpOnly; SameSite=Lax`;
}

function looksLikeJson(text: string): boolean {
  const start = text.trimStart();
  return start.startsWith("{") || start.startsWith("[");
}

export class QbittorrentProxyError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "QbittorrentProxyError";
    this.status = status;
  }
}

function apiUrl(
  target: string,
  path: string,
  query?: QbittorrentRequest["query"]
): string {
  const base = target.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}/api/v2${suffix}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function formBody(form: Record<string, string | number | boolean | undefined> | undefined): string {
  const params = new URLSearchParams();
  if (!form) return params.toString();
  for (const [key, value] of Object.entries(form)) {
    if (value == null) continue;
    params.set(key, typeof value === "boolean" ? (value ? "true" : "false") : String(value));
  }
  return params.toString();
}

function encodeMultipart(
  form: Record<string, string | number | boolean | undefined> | undefined,
  files: { field: string; filename: string; data: Buffer }[]
): { body: Buffer; contentType: string } {
  const boundary = `----torroqb${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const parts: Buffer[] = [];
  if (form) {
    for (const [key, value] of Object.entries(form)) {
      if (value == null) continue;
      const text = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${text}\r\n`
        )
      );
    }
  }
  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\nContent-Type: application/x-bittorrent\r\n\r\n`
      )
    );
    parts.push(file.data);
    parts.push(Buffer.from("\r\n"));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function collectSetCookies(headers: {
  get(name: string): string | null;
  getSetCookie?: () => string[];
}): string[] {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie() ?? [];
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

export function isQbittorrentLoginOk(data: unknown, setCookies?: string[]): boolean {
  if (data === "Ok." || data === "Ok") return true;
  return Boolean(setCookies?.some((cookie) => /^(SID|QBT_SID_[^=]*)=/i.test(cookie.trim())));
}

function rewriteQbittorrentSetCookie(value: string): string {
  let next = rewriteSetCookie(value);
  const expires = next.match(/;\s*Expires=([^;]+)/i)?.[1];
  if (expires) {
    const when = Date.parse(expires);
    // First SID from 5.2 can expire in a couple of seconds; keep it as a session cookie
    // so the browser still has it for auth.check_session.
    if (Number.isFinite(when) && when - Date.now() < 60_000) {
      next = next.replace(/;\s*Expires=[^;]*/i, "");
    }
  }
  return next;
}

export function qbittorrentSessionCookieHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const kept = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => /^(SID|QBT_SID_[^=]+)=/i.test(part));
  return kept.length ? kept.join("; ") : undefined;
}

function isLoginPath(path: string): boolean {
  return path.replace(/\/+$/, "") === "/auth/login";
}

function parseBody(text: string, status: number, target: string): unknown {
  const trimmed = text.trim();
  if (status >= 300 && status < 400) {
    throw new QbittorrentProxyError(
      `qBittorrent redirected the request (HTTP ${status}). Check the Web UI URL.`,
      502
    );
  }
  if (status === 403) {
    throw new QbittorrentProxyError(
      /banned/i.test(trimmed)
        ? trimmed
        : trimmed && trimmed !== "Forbidden"
          ? trimmed
          : "qBittorrent refused the request (HTTP 403).",
      403
    );
  }
  if (status === 401 || trimmed === "Fails.") {
    throw new QbittorrentProxyError("Incorrect username or password for qBittorrent.", 401);
  }
  if (status === 404) throw new QbittorrentProxyError("qBittorrent endpoint not found.", 404);
  if (trimmed === "Ok." || trimmed === "Ok") return trimmed.endsWith(".") ? "Ok." : "Ok";
  // qBittorrent 5.2+ WebAPI returns 204 with an empty body on successful login.
  if (status === 204) return "Ok.";
  if (!trimmed) return null;
  if (looksLikeJson(text)) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new QbittorrentProxyError("qBittorrent did not return valid JSON.", 502);
    }
  }
  if (status >= 400) {
    throw new QbittorrentProxyError(
      `qBittorrent at ${sanitizePublicUrl(target)} returned HTTP ${status}.`,
      status
    );
  }
  return text;
}

export async function proxyQbittorrent(
  req: NextRequest,
  target: string,
  call: QbittorrentRequest
): Promise<QbittorrentCallResult> {
  const origin = qbittorrentWebOrigin(target);
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    Origin: origin,
    Referer: `${origin}/`,
  };
  if (!isLoginPath(call.path)) {
    const sessionCookie = qbittorrentSessionCookieHeader(req.headers.get("cookie"));
    if (sessionCookie) headers.Cookie = sessionCookie;
  }
  const url = apiUrl(target, call.path, call.method === "GET" ? call.query : undefined);

  let body: Buffer | string | undefined;
  if (call.method === "POST") {
    if (call.files?.length) {
      const encoded = encodeMultipart(call.form, call.files);
      body = encoded.body;
      headers["Content-Type"] = encoded.contentType;
    } else {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      const merged = { ...(call.query ?? {}), ...(call.form ?? {}) };
      body = formBody(merged);
    }
  }

  try {
    const upstream = await undiciFetch(url, {
      method: call.method,
      headers,
      body,
      dispatcher: tlsInsecureEnabled(req) ? insecureDispatcher : secureDispatcher,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      redirect: "manual",
    });
    const text = await upstream.text();
    const data = parseBody(text, upstream.status, target);
    const setCookies = collectSetCookies(upstream.headers);
    return { data, setCookies: setCookies.length ? setCookies : undefined };
  } catch (err) {
    if (err instanceof QbittorrentProxyError) throw err;
    throw new QbittorrentProxyError(describeProxyError(err, target, "qBittorrent Web"));
  }
}

export async function loginQbittorrent(
  req: NextRequest,
  target: string,
  username: string,
  password: string
): Promise<{ ok: boolean; setCookies: string[] }> {
  try {
    const result = await proxyQbittorrent(req, target, {
      method: "POST",
      path: "/auth/login",
      form: { username, password },
    });
    const ok = isQbittorrentLoginOk(result.data, result.setCookies);
    return { ok, setCookies: result.setCookies ?? [] };
  } catch (err) {
    if (err instanceof QbittorrentProxyError && err.status === 401) {
      return { ok: false, setCookies: [] };
    }
    throw err;
  }
}

export function withQbittorrentCookies(
  res: NextResponse,
  extra?: string | string[] | null
) {
  const extras = extra == null ? [] : Array.isArray(extra) ? extra : [extra];
  for (const cookie of extras) {
    if (cookie) res.headers.append("Set-Cookie", rewriteQbittorrentSetCookie(cookie));
  }
  return res;
}

export function qbittorrentJsonError(id: unknown, message: string, status = 502): NextResponse {
  return jsonRpcError(id, message, status);
}

export function qbittorrentUploadError(message: string, status = 502): NextResponse {
  return uploadError(message, status);
}
