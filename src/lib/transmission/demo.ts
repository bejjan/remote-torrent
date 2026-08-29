import { randomBytes } from "crypto";
import { parseMagnetName } from "@/lib/deluge/format";
import { inventDemoFilesTree, parseMagnetInfoHash, type TorrentInfoDir } from "@/lib/deluge/files-tree";
import { resolveTransmissionIds, torrentKey } from "./map";
import {
  TR_STATUS,
  type TransmissionRpcRequest,
  type TransmissionRpcResponse,
  type TransmissionSession,
  type TransmissionTorrent,
} from "./types";

const DEMO_PASSWORD = "deluge";
export const TX_SESSION_COOKIE = "nova_tx_session";

type UploadRecord = {
  name: string;
  size: number;
  metainfo: string;
  filesTree: TorrentInfoDir;
  infoHash: string;
};

interface TxDemoState {
  sessions: Set<string>;
  torrents: TransmissionTorrent[];
  nextId: number;
  session: TransmissionSession;
  webConfig: Record<string, unknown>;
  knownLabels: Set<string>;
  uploads: Record<string, UploadRecord>;
  lastTick: number;
  labelsSupported: boolean;
}

type GlobalTx = typeof globalThis & { __novaTransmissionDemo?: TxDemoState };

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

function defaultSession(): TransmissionSession {
  return {
    version: "4.0.6 (demo)",
    "rpc-version": 18,
    "download-dir": "/home/transmission/Downloads",
    "incomplete-dir": "/home/transmission/Incomplete",
    "incomplete-dir-enabled": false,
    "start-added-torrents": true,
    "rename-partial-files": true,
    "speed-limit-down": 2048,
    "speed-limit-down-enabled": false,
    "speed-limit-up": 512,
    "speed-limit-up-enabled": false,
    "alt-speed-down": 500,
    "alt-speed-up": 100,
    "alt-speed-enabled": false,
    "peer-limit-global": 200,
    "peer-limit-per-torrent": 60,
    "peer-port": 51413,
    "peer-port-random-on-start": false,
    "port-forwarding-enabled": true,
    "dht-enabled": true,
    "pex-enabled": true,
    "lpd-enabled": true,
    "utp-enabled": true,
    encryption: "preferred",
    "seed-queue-size": 5,
    "seed-queue-enabled": false,
    "download-queue-size": 5,
    "download-queue-enabled": true,
    "idle-seeding-limit": 30,
    "idle-seeding-limit-enabled": false,
    "ratio-limit": 2,
    "ratio-limit-enabled": false,
    "download-dir-free-space": 180 * 1024 ** 3,
    "cache-size-mb": 4,
  };
}

function makeTorrent(opts: {
  id: number;
  name: string;
  size: number;
  progress: number;
  status: number;
  down: number;
  up: number;
  labels?: string[];
  tracker: string;
  queue: number;
  error?: string;
  files?: { name: string; length: number; progress: number }[];
}): TransmissionTorrent {
  const done = Math.round(opts.size * opts.progress);
  const files = (opts.files ?? [{ name: opts.name, length: opts.size, progress: opts.progress }]).map(
    (file) => ({
      name: file.name,
      length: file.length,
      bytesCompleted: Math.round(file.length * file.progress),
    })
  );
  return {
    id: opts.id,
    name: opts.name,
    status: opts.status,
    percentDone: opts.progress,
    rateDownload: opts.status === TR_STATUS.DOWNLOAD ? opts.down : 0,
    rateUpload: opts.status === TR_STATUS.STOPPED || opts.status === TR_STATUS.DOWNLOAD_WAIT ? 0 : opts.up,
    eta: opts.status === TR_STATUS.DOWNLOAD && opts.down > 0 ? Math.max(0, opts.size - done) / opts.down : -1,
    sizeWhenDone: opts.size,
    totalSize: opts.size,
    downloadedEver: done,
    uploadedEver: Math.round(opts.size * 0.35),
    uploadRatio: 0.35,
    peersConnected: opts.status === TR_STATUS.STOPPED ? 0 : 8,
    peersGettingFromUs: opts.status === TR_STATUS.SEED ? 6 : 2,
    peersSendingToUs: opts.status === TR_STATUS.DOWNLOAD ? 5 : 0,
    addedDate: nowSec() - 86400 * opts.id,
    doneDate: opts.progress >= 1 ? nowSec() - 3600 : 0,
    activityDate: nowSec() - 12,
    downloadDir: "/home/transmission/Downloads",
    hashString: fakeHash(opts.name),
    labels: opts.labels ?? [],
    files,
    fileStats: files.map((f) => ({ bytesCompleted: f.bytesCompleted, wanted: true, priority: 1 })),
    trackers: [
      { announce: opts.tracker, id: 0, tier: 0 },
      { announce: "udp://tracker.opentrackr.org:1337/announce", id: 1, tier: 1 },
    ],
    trackerStats: [
      {
        announce: opts.tracker,
        host: opts.tracker.replace(/^https?:\/\//, "").split("/")[0],
        lastAnnounceSucceeded: !opts.error,
        lastAnnounceResult: opts.error || "Success",
        nextAnnounceTime: nowSec() + 1800,
        seederCount: 42,
        leecherCount: 120,
        tier: 0,
      },
    ],
    peers: [
      {
        address: `91.64.12.${10 + opts.id}`,
        port: 51413,
        clientName: "qBittorrent 5.1.0",
        progress: Math.min(1, opts.progress + 0.1),
        rateToClient: Math.round(opts.down * 0.4),
        rateToPeer: Math.round(opts.up * 0.3),
        isDownloadingFrom: opts.status === TR_STATUS.DOWNLOAD,
        isUploadingTo: opts.status === TR_STATUS.SEED,
      },
    ],
    honorsSessionLimits: true,
    downloadLimited: false,
    downloadLimit: 100,
    uploadLimited: false,
    uploadLimit: 100,
    seedRatioLimit: 2,
    seedRatioMode: 0,
    queuePosition: opts.queue,
    error: opts.error ? 3 : 0,
    errorString: opts.error ?? "",
    isFinished: opts.progress >= 1,
    leftUntilDone: Math.max(0, opts.size - done),
    pieceCount: Math.max(1, Math.round(opts.size / (256 * 1024))),
    pieceSize: 262144,
    comment: "Demo torrent",
    creator: "Nova",
    isPrivate: false,
    recheckProgress: opts.status === TR_STATUS.CHECK ? opts.progress : 1,
    secondsDownloading: 5400,
    secondsSeeding: opts.progress >= 1 ? 3600 : 0,
  };
}

function seedTorrents(): TransmissionTorrent[] {
  return [
    makeTorrent({
      id: 1,
      name: "ubuntu-24.04.2-desktop-amd64.iso",
      size: 5.9 * 1024 ** 3,
      progress: 0.472,
      status: TR_STATUS.DOWNLOAD,
      down: 4.2 * 1024 ** 2,
      up: 180 * 1024,
      labels: ["linux"],
      tracker: "https://torrent.ubuntu.com/announce",
      queue: 0,
    }),
    makeTorrent({
      id: 2,
      name: "debian-12.10.0-amd64-netinst.iso",
      size: 661 * 1024 ** 2,
      progress: 1,
      status: TR_STATUS.SEED,
      down: 0,
      up: 920 * 1024,
      labels: ["linux"],
      tracker: "https://bttracker.debian.org:443/announce",
      queue: 0,
    }),
    makeTorrent({
      id: 3,
      name: "archlinux-2026.08.01-x86_64.iso",
      size: 1.2 * 1024 ** 3,
      progress: 0.238,
      status: TR_STATUS.STOPPED,
      down: 0,
      up: 0,
      labels: ["linux"],
      tracker: "udp://tracker.archlinux.org:6969/announce",
      queue: 2,
    }),
    makeTorrent({
      id: 4,
      name: "Fedora-Workstation-Live-42-1.1.x86_64.iso",
      size: 2.3 * 1024 ** 3,
      progress: 0,
      status: TR_STATUS.DOWNLOAD_WAIT,
      down: 0,
      up: 0,
      labels: ["linux"],
      tracker: "http://torrent.fedoraproject.org:6969/announce",
      queue: 3,
    }),
    makeTorrent({
      id: 5,
      name: "linuxmint-22.1-cinnamon-64bit.iso",
      size: 3.1 * 1024 ** 3,
      progress: 0.824,
      status: TR_STATUS.DOWNLOAD,
      down: 2.8 * 1024 ** 2,
      up: 64 * 1024,
      labels: ["linux"],
      tracker: "https://linuxmint.com/torrent/announce",
      queue: 1,
    }),
    makeTorrent({
      id: 6,
      name: "openSUSE-Tumbleweed-DVD-x86_64.iso",
      size: 4.4 * 1024 ** 3,
      progress: 0.121,
      status: TR_STATUS.STOPPED,
      down: 0,
      up: 0,
      tracker: "http://tracker.opensuse.org:6969/announce",
      queue: 4,
      error: "No space left on device",
    }),
    makeTorrent({
      id: 7,
      name: "Big Buck Bunny (2008) 1080p",
      size: 850 * 1024 ** 2,
      progress: 1,
      status: TR_STATUS.SEED,
      down: 0,
      up: 1.4 * 1024 ** 2,
      labels: ["movies"],
      tracker: "udp://tracker.opentrackr.org:1337/announce",
      queue: 1,
      files: [
        { name: "Big Buck Bunny/bbb_sunflower_1080p.mp4", length: 800 * 1024 ** 2, progress: 1 },
        { name: "Big Buck Bunny/poster.jpg", length: 2 * 1024 ** 2, progress: 1 },
        { name: "Big Buck Bunny/extras/soundtrack.flac", length: 6 * 1024 ** 2, progress: 1 },
      ],
    }),
    makeTorrent({
      id: 8,
      name: "blender-open-movie-pack",
      size: 1.8 * 1024 ** 3,
      progress: 0.615,
      status: TR_STATUS.CHECK,
      down: 0,
      up: 0,
      labels: ["movies"],
      tracker: "udp://tracker.openbittorrent.com:6969/announce",
      queue: 0,
    }),
    makeTorrent({
      id: 9,
      name: "Dune.Part.Two.2024.REPACK.2160p.UPSCALE.WEB.HEVC.10Bit.AAC.2.0-R&H.mkv",
      size: 18.4 * 1024 ** 3,
      progress: 1,
      status: TR_STATUS.SEED,
      down: 0,
      up: 2.1 * 1024 ** 2,
      labels: ["movies"],
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

function getState(): TxDemoState {
  const g = globalThis as GlobalTx;
  if (!g.__novaTransmissionDemo) {
    const torrents = seedTorrents();
    g.__novaTransmissionDemo = {
      sessions: new Set(),
      torrents,
      nextId: 10,
      session: defaultSession(),
      webConfig: { show_sidebar: true, show_session_speed: true, sidebar_show_zero: false },
      knownLabels: new Set(["linux", "movies"]),
      uploads: {},
      lastTick: Date.now(),
      labelsSupported: true,
    };
  }
  return g.__novaTransmissionDemo;
}

function tickDownloads(state: TxDemoState) {
  const now = Date.now();
  const dt = Math.min(5, (now - state.lastTick) / 1000);
  state.lastTick = now;
  for (const torrent of state.torrents) {
    if (torrent.status !== TR_STATUS.DOWNLOAD) continue;
    const rate = Number(torrent.rateDownload ?? 0) || 0;
    if (rate <= 0) continue;
    const size = Number(torrent.sizeWhenDone ?? 0) || 0;
    const done = Math.min(size, (Number(torrent.downloadedEver ?? 0) || 0) + rate * dt);
    torrent.downloadedEver = done;
    torrent.leftUntilDone = Math.max(0, size - done);
    torrent.percentDone = size > 0 ? done / size : 1;
    if (size > 0 && done >= size) {
      torrent.status = TR_STATUS.SEED;
      torrent.percentDone = 1;
      torrent.rateDownload = 0;
      torrent.isFinished = true;
      torrent.doneDate = nowSec();
    }
  }
}

function ok(args: Record<string, unknown> = {}, tag?: number | string): TransmissionRpcResponse {
  return { result: "success", arguments: args, tag };
}

function fail(message: string, tag?: number | string): TransmissionRpcResponse {
  return { result: message, arguments: {}, tag };
}

function idsOf(args: Record<string, unknown> | undefined, state: TxDemoState): TransmissionTorrent[] {
  if (args?.ids == null || args.ids === "recently-active") return state.torrents;
  const numeric = new Set(resolveTransmissionIds(args.ids, state.torrents));
  return state.torrents.filter((t) => numeric.has(t.id));
}

function applyTorrentSet(torrent: TransmissionTorrent, args: Record<string, unknown>) {
  if (typeof args.downloadLimited === "boolean") torrent.downloadLimited = args.downloadLimited;
  if (typeof args.downloadLimit === "number") torrent.downloadLimit = args.downloadLimit;
  if (typeof args.uploadLimited === "boolean") torrent.uploadLimited = args.uploadLimited;
  if (typeof args.uploadLimit === "number") torrent.uploadLimit = args.uploadLimit;
  if (typeof args.honorsSessionLimits === "boolean") torrent.honorsSessionLimits = args.honorsSessionLimits;
  if (typeof args.seedRatioMode === "number") torrent.seedRatioMode = args.seedRatioMode;
  if (typeof args.seedRatioLimit === "number") torrent.seedRatioLimit = args.seedRatioLimit;
  if (typeof args.queuePosition === "number") torrent.queuePosition = args.queuePosition;
  if (Array.isArray(args.labels)) torrent.labels = args.labels.map((l) => String(l).trim()).filter(Boolean);
  if (typeof args.location === "string") torrent.downloadDir = args.location;
  const stats = torrent.fileStats ?? [];
  const mark = (indexes: unknown, patch: Partial<(typeof stats)[number]>) => {
    if (!Array.isArray(indexes)) return;
    for (const raw of indexes) {
      const i = Number(raw);
      if (Number.isInteger(i) && i >= 0 && i < stats.length) Object.assign(stats[i], patch);
    }
  };
  mark(args["files-wanted"], { wanted: true });
  mark(args["files-unwanted"], { wanted: false });
  mark(args["priority-low"], { priority: 0 });
  mark(args["priority-normal"], { priority: 1 });
  mark(args["priority-high"], { priority: 2 });
  torrent.fileStats = stats;
}

export function transmissionDemoCookie(header: string | null): string | undefined {
  return parseCookie(header)[TX_SESSION_COOKIE];
}

export function isTransmissionDemoAuthed(cookieHeader: string | null): boolean {
  const sid = transmissionDemoCookie(cookieHeader);
  return Boolean(sid && getState().sessions.has(sid));
}

export function loginTransmissionDemo(password: string): { ok: boolean; setCookie?: string } {
  if (password !== DEMO_PASSWORD) return { ok: false };
  const sid = randomBytes(16).toString("hex");
  getState().sessions.add(sid);
  return { ok: true, setCookie: `${TX_SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax` };
}

export function logoutTransmissionDemo(cookieHeader: string | null): string {
  const sid = transmissionDemoCookie(cookieHeader);
  if (sid) getState().sessions.delete(sid);
  return `${TX_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function handleTransmissionDemoUpload(name: string, size: number, metainfo = "") {
  const infoHash = fakeHash(name + String(size));
  const path = `/tmp/nova-tx-${infoHash}.torrent`;
  getState().uploads[path] = {
    name: name.replace(/\.torrent$/i, "") || name,
    size: size || 400 * 1024 ** 2,
    metainfo,
    filesTree: inventDemoFilesTree(name, size || 400 * 1024 ** 2),
    infoHash,
  };
  return { success: true, files: [path] };
}

export function getTransmissionDemoUpload(path: string): UploadRecord | undefined {
  return getState().uploads[path];
}

export function getTransmissionDemoWebConfig(): Record<string, unknown> {
  return { ...getState().webConfig };
}

export function setTransmissionDemoWebConfig(patch: Record<string, unknown>) {
  Object.assign(getState().webConfig, patch);
}

export function transmissionDemoLabels(): string[] {
  const state = getState();
  const set = new Set(state.knownLabels);
  for (const torrent of state.torrents) {
    for (const label of torrent.labels ?? []) if (label) set.add(label);
  }
  return [...set].sort();
}

export function transmissionDemoLabelsSupported(): boolean {
  return getState().labelsSupported;
}

export function addTransmissionDemoLabel(name: string) {
  getState().knownLabels.add(name);
}

export function removeTransmissionDemoLabel(name: string) {
  const state = getState();
  state.knownLabels.delete(name);
  for (const torrent of state.torrents) {
    torrent.labels = (torrent.labels ?? []).filter((l) => l !== name);
  }
}

export function setTransmissionDemoTorrentLabel(id: number | string, label: string) {
  const state = getState();
  for (const torrent of idsOf({ ids: [id] }, state)) {
    torrent.labels = label ? [label] : [];
  }
  if (label) state.knownLabels.add(label);
}

export function handleTransmissionDemoRpc(body: TransmissionRpcRequest): TransmissionRpcResponse {
  const method = body.method;
  const args = (body.arguments ?? {}) as Record<string, unknown>;
  const tag = body.tag;
  const state = getState();
  tickDownloads(state);

  switch (method) {
    case "session-get":
      return ok({ ...state.session }, tag);
    case "session-set":
      Object.assign(state.session, args);
      return ok({}, tag);
    case "session-stats":
      return ok(
        {
          activeTorrentCount: state.torrents.filter((t) => t.status !== TR_STATUS.STOPPED).length,
          pausedTorrentCount: state.torrents.filter((t) => t.status === TR_STATUS.STOPPED).length,
          torrentCount: state.torrents.length,
        },
        tag
      );
    case "torrent-get": {
      const fields = args.fields as string[] | undefined;
      const torrents = idsOf(args, state).map((t) => {
        if (!fields?.length) return { ...t };
        const rec = t as unknown as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const field of fields) if (field in rec) out[field] = rec[field];
        return out;
      });
      return ok({ torrents }, tag);
    }
    case "torrent-start":
    case "torrent-start-now":
      for (const t of idsOf(args, state)) {
        t.status = t.isFinished || (t.percentDone ?? 0) >= 1 ? TR_STATUS.SEED : TR_STATUS.DOWNLOAD;
      }
      return ok({}, tag);
    case "torrent-stop":
      for (const t of idsOf(args, state)) {
        t.status = TR_STATUS.STOPPED;
        t.rateDownload = 0;
        t.rateUpload = 0;
      }
      return ok({}, tag);
    case "torrent-verify":
      for (const t of idsOf(args, state)) t.status = TR_STATUS.CHECK;
      return ok({}, tag);
    case "torrent-reannounce":
      return ok({}, tag);
    case "torrent-set":
      for (const torrent of idsOf(args, state)) applyTorrentSet(torrent, args);
      return ok({}, tag);
    case "torrent-set-location":
      for (const torrent of idsOf(args, state)) torrent.downloadDir = String(args.location ?? "");
      return ok({}, tag);
    case "torrent-remove": {
      const ids = new Set(idsOf(args, state).map((t) => t.id));
      state.torrents = state.torrents.filter((t) => !ids.has(t.id));
      return ok({}, tag);
    }
    case "torrent-add": {
      if (typeof args.filename === "string" && args.filename.startsWith("magnet:")) {
        const torrent = makeTorrent({
          id: state.nextId++,
          name: parseMagnetName(args.filename) || "Magnet download",
          size: 400 * 1024 ** 2,
          progress: 0,
          status: args.paused ? TR_STATUS.STOPPED : TR_STATUS.DOWNLOAD,
          down: 800 * 1024,
          up: 20 * 1024,
          tracker: "udp://tracker.opentrackr.org:1337/announce",
          queue: 0,
        });
        torrent.hashString = parseMagnetInfoHash(args.filename) || torrent.hashString;
        torrent.magnetLink = args.filename;
        if (typeof args["download-dir"] === "string") torrent.downloadDir = args["download-dir"];
        applyTorrentSet(torrent, args);
        state.torrents.unshift(torrent);
        return ok({ "torrent-added": { id: torrent.id, name: torrent.name, hashString: torrent.hashString } }, tag);
      }
      const path = typeof args.filename === "string" ? args.filename : "";
      const upload = path ? state.uploads[path] : undefined;
      const torrent = makeTorrent({
        id: state.nextId++,
        name: upload?.name || `upload-${state.nextId}`,
        size: upload?.size || 400 * 1024 ** 2,
        progress: 0,
        status: args.paused ? TR_STATUS.STOPPED : TR_STATUS.DOWNLOAD,
        down: 1.2 * 1024 ** 2,
        up: 40 * 1024,
        tracker: "udp://tracker.opentrackr.org:1337/announce",
        queue: 0,
      });
      if (upload?.infoHash) torrent.hashString = upload.infoHash;
      if (typeof args["download-dir"] === "string") torrent.downloadDir = args["download-dir"];
      applyTorrentSet(torrent, args);
      state.torrents.unshift(torrent);
      return ok({ "torrent-added": { id: torrent.id, name: torrent.name, hashString: torrent.hashString } }, tag);
    }
    default:
      return fail(`unknown method: ${method || "(none)"}`, tag);
  }
}

export { torrentKey };
