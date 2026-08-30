import { randomBytes } from "crypto";
import {
  adminDemoCacheKey,
  generateSyntheticTorrentSpecs,
  type AdminDemoConfig,
  type SyntheticTorrentSpec,
} from "../demo/admin-catalog";
import { parseMagnetName } from "@/lib/deluge/format";
import { inventDemoFilesTree, parseMagnetInfoHash, type TorrentInfoDir } from "@/lib/deluge/files-tree";
import { parseHashList, torrentKey } from "./map";
import type {
  QbittorrentBuildInfo,
  QbittorrentCallResult,
  QbittorrentCategory,
  QbittorrentFile,
  QbittorrentPeer,
  QbittorrentPreferences,
  QbittorrentRequest,
  QbittorrentServerState,
  QbittorrentState,
  QbittorrentTorrent,
  QbittorrentTracker,
} from "./types";

const DEMO_PASSWORD = "deluge";
export const QB_SESSION_COOKIE = "nova_qb_session";

type UploadRecord = {
  name: string;
  size: number;
  metainfo: string;
  filesTree: TorrentInfoDir;
  infoHash: string;
};

type DemoTorrent = QbittorrentTorrent & {
  files: QbittorrentFile[];
  trackers: QbittorrentTracker[];
  peers: Record<string, QbittorrentPeer>;
};

interface QbDemoState {
  sessions: Set<string>;
  torrents: DemoTorrent[];
  prefs: QbittorrentPreferences;
  categories: Record<string, QbittorrentCategory>;
  webConfig: Record<string, unknown>;
  uploads: Record<string, UploadRecord>;
  lastTick: number;
  rid: number;
}

type GlobalQb = typeof globalThis & {
  __novaQbittorrentDemo?: QbDemoState;
  __novaQbittorrentAdminDemo?: { key: string; state: QbDemoState };
};

const qbSessions = new Set<string>();

function qbStateFor(state: SyntheticTorrentSpec["state"]): QbittorrentState {
  switch (state) {
    case "Downloading":
      return "downloading";
    case "Seeding":
      return "uploading";
    case "Checking":
      return "checkingDL";
    case "Queued":
      return "queuedDL";
    case "Error":
      return "error";
    case "Paused":
    default:
      return "stoppedDL";
  }
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function fakeHash(seed: string): string {
  let n = 2166136261;
  let hex = "";
  for (let i = 0; i < 40; i++) {
    n ^= seed.charCodeAt(i % seed.length) + i;
    n = Math.imul(n, 16777619);
    hex += (n >>> 0).toString(16).padStart(8, "0").slice(-1);
  }
  return hex;
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

function defaultPrefs(): QbittorrentPreferences {
  return {
    save_path: "/home/qbt/Downloads",
    temp_path: "/home/qbt/Downloads/incomplete",
    temp_path_enabled: false,
    start_paused_enabled: false,
    preallocate_all: false,
    incomplete_files_ext: true,
    dl_limit: 0,
    up_limit: 0,
    alt_dl_limit: 102400,
    alt_up_limit: 102400,
    scheduler_enabled: false,
    max_connec: 500,
    max_connec_per_torrent: 100,
    listen_port: 6881,
    random_port: false,
    upnp: true,
    dht: true,
    pex: true,
    lsd: true,
    anonymous_mode: false,
    queueing_enabled: true,
    max_active_downloads: 5,
    max_active_uploads: 5,
    max_active_torrents: 10,
    max_ratio_enabled: false,
    max_ratio: 2,
    max_seeding_time_enabled: false,
    max_seeding_time: -1,
    encryption: 0,
  };
}

function defaultCategories(): Record<string, QbittorrentCategory> {
  return {
    linux: { name: "linux", savePath: "" },
    movies: { name: "movies", savePath: "" },
  };
}

function makeTorrent(opts: {
  name: string;
  size: number;
  progress: number;
  state: QbittorrentState | string;
  down: number;
  up: number;
  category?: string;
  tracker: string;
  queue: number;
  error?: string;
  hash?: string;
  files?: { name: string; length: number; progress: number }[];
}): DemoTorrent {
  const done = Math.round(opts.size * opts.progress);
  const files = (opts.files ?? [{ name: opts.name, length: opts.size, progress: opts.progress }]).map(
    (file, index) => ({
      index,
      name: file.name,
      size: file.length,
      progress: file.progress,
      priority: 1,
    })
  );
  const hash = opts.hash ?? fakeHash(opts.name);
  const active = opts.state === "downloading" || opts.state === "uploading" || opts.state === "forcedDL" || opts.state === "forcedUP";
  return {
    hash,
    name: opts.name,
    size: opts.size,
    total_size: opts.size,
    progress: opts.progress,
    dlspeed: opts.state === "downloading" ? opts.down : 0,
    upspeed: opts.state === "downloading" || opts.state === "uploading" ? opts.up : 0,
    eta:
      opts.state === "downloading" && opts.down > 0
        ? Math.max(0, Math.round((opts.size - done) / opts.down))
        : 8640000,
    ratio: 0.35,
    state: opts.state,
    num_seeds: opts.state === "downloading" ? 5 : 0,
    num_complete: 42,
    num_leechs: active ? 3 : 0,
    num_incomplete: 120,
    category: opts.category ?? "",
    tags: "",
    save_path: "/home/qbt/Downloads",
    added_on: nowSec() - 86400,
    completion_on: opts.progress >= 1 ? nowSec() - 3600 : 0,
    last_activity: nowSec() - 12,
    seen_complete: opts.progress >= 1 ? nowSec() - 600 : 0,
    uploaded: Math.round(opts.size * 0.35),
    downloaded: done,
    amount_left: Math.max(0, opts.size - done),
    completed: done,
    priority: opts.queue,
    seq_dl: false,
    super_seeding: false,
    auto_tmm: true,
    f_l_piece_prio: false,
    dl_limit: 0,
    up_limit: 0,
    max_ratio: -1,
    ratio_limit: -1,
    seeding_time: opts.progress >= 1 ? 3600 : 0,
    time_active: 5400,
    comment: opts.error || "Demo torrent",
    tracker: opts.tracker,
    availability: opts.progress,
    magnet_uri: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(opts.name)}`,
    piece_size: 262144,
    pieces_have: Math.max(1, Math.round((opts.size / (256 * 1024)) * opts.progress)),
    pieces_num: Math.max(1, Math.round(opts.size / (256 * 1024))),
    private: false,
    files,
    trackers: [
      { url: opts.tracker, status: opts.error ? 4 : 2, tier: 0, num_peers: 162, num_seeds: 42, num_leechs: 120, msg: opts.error || "Working" },
      { url: "udp://tracker.opentrackr.org:1337/announce", status: 2, tier: 1, num_peers: 80, num_seeds: 20, num_leechs: 60, msg: "Working" },
      { url: "** [DHT] **", status: 2, tier: 0 },
    ],
    peers: {
      [`91.64.12.${10 + (opts.queue % 200)}:51413`]: {
        client: "qBittorrent 5.1.0",
        country: "Germany",
        country_code: "DE",
        dl_speed: Math.round(opts.down * 0.4),
        up_speed: Math.round(opts.up * 0.3),
        ip: `91.64.12.${10 + (opts.queue % 200)}`,
        port: 51413,
        progress: Math.min(1, opts.progress + 0.1),
      },
    },
  };
}

function seedTorrents(): DemoTorrent[] {
  return [
    makeTorrent({
      name: "ubuntu-24.04.2-desktop-amd64.iso",
      size: 5.9 * 1024 ** 3,
      progress: 0.472,
      state: "downloading",
      down: 4.2 * 1024 ** 2,
      up: 180 * 1024,
      category: "linux",
      tracker: "https://torrent.ubuntu.com/announce",
      queue: 0,
    }),
    makeTorrent({
      name: "debian-12.10.0-amd64-netinst.iso",
      size: 661 * 1024 ** 2,
      progress: 1,
      state: "uploading",
      down: 0,
      up: 920 * 1024,
      category: "linux",
      tracker: "https://bttracker.debian.org:443/announce",
      queue: 0,
    }),
    makeTorrent({
      name: "archlinux-2026.08.01-x86_64.iso",
      size: 1.2 * 1024 ** 3,
      progress: 0.238,
      state: "stoppedDL",
      down: 0,
      up: 0,
      category: "linux",
      tracker: "udp://tracker.archlinux.org:6969/announce",
      queue: 2,
    }),
    makeTorrent({
      name: "Fedora-Workstation-Live-42-1.1.x86_64.iso",
      size: 2.3 * 1024 ** 3,
      progress: 0,
      state: "queuedDL",
      down: 0,
      up: 0,
      category: "linux",
      tracker: "http://torrent.fedoraproject.org:6969/announce",
      queue: 3,
    }),
    makeTorrent({
      name: "linuxmint-22.1-cinnamon-64bit.iso",
      size: 3.1 * 1024 ** 3,
      progress: 0.824,
      state: "downloading",
      down: 2.8 * 1024 ** 2,
      up: 64 * 1024,
      category: "linux",
      tracker: "https://linuxmint.com/torrent/announce",
      queue: 1,
    }),
    makeTorrent({
      name: "openSUSE-Tumbleweed-DVD-x86_64.iso",
      size: 4.4 * 1024 ** 3,
      progress: 0.121,
      state: "error",
      down: 0,
      up: 0,
      tracker: "http://tracker.opensuse.org:6969/announce",
      queue: 4,
      error: "No space left on device",
    }),
    makeTorrent({
      name: "Big Buck Bunny (2008) 1080p",
      size: 850 * 1024 ** 2,
      progress: 1,
      state: "uploading",
      down: 0,
      up: 1.4 * 1024 ** 2,
      category: "movies",
      tracker: "udp://tracker.opentrackr.org:1337/announce",
      queue: 1,
      files: [
        { name: "Big Buck Bunny/bbb_sunflower_1080p.mp4", length: 800 * 1024 ** 2, progress: 1 },
        { name: "Big Buck Bunny/poster.jpg", length: 2 * 1024 ** 2, progress: 1 },
        { name: "Big Buck Bunny/extras/soundtrack.flac", length: 6 * 1024 ** 2, progress: 1 },
      ],
    }),
    makeTorrent({
      name: "blender-open-movie-pack",
      size: 1.8 * 1024 ** 3,
      progress: 0.615,
      state: "checkingDL",
      down: 0,
      up: 0,
      category: "movies",
      tracker: "udp://tracker.openbittorrent.com:6969/announce",
      queue: 0,
    }),
    makeTorrent({
      name: "Dune.Part.Two.2024.REPACK.2160p.UPSCALE.WEB.HEVC.10Bit.AAC.2.0-R&H.mkv",
      size: 18.4 * 1024 ** 3,
      progress: 1,
      state: "uploading",
      down: 0,
      up: 2.1 * 1024 ** 2,
      category: "movies",
      tracker: "udp://tracker.opentrackr.org:1337/announce",
      queue: 1,
      files: [
        {
          name: "Dune.Part.Two.2024.REPACK.2160p.UPSCALE.WEB.HEVC.10Bit.AAC.2.0-R&H.mkv",
          length: 18.4 * 1024 ** 3,
          progress: 1,
        },
      ],
    }),
  ];
}

function torrentFromSpec(spec: SyntheticTorrentSpec): DemoTorrent {
  return makeTorrent({
    name: spec.name,
    size: spec.size,
    progress: spec.progress / 100,
    state: qbStateFor(spec.state),
    down: spec.down,
    up: spec.up,
    category: spec.label,
    tracker: spec.tracker,
    queue: spec.queue < 0 ? 0 : spec.queue,
    error: spec.message,
    hash: spec.hash,
  });
}

function emptyQbState(
  torrents: DemoTorrent[],
  categories: Record<string, QbittorrentCategory>
): QbDemoState {
  return {
    sessions: qbSessions,
    torrents,
    prefs: defaultPrefs(),
    categories,
    webConfig: { show_sidebar: true, show_session_speed: true, sidebar_show_zero: false },
    uploads: {},
    lastTick: Date.now(),
    rid: 1,
  };
}

function categoriesFromLabels(labels: string[]): Record<string, QbittorrentCategory> {
  const out: Record<string, QbittorrentCategory> = {};
  for (const label of labels) {
    if (label) out[label] = { name: label, savePath: "" };
  }
  return Object.keys(out).length ? out : defaultCategories();
}

function getState(admin?: AdminDemoConfig | null): QbDemoState {
  const g = globalThis as GlobalQb;
  if (admin?.enabled) {
    const key = adminDemoCacheKey(admin);
    if (!g.__novaQbittorrentAdminDemo || g.__novaQbittorrentAdminDemo.key !== key) {
      const specs = generateSyntheticTorrentSpecs(admin);
      const torrents = specs.map((spec) => torrentFromSpec(spec));
      const labels = specs.map((s) => s.label).filter((label): label is string => Boolean(label));
      g.__novaQbittorrentAdminDemo = {
        key,
        state: emptyQbState(torrents, categoriesFromLabels(labels)),
      };
    }
    return g.__novaQbittorrentAdminDemo.state;
  }
  if (!g.__novaQbittorrentDemo) {
    g.__novaQbittorrentDemo = emptyQbState(seedTorrents(), defaultCategories());
  }
  return g.__novaQbittorrentDemo;
}

export function resetQbittorrentAdminDemo() {
  delete (globalThis as GlobalQb).__novaQbittorrentAdminDemo;
}

function tickDownloads(state: QbDemoState) {
  const now = Date.now();
  const dt = Math.min(5, Math.max(0.2, (now - state.lastTick) / 1000));
  state.lastTick = now;
  for (const torrent of state.torrents) {
    const size = Number(torrent.size ?? torrent.total_size ?? 0) || 0;
    if (torrent.state === "downloading") {
      const rate = Number(torrent.dlspeed ?? 0) || 0;
      if (rate > 0 && size > 0) {
        const done = Math.min(size, (Number(torrent.downloaded ?? 0) || 0) + rate * dt);
        torrent.downloaded = done;
        torrent.completed = done;
        torrent.amount_left = Math.max(0, size - done);
        torrent.progress = done / size;
        if (done >= size) {
          torrent.state = "uploading";
          torrent.progress = 1;
          torrent.dlspeed = 0;
          torrent.completion_on = nowSec();
        }
      }
      torrent.dlspeed = Math.max(
        80 * 1024,
        (Number(torrent.dlspeed ?? 0) || 0) + (Math.random() - 0.5) * 200 * 1024
      );
      torrent.upspeed = Math.max(
        0,
        (Number(torrent.upspeed ?? 0) || 0) + (Math.random() - 0.45) * 20 * 1024
      );
    } else if (torrent.state === "uploading") {
      const up = Number(torrent.upspeed ?? 0) || 0;
      torrent.uploaded = (Number(torrent.uploaded ?? 0) || 0) + up * dt;
      torrent.ratio = size > 0 ? (Number(torrent.uploaded ?? 0) || 0) / size : 0;
      torrent.upspeed = Math.max(32 * 1024, up + (Math.random() - 0.5) * 80 * 1024);
    } else if (torrent.state === "checkingDL" || torrent.state === "checkingUP") {
      const next = Math.min(1, (Number(torrent.progress ?? 0) || 0) + dt * 0.04);
      torrent.progress = next;
      if (next >= 1) {
        torrent.state = "uploading";
        torrent.progress = 1;
        torrent.completion_on = nowSec();
      }
    }
  }
}

function apiPath(path: string): string {
  let p = path.trim();
  if (p.startsWith("/api/v2")) p = p.slice("/api/v2".length);
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

function param(req: QbittorrentRequest, key: string): string {
  const q = req.query?.[key];
  const f = req.form?.[key];
  if (q != null && q !== "") return String(q);
  if (f != null && f !== "") return String(f);
  return "";
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function torrentsByHashes(state: QbDemoState, hashes: string[]): DemoTorrent[] {
  if (!hashes.length) return [];
  const set = new Set(hashes.map((h) => h.toLowerCase()));
  return state.torrents.filter((t) => set.has(t.hash.toLowerCase()));
}

function hashesOf(req: QbittorrentRequest): string[] {
  return parseHashList(param(req, "hashes") || param(req, "hash"));
}

function publicTorrent(torrent: DemoTorrent): QbittorrentTorrent {
  const { files: _f, trackers: _t, peers: _p, ...rest } = torrent;
  return rest;
}

function serverState(state: QbDemoState): QbittorrentServerState {
  let download = 0;
  let upload = 0;
  for (const torrent of state.torrents) {
    download += Number(torrent.dlspeed ?? 0) || 0;
    upload += Number(torrent.upspeed ?? 0) || 0;
  }
  return {
    dl_info_speed: download,
    up_info_speed: upload,
    dl_info_data: 12 * 1024 ** 3,
    up_info_data: 4 * 1024 ** 3,
    dl_rate_limit: Number(state.prefs.dl_limit ?? 0) || 0,
    up_rate_limit: Number(state.prefs.up_limit ?? 0) || 0,
    dht_nodes: 184,
    connection_status: "connected",
    free_space_on_disk: 180 * 1024 ** 3,
    queueing: Boolean(state.prefs.queueing_enabled),
    use_alt_speed_limits: Boolean(state.prefs.scheduler_enabled),
  };
}

function buildInfo(): QbittorrentBuildInfo {
  return {
    qt: "6.7.3",
    libtorrent: "2.0.10.0",
    boost: "1.86.0",
    openssl: "3.3.1",
    bitness: 64,
    platform: "macos",
  };
}

function ok(data: unknown): QbittorrentCallResult {
  return { data };
}

function torrentProperties(torrent: DemoTorrent) {
  return {
    save_path: torrent.save_path,
    creation_date: torrent.added_on,
    piece_size: torrent.piece_size,
    comment: torrent.comment,
    addition_date: torrent.added_on,
    completion_date: torrent.completion_on,
    created_by: "torro",
    dl_limit: torrent.dl_limit,
    up_limit: torrent.up_limit,
    time_elapsed: torrent.time_active,
    seeding_time: torrent.seeding_time,
    nb_connections: (torrent.num_seeds ?? 0) + (torrent.num_leechs ?? 0),
    nb_connections_limit: 100,
    share_ratio: torrent.ratio,
    reannounce: 1800,
    total_downloaded: torrent.downloaded,
    total_uploaded: torrent.uploaded,
    total_wasted: 0,
    total_size: torrent.total_size ?? torrent.size,
    dl_speed: torrent.dlspeed,
    up_speed: torrent.upspeed,
    dl_speed_avg: torrent.dlspeed,
    up_speed_avg: torrent.upspeed,
    last_seen: torrent.last_activity,
    peers: torrent.num_leechs,
    peers_total: torrent.num_incomplete,
    seeds: torrent.num_seeds,
    seeds_total: torrent.num_complete,
    pieces_have: torrent.pieces_have,
    pieces_num: torrent.pieces_num,
    eta: torrent.eta,
    is_private: torrent.private,
  };
}

function addFromUpload(
  state: QbDemoState,
  upload: UploadRecord,
  req: QbittorrentRequest
): DemoTorrent {
  const paused = asBool(param(req, "paused")) || Boolean(state.prefs.start_paused_enabled);
  const torrent = makeTorrent({
    name: upload.name,
    size: upload.size || 400 * 1024 ** 2,
    progress: 0,
    state: paused ? "stoppedDL" : "downloading",
    down: 1.2 * 1024 ** 2,
    up: 40 * 1024,
    category: param(req, "category") || undefined,
    tracker: "udp://tracker.opentrackr.org:1337/announce",
    queue: 0,
    hash: upload.infoHash,
  });
  const savepath = param(req, "savepath");
  if (savepath) torrent.save_path = savepath;
  if (asBool(param(req, "sequentialDownload"))) torrent.seq_dl = true;
  if (asBool(param(req, "firstLastPiecePrio"))) torrent.f_l_piece_prio = true;
  const dlLimit = Number(param(req, "dlLimit"));
  const upLimit = Number(param(req, "upLimit"));
  if (Number.isFinite(dlLimit) && dlLimit > 0) torrent.dl_limit = dlLimit;
  if (Number.isFinite(upLimit) && upLimit > 0) torrent.up_limit = upLimit;
  state.torrents.unshift(torrent);
  return torrent;
}

export function qbittorrentDemoCookie(header: string | null): string | undefined {
  return parseCookie(header)[QB_SESSION_COOKIE];
}

export function isQbittorrentDemoAuthed(
  cookieHeader: string | null,
  admin?: AdminDemoConfig | null
): boolean {
  const sid = qbittorrentDemoCookie(cookieHeader);
  return Boolean(sid && getState(admin).sessions.has(sid));
}

export function loginQbittorrentDemo(
  password: string,
  admin?: AdminDemoConfig | null
): { ok: boolean; setCookie?: string } {
  if (!admin?.enabled && password !== DEMO_PASSWORD) return { ok: false };
  const sid = randomBytes(16).toString("hex");
  getState(admin).sessions.add(sid);
  return { ok: true, setCookie: `${QB_SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax` };
}

export function logoutQbittorrentDemo(
  cookieHeader: string | null,
  admin?: AdminDemoConfig | null
): string {
  const sid = qbittorrentDemoCookie(cookieHeader);
  if (sid) getState(admin).sessions.delete(sid);
  return `${QB_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function handleQbittorrentDemoUpload(
  name: string,
  size: number,
  metainfo = "",
  admin?: AdminDemoConfig | null
) {
  const infoHash = fakeHash(name + String(size));
  const path = `/tmp/nova-qb-${infoHash}.torrent`;
  getState(admin).uploads[path] = {
    name: name.replace(/\.torrent$/i, "") || name,
    size: size || 400 * 1024 ** 2,
    metainfo,
    filesTree: inventDemoFilesTree(name, size || 400 * 1024 ** 2),
    infoHash,
  };
  return { success: true, files: [path] };
}

export function getQbittorrentDemoUpload(
  path: string,
  admin?: AdminDemoConfig | null
): UploadRecord | undefined {
  return getState(admin).uploads[path];
}

export function getQbittorrentDemoWebConfig(admin?: AdminDemoConfig | null): Record<string, unknown> {
  return { ...getState(admin).webConfig };
}

export function setQbittorrentDemoWebConfig(
  patch: Record<string, unknown>,
  admin?: AdminDemoConfig | null
) {
  Object.assign(getState(admin).webConfig, patch);
}

export function qbittorrentDemoCategories(admin?: AdminDemoConfig | null): string[] {
  const state = getState(admin);
  const set = new Set(Object.keys(state.categories));
  for (const torrent of state.torrents) {
    if (torrent.category) set.add(torrent.category);
  }
  return [...set].sort();
}

export function handleQbittorrentDemo(
  req: QbittorrentRequest,
  admin?: AdminDemoConfig | null
): QbittorrentCallResult {
  const path = apiPath(req.path);
  const state = getState(admin);
  tickDownloads(state);

  switch (path) {
    case "/auth/login": {
      const login = loginQbittorrentDemo(param(req, "password"), admin);
      return { data: login.ok ? "Ok." : "Fails.", setCookies: login.setCookie ? [login.setCookie] : undefined };
    }
    case "/auth/logout":
      return { data: "Ok.", setCookies: [logoutQbittorrentDemo(null, admin)] };
    case "/app/version":
      return ok("5.1.0 (demo)");
    case "/app/webapiVersion":
      return ok("2.11.3");
    case "/app/buildInfo":
      return ok(buildInfo());
    case "/app/preferences":
      return ok({ ...state.prefs });
    case "/app/setPreferences": {
      const raw = param(req, "json");
      if (raw) {
        try {
          Object.assign(state.prefs, JSON.parse(raw) as QbittorrentPreferences);
        } catch {
          /* ignore malformed json */
        }
      } else if (req.form) {
        Object.assign(state.prefs, req.form);
      }
      return ok("Ok.");
    }
    case "/transfer/info":
      return ok(serverState(state));
    case "/sync/maindata": {
      const torrents: Record<string, QbittorrentTorrent> = {};
      for (const torrent of state.torrents) torrents[torrent.hash] = publicTorrent(torrent);
      state.rid += 1;
      return ok({
        rid: state.rid,
        full_update: true,
        torrents,
        categories: { ...state.categories },
        server_state: serverState(state),
      });
    }
    case "/torrents/info": {
      const hashes = hashesOf(req);
      const category = param(req, "category");
      let list = hashes.length ? torrentsByHashes(state, hashes) : state.torrents;
      if (category) list = list.filter((t) => t.category === category);
      return ok(list.map(publicTorrent));
    }
    case "/torrents/files": {
      const hash = param(req, "hash").toLowerCase();
      const torrent = state.torrents.find((t) => t.hash.toLowerCase() === hash);
      if (!torrent) throw new Error("Unknown torrent");
      return ok(torrent.files);
    }
    case "/torrents/trackers": {
      const hash = param(req, "hash").toLowerCase();
      const torrent = state.torrents.find((t) => t.hash.toLowerCase() === hash);
      if (!torrent) throw new Error("Unknown torrent");
      return ok(torrent.trackers);
    }
    case "/torrents/properties": {
      const hash = param(req, "hash").toLowerCase();
      const torrent = state.torrents.find((t) => t.hash.toLowerCase() === hash);
      if (!torrent) throw new Error("Unknown torrent");
      return ok(torrentProperties(torrent));
    }
    case "/sync/torrentPeers": {
      const hash = param(req, "hash").toLowerCase();
      const torrent = state.torrents.find((t) => t.hash.toLowerCase() === hash);
      if (!torrent) throw new Error("Unknown torrent");
      return ok({ full_update: true, rid: state.rid, peers: torrent.peers });
    }
    case "/torrents/categories":
      return ok({ ...state.categories });
    case "/torrents/pause":
    case "/torrents/stop":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.state = (torrent.progress ?? 0) >= 1 ? "stoppedUP" : "stoppedDL";
        torrent.dlspeed = 0;
        torrent.upspeed = 0;
      }
      return ok("Ok.");
    case "/torrents/resume":
    case "/torrents/start":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.state = (torrent.progress ?? 0) >= 1 ? "uploading" : "downloading";
        if (torrent.state === "downloading") torrent.dlspeed = torrent.dlspeed || 800 * 1024;
        torrent.upspeed = torrent.upspeed || 40 * 1024;
      }
      return ok("Ok.");
    case "/torrents/delete": {
      const ids = new Set(hashesOf(req));
      state.torrents = state.torrents.filter((t) => !ids.has(t.hash.toLowerCase()));
      return ok("Ok.");
    }
    case "/torrents/recheck":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) torrent.state = "checkingDL";
      return ok("Ok.");
    case "/torrents/reannounce":
      return ok("Ok.");
    case "/torrents/topPrio":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) torrent.priority = 0;
      return ok("Ok.");
    case "/torrents/bottomPrio":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.priority = state.torrents.length;
      }
      return ok("Ok.");
    case "/torrents/increasePrio":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.priority = Math.max(0, (torrent.priority ?? 0) - 1);
      }
      return ok("Ok.");
    case "/torrents/decreasePrio":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.priority = (torrent.priority ?? 0) + 1;
      }
      return ok("Ok.");
    case "/torrents/setLocation":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.save_path = param(req, "location");
      }
      return ok("Ok.");
    case "/torrents/setCategory":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.category = param(req, "category");
      }
      return ok("Ok.");
    case "/torrents/createCategory": {
      const name = param(req, "category").trim();
      if (name) state.categories[name] = { name, savePath: param(req, "savePath") };
      return ok("Ok.");
    }
    case "/torrents/removeCategories": {
      const names = param(req, "categories")
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const name of names) {
        delete state.categories[name];
        for (const torrent of state.torrents) {
          if (torrent.category === name) torrent.category = "";
        }
      }
      return ok("Ok.");
    }
    case "/torrents/filePrio": {
      const hash = param(req, "hash").toLowerCase();
      const torrent = state.torrents.find((t) => t.hash.toLowerCase() === hash);
      if (!torrent) throw new Error("Unknown torrent");
      const priority = Number(param(req, "priority"));
      const ids = parseHashList(param(req, "id")).map(Number);
      for (const index of ids) {
        if (Number.isInteger(index) && torrent.files[index]) torrent.files[index].priority = priority;
      }
      return ok("Ok.");
    }
    case "/torrents/addTrackers": {
      const hash = param(req, "hash").toLowerCase();
      const torrent = state.torrents.find((t) => t.hash.toLowerCase() === hash);
      if (!torrent) throw new Error("Unknown torrent");
      const urls = param(req, "urls")
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const url of urls) {
        if (!torrent.trackers.some((t) => t.url === url)) {
          torrent.trackers.push({ url, status: 1, tier: torrent.trackers.length, msg: "" });
        }
        if (!torrent.tracker) torrent.tracker = url;
      }
      return ok("Ok.");
    }
    case "/torrents/removeTrackers": {
      const hash = param(req, "hash").toLowerCase();
      const torrent = state.torrents.find((t) => t.hash.toLowerCase() === hash);
      if (!torrent) throw new Error("Unknown torrent");
      const urls = new Set(parseHashList(param(req, "urls")));
      const raw = param(req, "urls")
        .split(/[|\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const url of raw) urls.add(url);
      torrent.trackers = torrent.trackers.filter((t) => !urls.has(t.url));
      return ok("Ok.");
    }
    case "/torrents/setDownloadLimit":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.dl_limit = Number(param(req, "limit")) || 0;
      }
      return ok("Ok.");
    case "/torrents/setUploadLimit":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.up_limit = Number(param(req, "limit")) || 0;
      }
      return ok("Ok.");
    case "/torrents/setAutoManagement":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.auto_tmm = asBool(param(req, "enable"));
      }
      return ok("Ok.");
    case "/torrents/setShareLimits":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        const ratio = Number(param(req, "ratioLimit"));
        if (Number.isFinite(ratio)) {
          torrent.ratio_limit = ratio;
          torrent.max_ratio = ratio;
        }
      }
      return ok("Ok.");
    case "/torrents/setSuperSeeding":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.super_seeding = asBool(param(req, "value"));
      }
      return ok("Ok.");
    case "/torrents/toggleSequentialDownload":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.seq_dl = !torrent.seq_dl;
      }
      return ok("Ok.");
    case "/torrents/toggleFirstLastPiecePrio":
      for (const torrent of torrentsByHashes(state, hashesOf(req))) {
        torrent.f_l_piece_prio = !torrent.f_l_piece_prio;
      }
      return ok("Ok.");
    case "/torrents/add": {
      const urls = param(req, "urls");
      if (urls.startsWith("magnet:")) {
        for (const uri of urls.split(/\n/).map((s) => s.trim()).filter(Boolean)) {
          const paused = asBool(param(req, "paused")) || Boolean(state.prefs.start_paused_enabled);
          const torrent = makeTorrent({
            name: parseMagnetName(uri) || "Magnet download",
            size: 400 * 1024 ** 2,
            progress: 0,
            state: paused ? "stoppedDL" : "downloading",
            down: 800 * 1024,
            up: 20 * 1024,
            category: param(req, "category") || undefined,
            tracker: "udp://tracker.opentrackr.org:1337/announce",
            queue: 0,
          });
          torrent.hash = parseMagnetInfoHash(uri) || torrent.hash;
          torrent.magnet_uri = uri;
          const savepath = param(req, "savepath");
          if (savepath) torrent.save_path = savepath;
          state.torrents.unshift(torrent);
        }
        return ok("Ok.");
      }
      const uploadPath = urls || param(req, "torrents");
      const upload = uploadPath ? state.uploads[uploadPath] : undefined;
      if (upload) {
        addFromUpload(state, upload, req);
        return ok("Ok.");
      }
      if (req.files?.length) {
        for (const file of req.files) {
          const name = file.filename.replace(/\.torrent$/i, "") || "upload";
          addFromUpload(
            state,
            {
              name,
              size: file.data.length || 400 * 1024 ** 2,
              metainfo: file.data.toString("base64"),
              filesTree: inventDemoFilesTree(name, file.data.length || 400 * 1024 ** 2),
              infoHash: fakeHash(name + String(file.data.length)),
            },
            req
          );
        }
        return ok("Ok.");
      }
      return ok("Fails.");
    }
    default:
      throw new Error(`Unknown method: ${path}`);
  }
}

export { torrentKey };
