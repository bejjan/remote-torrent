import type {
  AddTorrentOptions,
  FileNode,
  FilterDict,
  HostInfo,
  HostStatus,
  JsonRpcResponse,
  UiUpdate,
} from "./types";

const STORAGE_URL = "deluge-nova:web-url";

export const DEFAULT_WEB_URL = "http://127.0.0.1:8112";

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

export function isAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /not authenticated/i.test(message);
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
    if (res.status === 502 || res.status === 503) {
      throw new DelugeError(
        "Cannot reach Deluge Web. Check the URL and that deluge-web is running."
      );
    }
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) throw new DelugeError(parsed.error);
    } catch (error) {
      if (error instanceof DelugeError) throw error;
    }
    throw new DelugeError(text || `HTTP ${res.status}`);
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
    throw new DelugeError(
      res.status === 502 || res.status === 503
        ? "Cannot reach Deluge Web. Check the URL and that deluge-web is running."
        : "Torrent upload failed."
    );
  }
  const data = (await res.json()) as {
    success?: boolean;
    files?: string[];
    error?: string;
  };
  if (!data.success || !data.files?.[0]) {
    throw new DelugeError(data.error || "Torrent upload failed.");
  }
  return data.files[0];
}

export function login(password: string) {
  return rpc<boolean>("auth.login", [password]);
}

export function checkSession() {
  return rpc<boolean>("auth.check_session");
}

export function deleteSession() {
  return rpc<boolean>("auth.delete_session");
}

export function updateUi(keys: readonly string[], filters: FilterDict = {}) {
  return rpc<UiUpdate>("web.update_ui", [keys, filters]);
}

export function isConnected() {
  return rpc<boolean>("web.connected");
}

export function getHosts() {
  return rpc<HostInfo[]>("web.get_hosts");
}

export function getHostStatus(hostId: string) {
  return rpc<HostStatus>("web.get_host_status", [hostId]);
}

export function connectHost(hostId: string) {
  return rpc("web.connect", [hostId]);
}

export function pauseTorrents(ids: string[]) {
  return rpc("core.pause_torrent", [ids]);
}

export function resumeTorrents(ids: string[]) {
  return rpc("core.resume_torrent", [ids]);
}

export function removeTorrents(ids: string[], removeData = false) {
  return rpc("core.remove_torrents", [ids, removeData]);
}

export function addMagnet(uri: string, options: AddTorrentOptions = {}) {
  return rpc("core.add_torrent_magnet", [uri, options]);
}

export function addTorrentUrl(url: string, options: AddTorrentOptions = {}) {
  return rpc("core.add_torrent_url", [url, options]);
}

export function addUploadedTorrents(
  paths: string[],
  options: AddTorrentOptions = {}
) {
  return rpc(
    "web.add_torrents",
    [paths.map((path) => ({ path, options }))]
  );
}

export function getTorrentFiles(id: string) {
  return rpc<FileNode>("web.get_torrent_files", [id]);
}

export function getDownloadLocation() {
  return rpc<string>("core.get_config_value", ["download_location"]);
}

export async function connectToDaemon(): Promise<boolean> {
  if (await isConnected()) return true;

  const hosts = await getHosts();
  if (!hosts.length) return false;

  let hostId = hosts[0][0];
  const statuses = await Promise.all(
    hosts.map((host) => getHostStatus(host[0]).catch(() => null))
  );
  const online = statuses.findIndex(
    (status) => status && /online|connected/i.test(status[1])
  );
  if (online >= 0) hostId = hosts[online][0];

  await connectHost(hostId);
  for (let i = 0; i < 15; i++) {
    if (await isConnected()) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return isConnected();
}
