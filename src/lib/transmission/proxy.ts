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
import { normalizeTransmissionRpcUrl, sanitizePublicUrl } from "./url";
import type { TransmissionRpcRequest, TransmissionRpcResponse } from "./types";

const SESSION_HEADER = "x-transmission-session-id";
const SESSION_COOKIE = "nova_tx_csrf";

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

export function shouldUseTransmissionDemo(target: string): boolean {
  return (
    process.env.TRANSMISSION_DEMO === "1" ||
    process.env.TRANSMISSION_DEMO === "true" ||
    !target
  );
}

export function resolveTransmissionTarget(req: NextRequest): {
  target: string;
  demo: boolean;
  error?: string;
} {
  if (parseAdminDemoHeader(req.headers.get("x-nova-admin-demo"))?.enabled) {
    return { target: "", demo: true };
  }
  const raw =
    req.headers.get("x-transmission-url")?.trim() ||
    process.env.TRANSMISSION_RPC_URL?.trim() ||
    "";
  if (!raw) return { target: "", demo: shouldUseTransmissionDemo("") };
  try {
    return { target: normalizeTransmissionRpcUrl(raw), demo: shouldUseTransmissionDemo(raw) };
  } catch (err) {
    return {
      target: "",
      demo: false,
      error: err instanceof Error ? err.message : "Invalid Transmission RPC URL",
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

export function transmissionAuthHeader(req: NextRequest): string | null {
  const existing = req.headers.get("authorization");
  if (existing?.toLowerCase().startsWith("basic ")) return existing;
  const user = req.headers.get("x-transmission-username") ?? "";
  const password = req.headers.get("x-transmission-password") ?? "";
  if (!user && !password) {
    const fromCookie = parseCookie(req.headers.get("cookie"))["nova_tx_auth"];
    if (fromCookie) return `Basic ${fromCookie}`;
    return null;
  }
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

export function authSetCookie(req: NextRequest): string | null {
  const user = req.headers.get("x-transmission-username") ?? "";
  const password = req.headers.get("x-transmission-password") ?? "";
  if (!user && !password) return null;
  const token = Buffer.from(`${user}:${password}`).toString("base64");
  return `nova_tx_auth=${token}; Path=/; HttpOnly; SameSite=Lax`;
}

function looksLikeJson(text: string): boolean {
  const start = text.trimStart();
  return start.startsWith("{") || start.startsWith("[");
}

export class TransmissionProxyError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "TransmissionProxyError";
    this.status = status;
  }
}

export async function proxyTransmissionRpc(
  req: NextRequest,
  target: string,
  body: TransmissionRpcRequest
): Promise<{ response: TransmissionRpcResponse; sessionId: string; status: number }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const auth = transmissionAuthHeader(req);
  if (auth) headers.Authorization = auth;
  const cookie = req.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  let sessionId =
    req.headers.get(SESSION_HEADER) || parseCookie(req.headers.get("cookie"))[SESSION_COOKIE] || "";
  const payload = JSON.stringify(body);

  const once = async (csrf: string) => {
    const nextHeaders = { ...headers };
    if (csrf) nextHeaders[SESSION_HEADER] = csrf;
    return undiciFetch(target, {
      method: "POST",
      headers: nextHeaders,
      body: payload,
      dispatcher: tlsInsecureEnabled(req) ? insecureDispatcher : secureDispatcher,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      redirect: "follow",
    });
  };

  try {
    let upstream = await once(sessionId);
    if (upstream.status === 409) {
      sessionId = upstream.headers.get(SESSION_HEADER) || sessionId;
      upstream = await once(sessionId);
    }
    const text = await upstream.text();
    if (upstream.status === 401) {
      throw new TransmissionProxyError("Incorrect username or password for Transmission RPC.", 401);
    }
    if (!looksLikeJson(text)) {
      throw new TransmissionProxyError(
        `Transmission at ${sanitizePublicUrl(target)} returned HTTP ${upstream.status} without JSON. Use a URL like http://127.0.0.1:9091/transmission/rpc.`,
        upstream.status >= 400 ? upstream.status : 502
      );
    }
    let parsed: TransmissionRpcResponse;
    try {
      parsed = JSON.parse(text) as TransmissionRpcResponse;
    } catch {
      throw new TransmissionProxyError("Transmission RPC did not return valid JSON.", 502);
    }
    const nextSession = upstream.headers.get(SESSION_HEADER) || sessionId;
    if (upstream.status >= 400 && parsed.result !== "success") {
      throw new TransmissionProxyError(parsed.result || `Transmission RPC HTTP ${upstream.status}`, upstream.status);
    }
    return { response: parsed, sessionId: nextSession, status: upstream.status };
  } catch (err) {
    if (err instanceof TransmissionProxyError) throw err;
    throw new TransmissionProxyError(describeProxyError(err, target, "Transmission RPC"));
  }
}

export function withTransmissionCookies(
  res: NextResponse,
  sessionId?: string,
  extra?: string | string[] | null
) {
  if (sessionId) {
    res.headers.append(
      "Set-Cookie",
      rewriteSetCookie(`${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax`)
    );
    res.headers.set(SESSION_HEADER, sessionId);
  }
  const extras = extra == null ? [] : Array.isArray(extra) ? extra : [extra];
  for (const cookie of extras) {
    if (cookie) res.headers.append("Set-Cookie", rewriteSetCookie(cookie));
  }
  return res;
}

export function transmissionJsonError(id: unknown, message: string, status = 502): NextResponse {
  return jsonRpcError(id, message, status);
}

export function transmissionUploadError(message: string, status = 502): NextResponse {
  return uploadError(message, status);
}

export { SESSION_HEADER, SESSION_COOKIE };
