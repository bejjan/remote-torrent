import type { JsonRpcResponse } from "./types";

const STORAGE_URL = "deluge-nova:web-url";

export function getStoredWebUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_URL) ?? "";
}

export function setStoredWebUrl(url: string) {
  if (typeof window === "undefined") return;
  const trimmed = url.trim().replace(/\/$/, "");
  if (trimmed) localStorage.setItem(STORAGE_URL, trimmed);
  else localStorage.removeItem(STORAGE_URL);
}

let requestId = 1;

export class DelugeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DelugeError";
  }
}

export async function rpc<T = unknown>(
  method: string,
  params: unknown[] = []
): Promise<T> {
  const id = requestId++;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const webUrl = getStoredWebUrl();
  if (webUrl) headers["X-Deluge-URL"] = webUrl;

  const res = await fetch("/api/json", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ method, params, id }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new DelugeError(
      res.status === 502 || res.status === 503
        ? "Cannot reach Deluge Web. Check the URL and that deluge-web is running."
        : text || `HTTP ${res.status}`
    );
  }

  const data = (await res.json()) as JsonRpcResponse<T>;
  if (data.error) {
    throw new DelugeError(data.error.message || "RPC error");
  }
  return data.result as T;
}

export async function uploadTorrent(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  const webUrl = getStoredWebUrl();
  if (webUrl) headers["X-Deluge-URL"] = webUrl;

  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    headers,
    body: form,
  });
  if (!res.ok) {
    throw new DelugeError("Torrent upload failed.");
  }
  const data = (await res.json()) as { success?: boolean; files?: string[]; error?: string };
  if (!data.success || !data.files?.[0]) {
    throw new DelugeError(data.error || "Torrent upload failed.");
  }
  return data.files[0];
}
