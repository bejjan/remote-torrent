import type { JsonRpcResponse } from "./types";
import { normalizeDelugeWebUrl } from "./web-url";

const STORAGE_URL = "deluge-nova:web-url";
const STORAGE_TLS = "deluge-nova:tls-insecure";

export function getStoredWebUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_URL) ?? "";
}

export function setStoredWebUrl(url: string) {
  if (typeof window === "undefined") return;
  const trimmed = url.trim();
  if (!trimmed) {
    localStorage.removeItem(STORAGE_URL);
    return;
  }
  try {
    localStorage.setItem(STORAGE_URL, normalizeDelugeWebUrl(trimmed));
  } catch {
    localStorage.setItem(STORAGE_URL, trimmed.replace(/\/$/, ""));
  }
}

export function getStoredTlsInsecure(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_TLS) === "1";
}

export function setStoredTlsInsecure(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) localStorage.setItem(STORAGE_TLS, "1");
  else localStorage.removeItem(STORAGE_TLS);
}

let requestId = 1;

export class DelugeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DelugeError";
  }
}

function proxyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const webUrl = getStoredWebUrl();
  if (webUrl) headers["X-Deluge-URL"] = webUrl;
  if (getStoredTlsInsecure()) headers["X-Deluge-TLS-Insecure"] = "1";
  return headers;
}

function messageFromBody(text: string): string | null {
  if (!text) return null;
  try {
    const data = JSON.parse(text) as {
      error?: { message?: string } | string | null;
      message?: string;
    };
    if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
    if (data.error && typeof data.error === "object" && data.error.message?.trim()) {
      return data.error.message.trim();
    }
    if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  } catch {
    // not JSON
  }
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("<") || trimmed.length > 400) return null;
  return trimmed;
}

export async function rpc<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  const id = requestId++;

  const res = await fetch("/api/json", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...proxyHeaders(),
    },
    body: JSON.stringify({ method, params, id }),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new DelugeError(
      messageFromBody(text) ||
        (res.status === 502 || res.status === 503
          ? "Cannot reach Deluge Web. Check the URL and that deluge-web is running."
          : `HTTP ${res.status}`)
    );
  }

  let data: JsonRpcResponse<T>;
  try {
    data = JSON.parse(text) as JsonRpcResponse<T>;
  } catch {
    throw new DelugeError(
      "Deluge Web did not return JSON. Check that the URL points at deluge-web (http://host:8112)."
    );
  }
  if (data.error) {
    throw new DelugeError(data.error.message || "RPC error");
  }
  return data.result as T;
}

export async function uploadTorrent(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name || "upload.torrent");

  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    headers: proxyHeaders(),
    body: form,
  });
  const text = await res.text().catch(() => "");
  let data: { success?: boolean; files?: string[]; error?: string } | null = null;
  try {
    data = JSON.parse(text) as { success?: boolean; files?: string[]; error?: string };
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new DelugeError(
      data?.error ||
        messageFromBody(text) ||
        `Failed to upload torrent (HTTP ${res.status}).`
    );
  }
  if (!data?.success || !data.files?.[0]) {
    throw new DelugeError(
      data?.error ||
        "Failed to upload torrent. Deluge Web /upload did not return a saved file path."
    );
  }
  return data.files[0];
}
