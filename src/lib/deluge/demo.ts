import { randomBytes, randomUUID } from "crypto";
import { parseMagnetName, trackerHost } from "./format";
import {
  inventDemoFilesTree,
  mapInfoTreeToStatusFiles,
  parseMagnetInfoHash,
  type TorrentInfoDir,
} from "./files-tree";
import type {
  AddTorrentOptions,
  ExecuteCommand,
  FileDir,
  FileLeaf,
  FileNode,
  FilterDict,
  HostInfo,
  LabelOptions,
  SessionStats,
  TorrentPeer,
  TorrentStatus,
  TorrentTracker,
  WatchDir,
} from "./types";

const DEMO_PASSWORD = "deluge";
const HOST_ID = "c0ffee00cafe00beef00dead00feed00feedc0de";

export interface JsonRpcRequest {
  method: string;
  params?: unknown[];
  id?: number | string;
}

interface ExtraTorrent {
  status: TorrentStatus;
  files: FileDir;
  peers: TorrentPeer[];
  trackers: TorrentTracker[];
}

interface DemoState {
  sessions: Set<string>;
  connected: boolean;
  hosts: HostInfo[];
  hostOnline: boolean;
  torrents: Record<string, ExtraTorrent>;
  config: Record<string, unknown>;
  webConfig: Record<string, unknown>;
  availablePlugins: string[];
  enabledPlugins: string[];
  labels: Record<string, LabelOptions>;
  scheduler: {
    low_down: number;
    low_up: number;
    low_active: number;
    button_state: number[][];
  };
  extractor: { extract_path: string; use_name_folder: boolean };
  execute: ExecuteCommand[];
  notifications: Record<string, unknown>;
  blocklist: {
    url: string;
    check_after_days: number;
    last_update: string;
    size: number;
    file: string;
    num_blocked: number;
    state: string;
  };
  autoadd: Record<string, WatchDir>;
  uploads: Record<string, { name: string; size: number; filesTree: TorrentInfoDir; infoHash: string }>;
  lastTick: number;
}

type GlobalDemo = typeof globalThis & { __delugeNovaDemo?: DemoState };

function defaultLabelOptions(): LabelOptions {
  return {
    apply_max: false,
    max_download_speed: -1,
    max_upload_speed: -1,
    max_connections: -1,
    max_upload_slots: -1,
    apply_queue: false,
    is_auto_managed: true,
    stop_at_ratio: false,
    stop_ratio: 2,
    remove_at_ratio: false,
    apply_move: false,
    move_completed: false,
    move_completed_path: "/home/deluge/Downloads",
    apply_tracker: false,
    tracker: "",
  };
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

function fileLeaf(
  index: number,
  size: number,
  progress: number,
  priority = 1,
  offset = 0
): FileLeaf {
  return { type: "file", index, size, progress, priority, offset };
}

function nowSec(): number {
  return Date.now() / 1000;
}

function makeTorrent(opts: {
  name: string;
  size: number;
  progress: number;
  state: TorrentStatus["state"];
  down: number;
  up: number;
  label?: string;
  tracker: string;
  queue: number;
  message?: string;
  files: FileDir;
}): ExtraTorrent {
  const totalDone = Math.round((opts.size * opts.progress) / 100);
  const remaining = opts.size - totalDone;
  const queueAge = Math.abs(opts.queue);
  const added = nowSec() - 86400 * (1 + queueAge);
  const peers: TorrentPeer[] = [
    {
      client: "qBittorrent 5.1.0",
      country: "DE",
      down_speed: Math.round(opts.down * 0.4),
      up_speed: Math.round(opts.up * 0.3),
      ip: "91.64.12." + (10 + queueAge),
      progress: Math.min(1, opts.progress / 100 + 0.1),
      seed: opts.progress >= 100 ? 1 : 0,
    },
    {
      client: "Transmission 4.0",
      country: "US",
      down_speed: Math.round(opts.down * 0.25),
      up_speed: Math.round(opts.up * 0.5),
      ip: "203.0.113." + (20 + queueAge),
      progress: Math.min(1, opts.progress / 100 + 0.05),
      seed: 1,
    },
    {
      client: "Deluge 2.1.1",
      country: "NL",
      down_speed: Math.round(opts.down * 0.2),
      up_speed: Math.round(opts.up * 0.15),
      ip: "198.51.100." + (30 + queueAge),
      progress: opts.progress / 100,
      seed: 0,
    },
  ];
  const status: TorrentStatus = {
    queue: opts.queue,
    name: opts.name,
    total_wanted: opts.size,
    state: opts.state,
    progress: opts.progress,
    num_seeds: opts.state === "Seeding" ? 0 : 4 + queueAge,
    total_seeds: 42 + queueAge * 3,
    num_peers: 8 + queueAge,
    total_peers: 120 + queueAge * 10,
    download_payload_rate: opts.state === "Downloading" ? opts.down : 0,
    upload_payload_rate: opts.state === "Paused" || opts.state === "Queued" ? 0 : opts.up,
    eta:
      opts.state === "Downloading" && opts.down > 0
        ? remaining / opts.down
        : -1,
    ratio: totalDone > 0 ? (opts.size * 0.4 + queueAge * 1e8) / opts.size : 0,
    distributed_copies: opts.state === "Seeding" ? 1.2 : 0.6,
    is_auto_managed: true,
    time_added: added,
    tracker_host: trackerHost(opts.tracker),
    download_location: "/home/deluge/Downloads",
    last_seen_complete: nowSec() - 3600,
    total_done: totalDone,
    total_uploaded: Math.round(opts.size * 0.35 + queueAge * 5e7),
    max_download_speed: -1,
    max_upload_speed: -1,
    seeds_peers_ratio: 0.4,
    total_remaining: remaining,
    completed_time: opts.progress >= 100 ? added + 7200 : 0,
    time_since_transfer: 12,
    total_payload_download: totalDone,
    total_payload_upload: Math.round(opts.size * 0.35),
    next_announce: 1800,
    tracker_status: opts.state === "Error" ? "Error: Tracker unavailable" : "Announce OK",
    num_pieces: Math.max(1, Math.round(opts.size / (256 * 1024))),
    piece_length: 262144,
    active_time: 5400,
    seeding_time: opts.progress >= 100 ? 3600 : 0,
    seed_rank: opts.queue,
    owner: "localclient",
    public: true,
    shared: false,
    total_size: opts.size,
    num_files: countFiles(opts.files),
    message: opts.message ?? "",
    comment: "Demo torrent",
    creator: "Deluge Nova",
    max_connections: -1,
    max_upload_slots: -1,
    stop_at_ratio: false,
    stop_ratio: 2,
    remove_at_ratio: false,
    private: false,
    prioritize_first_last: false,
    move_completed: false,
    move_completed_path: "/home/deluge/Completed",
    super_seeding: false,
    sequential_download: false,
    label: opts.label,
  };
  return {
    status,
    files: opts.files,
    peers,
    trackers: [
      { url: opts.tracker, tier: 0 },
      { url: "udp://tracker.opentrackr.org:1337/announce", tier: 1 },
    ],
  };
}

function countFiles(node: FileNode): number {
  if (node.type === "file") return 1;
  return Object.values(node.contents).reduce((n, child) => n + countFiles(child), 0);
}

function defaultConfig(): Record<string, unknown> {
  return {
    download_location: "/home/deluge/Downloads",
    move_completed: false,
    move_completed_path: "/home/deluge/Completed",
    copy_torrent_file: false,
    torrentfiles_location: "/home/deluge/Torrents",
    del_copy_torrent_file: false,
    add_paused: false,
    sequential_download: false,
    prioritize_first_last_pieces: false,
    pre_allocate_storage: false,
    compact_allocation: false,
    max_connections_global: 200,
    max_connections_per_torrent: -1,
    max_upload_slots_global: 4,
    max_upload_slots_per_torrent: -1,
    max_download_speed: -1,
    max_upload_speed: -1,
    max_download_speed_per_torrent: -1,
    max_upload_speed_per_torrent: -1,
    max_half_open_connections: 50,
    ignore_limits_on_local_network: true,
    rate_limit_ip_overhead: true,
    listen_ports: [6881, 6891],
    random_port: true,
    listen_interface: "",
    outgoing_interface: "",
    random_outgoing_ports: true,
    outgoing_ports: [0, 0],
    utpex: true,
    lsd: true,
    dht: true,
    upnp: true,
    natpmp: true,
    enc_in_policy: 1,
    enc_out_policy: 1,
    enc_level: 2,
    geoip_db_location: "/usr/share/GeoIP/GeoIP.dat",
    cache_size: 512,
    cache_expiry: 60,
    daemon_port: 58846,
    allow_remote: false,
    new_release_check: true,
    queue_new_to_top: false,
    max_active_downloading: 3,
    max_active_seeding: 5,
    max_active_limit: 8,
    dont_count_slow_torrents: true,
    share_ratio_limit: 2,
    seed_time_ratio_limit: 7,
    seed_time_limit: 180,
    stop_seed_at_ratio: false,
    stop_seed_ratio: 2,
    remove_seed_at_ratio: false,
    autoadd_enable: false,
    autoadd_location: "/home/deluge/watch",
    proxy: {
      type: 0,
      hostname: "",
      username: "",
      password: "",
      port: 8080,
      proxy_hostnames: true,
      proxy_peer_connections: true,
      proxy_tracker_connections: true,
    },
  };
}

function seedTorrents(): Record<string, ExtraTorrent> {
  const ubuntu = fakeHash("ubuntu");
  const debian = fakeHash("debian");
  const arch = fakeHash("arch");
  const fedora = fakeHash("fedora");
  const mint = fakeHash("mint");
  const suse = fakeHash("suse");
  const bunny = fakeHash("bunny");
  const checking = fakeHash("checking");

  return {
    [ubuntu]: makeTorrent({
      name: "ubuntu-24.04.2-desktop-amd64.iso",
      size: 5.9 * 1024 ** 3,
      progress: 47.2,
      state: "Downloading",
      down: 4.2 * 1024 ** 2,
      up: 180 * 1024,
      label: "linux",
      tracker: "https://torrent.ubuntu.com/announce",
      queue: 0,
      files: {
        type: "dir",
        contents: {
          "ubuntu-24.04.2-desktop-amd64.iso": fileLeaf(0, 5.9 * 1024 ** 3, 0.472),
        },
      },
    }),
    [debian]: makeTorrent({
      name: "debian-12.10.0-amd64-netinst.iso",
      size: 661 * 1024 ** 2,
      progress: 100,
      state: "Seeding",
      down: 0,
      up: 920 * 1024,
      label: "linux",
      tracker: "https://bttracker.debian.org:443/announce",
      queue: -1,
      files: {
        type: "dir",
        contents: {
          "debian-12.10.0-amd64-netinst.iso": fileLeaf(0, 661 * 1024 ** 2, 1),
        },
      },
    }),
    [arch]: makeTorrent({
      name: "archlinux-2026.08.01-x86_64.iso",
      size: 1.2 * 1024 ** 3,
      progress: 23.8,
      state: "Paused",
      down: 0,
      up: 0,
      label: "linux",
      tracker: "udp://tracker.archlinux.org:6969/announce",
      queue: 2,
      files: {
        type: "dir",
        contents: {
          "archlinux-2026.08.01-x86_64.iso": fileLeaf(0, 1.2 * 1024 ** 3, 0.238),
        },
      },
    }),
    [fedora]: makeTorrent({
      name: "Fedora-Workstation-Live-42-1.1.x86_64.iso",
      size: 2.3 * 1024 ** 3,
      progress: 0,
      state: "Queued",
      down: 0,
      up: 0,
      label: "linux",
      tracker: "http://torrent.fedoraproject.org:6969/announce",
      queue: 3,
      files: {
        type: "dir",
        contents: {
          "Fedora-Workstation-Live-42-1.1.x86_64.iso": fileLeaf(0, 2.3 * 1024 ** 3, 0),
        },
      },
    }),
    [mint]: makeTorrent({
      name: "linuxmint-22.1-cinnamon-64bit.iso",
      size: 3.1 * 1024 ** 3,
      progress: 82.4,
      state: "Downloading",
      down: 2.8 * 1024 ** 2,
      up: 64 * 1024,
      label: "linux",
      tracker: "https://linuxmint.com/torrent/announce",
      queue: 1,
      files: {
        type: "dir",
        contents: {
          "linuxmint-22.1-cinnamon-64bit.iso": fileLeaf(0, 3.1 * 1024 ** 3, 0.824),
        },
      },
    }),
    [suse]: makeTorrent({
      name: "openSUSE-Tumbleweed-DVD-x86_64.iso",
      size: 4.4 * 1024 ** 3,
      progress: 12.1,
      state: "Error",
      down: 0,
      up: 0,
      tracker: "http://tracker.opensuse.org:6969/announce",
      queue: 4,
      message: "No space left on device",
      files: {
        type: "dir",
        contents: {
          "openSUSE-Tumbleweed-DVD-x86_64.iso": fileLeaf(0, 4.4 * 1024 ** 3, 0.121),
        },
      },
    }),
    [bunny]: makeTorrent({
      name: "Big Buck Bunny (2008) 1080p",
      size: 850 * 1024 ** 2,
      progress: 100,
      state: "Seeding",
      down: 0,
      up: 1.4 * 1024 ** 2,
      label: "movies",
      tracker: "udp://tracker.opentrackr.org:1337/announce",
      queue: -1,
      files: {
        type: "dir",
        contents: {
          "Big Buck Bunny": {
            type: "dir",
            contents: {
              "bbb_sunflower_1080p.mp4": fileLeaf(0, 800 * 1024 ** 2, 1),
              "poster.jpg": fileLeaf(1, 2 * 1024 ** 2, 1, 1, 800 * 1024 ** 2),
              "README.txt": fileLeaf(2, 4096, 1, 1, 802 * 1024 ** 2),
            },
          },
        },
      },
    }),
    [checking]: makeTorrent({
      name: "blender-open-movie-pack",
      size: 1.8 * 1024 ** 3,
      progress: 61.5,
      state: "Checking",
      down: 0,
      up: 0,
      label: "movies",
      tracker: "udp://tracker.openbittorrent.com:6969/announce",
      queue: -1,
      files: {
        type: "dir",
        contents: {
          "sintel.mp4": fileLeaf(0, 900 * 1024 ** 2, 0.8),
          "tears_of_steel.mp4": fileLeaf(1, 900 * 1024 ** 2, 0.4, 1, 900 * 1024 ** 2),
        },
      },
    }),
  };
}

function createState(): DemoState {
  const button_state = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 8; h++) button_state[d][h] = 1;
    for (let h = 1; h < 6; h++) button_state[d][h] = 2;
  }
  return {
    sessions: new Set(),
    connected: true,
    hosts: [[HOST_ID, "127.0.0.1", 58846, "localclient"]],
    hostOnline: true,
    torrents: seedTorrents(),
    config: defaultConfig(),
    webConfig: {
      sidebar: true,
      show_session_speed: true,
      sidebar_show_zero: false,
      sidebar_multiple_filters: true,
      show_sidebar: true,
      language: "",
      theme: "dark",
      auto_reconnect: true,
    },
    availablePlugins: [
      "Label",
      "Scheduler",
      "Extractor",
      "Execute",
      "Notifications",
      "Blocklist",
      "AutoAdd",
      "Stats",
      "Toggle",
      "WebUi",
    ],
    enabledPlugins: [
      "Label",
      "Scheduler",
      "Extractor",
      "Execute",
      "Notifications",
      "Blocklist",
      "AutoAdd",
    ],
    labels: {
      linux: defaultLabelOptions(),
      movies: defaultLabelOptions(),
      tv: defaultLabelOptions(),
    },
    scheduler: { low_down: 50, low_up: 10, low_active: 3, button_state },
    extractor: { extract_path: "/home/deluge/Extracted", use_name_folder: true },
    execute: [
      {
        id: "cmd-complete",
        event: "complete",
        command: "/usr/local/bin/notify-complete.sh",
      },
    ],
    notifications: {
      smtp_enabled: false,
      smtp_host: "",
      smtp_port: 587,
      smtp_user: "",
      smtp_pass: "",
      smtp_from: "",
      smtp_recipients: "",
      smtp_tls: true,
      subscriptions: { complete: true, added: false },
    },
    blocklist: {
      url: "https://example.com/blocklist.gz",
      check_after_days: 4,
      last_update: new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
      size: 184233,
      file: "/home/deluge/.config/deluge/blocklist.dat",
      num_blocked: 12,
      state: "Idle",
    },
    autoadd: {
      "watch-iso": {
        id: "watch-iso",
        path: "/home/deluge/watch/iso",
        enabled: true,
        append_extension: ".added",
        download_location: "/home/deluge/Downloads",
        add_paused: false,
        label: "linux",
      },
    },
    uploads: {},
    lastTick: Date.now(),
  };
}

function getState(): DemoState {
  const g = globalThis as GlobalDemo;
  if (!g.__delugeNovaDemo) g.__delugeNovaDemo = createState();
  return g.__delugeNovaDemo;
}

function requireAuth(cookieHeader: string | null) {
  const state = getState();
  const sid = parseCookie(cookieHeader)["_session_id"];
  if (!sid || !state.sessions.has(sid)) {
    throw Object.assign(new Error("Not authenticated"), { code: 1 });
  }
}

function parseCookie(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function pick<T extends object>(obj: T, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in obj) out[key] = (obj as Record<string, unknown>)[key];
  }
  return out;
}

function tickDownloads(state: DemoState) {
  const now = Date.now();
  const dt = Math.min(5, Math.max(0.2, (now - state.lastTick) / 1000));
  state.lastTick = now;
  for (const extra of Object.values(state.torrents)) {
    const t = extra.status;
    if (t.state === "Downloading") {
      const increment = t.download_payload_rate * dt;
      t.total_done = Math.min(t.total_wanted, t.total_done + increment);
      t.total_payload_download += increment;
      t.progress = t.total_wanted ? (t.total_done / t.total_wanted) * 100 : 0;
      t.total_remaining = Math.max(0, t.total_wanted - t.total_done);
      t.eta = t.download_payload_rate > 0 ? t.total_remaining / t.download_payload_rate : -1;
      t.active_time += dt;
      t.download_payload_rate = Math.max(
        80 * 1024,
        t.download_payload_rate + (Math.random() - 0.5) * 200 * 1024
      );
      t.upload_payload_rate = Math.max(0, t.upload_payload_rate + (Math.random() - 0.45) * 20 * 1024);
      bumpFileProgress(extra.files, t.progress / 100);
      if (t.progress >= 100) {
        t.state = "Seeding";
        t.progress = 100;
        t.download_payload_rate = 0;
        t.completed_time = nowSec();
        t.message = "";
        t.queue = -1;
      }
    } else if (t.state === "Seeding") {
      const upInc = t.upload_payload_rate * dt;
      t.total_uploaded += upInc;
      t.total_payload_upload += upInc;
      t.ratio = t.total_wanted > 0 ? t.total_uploaded / t.total_wanted : 0;
      t.seeding_time += dt;
      t.active_time += dt;
      t.upload_payload_rate = Math.max(
        32 * 1024,
        t.upload_payload_rate + (Math.random() - 0.5) * 80 * 1024
      );
    } else if (t.state === "Checking") {
      t.progress = Math.min(100, t.progress + dt * 4);
      if (t.progress >= 100) {
        t.state = "Seeding";
        t.progress = 100;
        t.queue = -1;
      }
    }
  }
  requeue(state);
}

function bumpFileProgress(node: FileNode, progress: number) {
  if (node.type === "file") {
    node.progress = Math.min(1, progress);
    return;
  }
  for (const child of Object.values(node.contents)) bumpFileProgress(child, progress);
}

function matchesFilter(status: TorrentStatus, filter: FilterDict | undefined): boolean {
  if (!filter) return true;
  for (const [key, values] of Object.entries(filter)) {
    if (!values?.length) continue;
    if (values.includes("All") && (key === "state" || key === "tracker_host" || key === "label")) continue;
    if (key === "state") {
      if (values.includes("Active")) {
        if (status.download_payload_rate <= 0 && status.upload_payload_rate <= 0) return false;
        continue;
      }
      if (!values.includes(status.state)) return false;
    } else if (key === "tracker_host") {
      if (!values.includes(status.tracker_host)) return false;
    } else if (key === "label") {
      const label = status.label || "";
      if (!values.includes(label)) return false;
    }
  }
  return true;
}

function buildFilters(state: DemoState) {
  const torrents = Object.values(state.torrents).map((t) => t.status);
  const count = (pred: (t: TorrentStatus) => boolean) => torrents.filter(pred).length;
  const states: [string, number][] = [
    ["All", torrents.length],
    ["Downloading", count((t) => t.state === "Downloading")],
    ["Seeding", count((t) => t.state === "Seeding")],
    ["Paused", count((t) => t.state === "Paused")],
    ["Checking", count((t) => t.state === "Checking")],
    ["Queued", count((t) => t.state === "Queued")],
    ["Error", count((t) => t.state === "Error")],
    ["Active", count((t) => t.download_payload_rate > 0 || t.upload_payload_rate > 0)],
  ];
  const trackers = new Map<string, number>();
  const labels = new Map<string, number>([["", 0]]);
  for (const name of Object.keys(state.labels)) labels.set(name, 0);
  for (const t of torrents) {
    trackers.set(t.tracker_host, (trackers.get(t.tracker_host) ?? 0) + 1);
    const lab = t.label || "";
    labels.set(lab, (labels.get(lab) ?? 0) + 1);
  }
  return {
    state: states,
    // Official core.get_filter_tree sets tracker_host["All"] = len(torrent_ids).
    tracker_host: [
      ["All", torrents.length],
      ...[...trackers.entries()].filter(([name]) => name !== "All"),
    ] as [string, number][],
    label: [...labels.entries()] as [string, number][],
  };
}

function sessionStats(state: DemoState): SessionStats {
  const list = Object.values(state.torrents).map((t) => t.status);
  const download_rate = list.reduce((n, t) => n + t.download_payload_rate, 0);
  const upload_rate = list.reduce((n, t) => n + t.upload_payload_rate, 0);
  return {
    max_download: (state.config.max_download_speed as number) ?? -1,
    max_upload: (state.config.max_upload_speed as number) ?? -1,
    max_num_connections: (state.config.max_connections_global as number) ?? 200,
    num_connections: list.reduce((n, t) => n + t.num_peers + t.num_seeds, 0),
    upload_rate,
    download_rate,
    download_protocol_rate: download_rate * 0.04,
    upload_protocol_rate: upload_rate * 0.04,
    dht_nodes: 284,
    has_incoming_connections: true,
    free_space: 128 * 1024 ** 3,
    external_ip: "203.0.113.42",
  };
}

function idsParam(params: unknown[]): string[] {
  const first = params[0];
  if (Array.isArray(first)) return first.map(String);
  if (typeof first === "string") return [first];
  return [];
}

function inDownloadQueue(status: TorrentStatus): boolean {
  if (status.progress >= 100) return false;
  if (status.state === "Seeding" || status.state === "Checking") return false;
  return true;
}

function compareDemoQueue(a: number, b: number): number {
  const aIn = a >= 0;
  const bIn = b >= 0;
  if (aIn !== bIn) return aIn ? -1 : 1;
  return a - b;
}

function requeue(state: DemoState) {
  const queued: ExtraTorrent[] = [];
  for (const t of Object.values(state.torrents)) {
    if (inDownloadQueue(t.status)) queued.push(t);
    else t.status.queue = -1;
  }
  queued.sort((a, b) => compareDemoQueue(a.status.queue, b.status.queue));
  queued.forEach((t, i) => {
    t.status.queue = i;
  });
}

function queuedEntries(state: DemoState) {
  return Object.entries(state.torrents)
    .filter(([, t]) => t.status.queue >= 0)
    .sort((a, b) => compareDemoQueue(a[1].status.queue, b[1].status.queue));
}

function assignQueuePositions(ordered: ExtraTorrent[]) {
  ordered.forEach((t, i) => {
    t.status.queue = i;
  });
}

function addTorrentFromName(
  state: DemoState,
  name: string,
  options: AddTorrentOptions = {},
  size = 650 * 1024 ** 2,
  files?: FileDir
): string {
  const id = fakeHash(name + Date.now());
  const paused = Boolean(options.add_paused);
  const extra = makeTorrent({
    name,
    size,
    progress: 0,
    state: paused ? "Paused" : "Downloading",
    down: paused ? 0 : 1.1 * 1024 ** 2,
    up: paused ? 0 : 12 * 1024,
    tracker: "udp://tracker.opentrackr.org:1337/announce",
    queue: Object.values(state.torrents).filter((t) => t.status.queue >= 0).length,
    files: files ?? {
      type: "dir",
      contents: { [name]: fileLeaf(0, size, 0) },
    },
  });
  if (options.download_location) extra.status.download_location = options.download_location;
  extra.status.sequential_download = Boolean(options.sequential_download);
  extra.status.prioritize_first_last = Boolean(options.prioritize_first_last_pieces);
  extra.status.max_download_speed = options.max_download_speed ?? -1;
  extra.status.max_upload_speed = options.max_upload_speed ?? -1;
  extra.status.max_connections = options.max_connections ?? -1;
  extra.status.max_upload_slots = options.max_upload_slots ?? -1;
  extra.status.super_seeding = Boolean(options.super_seeding);
  extra.status.move_completed = Boolean(options.move_completed);
  extra.status.move_completed_path =
    options.move_completed_path || extra.status.move_completed_path;
  extra.status.time_added = nowSec();
  extra.status.total_done = 0;
  extra.status.total_uploaded = 0;
  extra.status.ratio = 0;
  extra.status.message = "";
  state.torrents[id] = extra;
  return id;
}

function pluginEnabled(state: DemoState, name: string) {
  return state.enabledPlugins.includes(name);
}

export interface DemoResult {
  id: number | string;
  result: unknown;
  error: { message: string; code?: number } | null;
  setCookie?: string | null;
}

export function handleDemoRpc(body: JsonRpcRequest, cookieHeader: string | null): DemoResult {
  const id = body.id ?? 0;
  const method = body.method;
  const params = Array.isArray(body.params) ? body.params : [];
  const state = getState();

  try {
    if (!method) throw new Error("Missing method");
    const open =
      method === "auth.login" ||
      method === "auth.check_session" ||
      method === "web.connected";
    if (!open) requireAuth(cookieHeader);

    switch (method) {
      case "auth.login": {
        const password = String(params[0] ?? "");
        if (password !== DEMO_PASSWORD) {
          return { id, result: false, error: null };
        }
        const sid = randomBytes(16).toString("hex");
        state.sessions.add(sid);
        return {
          id,
          result: true,
          error: null,
          setCookie: `_session_id=${sid}; Path=/; HttpOnly; SameSite=Lax`,
        };
      }
      case "auth.check_session": {
        const sid = parseCookie(cookieHeader)["_session_id"];
        return { id, result: Boolean(sid && state.sessions.has(sid)), error: null };
      }
      case "auth.delete_session": {
        const sid = parseCookie(cookieHeader)["_session_id"];
        if (sid) state.sessions.delete(sid);
        return {
          id,
          result: true,
          error: null,
          setCookie: `_session_id=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
        };
      }
      case "auth.change_password":
        return { id, result: String(params[0]) === DEMO_PASSWORD, error: null };

      case "web.connected":
        return { id, result: state.connected, error: null };
      case "web.connect":
        state.connected = true;
        state.hostOnline = true;
        return { id, result: ["connected"], error: null };
      case "web.disconnect":
        state.connected = false;
        return { id, result: null, error: null };
      case "web.get_hosts":
        return { id, result: state.hosts, error: null };
      case "web.get_host_status": {
        const hid = String(params[0] ?? HOST_ID);
        const status = state.hostOnline ? "Online" : "Offline";
        return { id, result: [hid, status, "2.1.1"], error: null };
      }
      case "web.add_host": {
        const host = String(params[0] ?? "127.0.0.1");
        const port = Number(params[1] ?? 58846);
        const user = String(params[2] ?? "");
        const hid = fakeHash(host + port + user);
        state.hosts.push([hid, host, port, user]);
        return { id, result: [true, hid], error: null };
      }
      case "web.remove_host": {
        const hid = String(params[0]);
        state.hosts = state.hosts.filter((h) => h[0] !== hid);
        return { id, result: true, error: null };
      }
      case "web.start_daemon":
        state.hostOnline = true;
        return { id, result: true, error: null };
      case "web.stop_daemon":
        state.hostOnline = false;
        state.connected = false;
        return { id, result: true, error: null };
      case "web.update_ui": {
        if (!state.connected) {
          return {
            id,
            result: { connected: false, torrents: null, filters: null, stats: null },
            error: null,
          };
        }
        tickDownloads(state);
        const keys = (params[0] as string[]) || [];
        const filter = params[1] as FilterDict | undefined;
        const torrents: Record<string, Record<string, unknown>> = {};
        for (const [tid, extra] of Object.entries(state.torrents)) {
          if (!matchesFilter(extra.status, filter)) continue;
          torrents[tid] = keys.length
            ? pick(extra.status, keys)
            : ({ ...extra.status } as Record<string, unknown>);
        }
        return {
          id,
          result: {
            connected: true,
            torrents,
            filters: buildFilters(state),
            stats: sessionStats(state),
          },
          error: null,
        };
      }
      case "web.get_torrent_status":
      case "core.get_torrent_status": {
        const tid = String(params[0]);
        const extra = state.torrents[tid];
        if (!extra) throw new Error("Unknown torrent");
        const keys = (params[1] as string[]) || [];
        const base = keys.length ? pick(extra.status, keys) : { ...extra.status };
        if (!keys.length || keys.includes("peers")) (base as Record<string, unknown>).peers = extra.peers;
        if (!keys.length || keys.includes("trackers"))
          (base as Record<string, unknown>).trackers = extra.trackers;
        if (keys.includes("files")) (base as Record<string, unknown>).files = extra.files;
        return { id, result: base, error: null };
      }
      case "web.get_torrent_files": {
        const extra = state.torrents[String(params[0])];
        if (!extra) throw new Error("Unknown torrent");
        return { id, result: extra.files, error: null };
      }
      case "web.get_free_space":
      case "core.get_free_space":
        return { id, result: 128 * 1024 ** 3, error: null };
      case "web.get_config":
        return { id, result: { ...state.webConfig }, error: null };
      case "web.set_config":
        Object.assign(state.webConfig, (params[0] as object) || {});
        return { id, result: null, error: null };
      case "web.get_plugins":
        return {
          id,
          result: {
            available_plugins: state.availablePlugins,
            enabled_plugins: state.enabledPlugins,
          },
          error: null,
        };
      case "web.enable_plugin":
      case "core.enable_plugin": {
        const name = String(params[0]);
        if (!state.enabledPlugins.includes(name)) state.enabledPlugins.push(name);
        return { id, result: true, error: null };
      }
      case "web.disable_plugin":
      case "core.disable_plugin": {
        const name = String(params[0]);
        state.enabledPlugins = state.enabledPlugins.filter((p) => p !== name);
        return { id, result: true, error: null };
      }
      case "web.get_events":
        return { id, result: [], error: null };
      case "web.get_torrent_info": {
        const path = String(params[0] ?? "");
        const uploaded = state.uploads[path];
        const fallbackName = (path.split("/").pop() || "torrent").replace(/\.torrent$/i, "");
        const name = uploaded?.name ?? fallbackName;
        const size = uploaded?.size ?? 100_000_000;
        const filesTree = uploaded?.filesTree ?? inventDemoFilesTree(name, size);
        return {
          id,
          result: {
            name,
            info_hash: uploaded?.infoHash ?? fakeHash(name),
            files_tree: filesTree,
          },
          error: null,
        };
      }
      case "web.get_magnet_info": {
        const uri = String(params[0] ?? "");
        const infoHash = parseMagnetInfoHash(uri);
        if (!infoHash) return { id, result: {}, error: null };
        return {
          id,
          result: {
            name: parseMagnetName(uri),
            info_hash: infoHash,
            files_tree: "",
          },
          error: null,
        };
      }
      case "web.add_torrents": {
        const items = (params[0] as { path?: string; options?: AddTorrentOptions }[]) || [];
        for (const item of items) {
          const path = item.path || "";
          const uploaded = state.uploads[path];
          const name = path.startsWith("magnet:")
            ? parseMagnetName(path)
            : uploaded?.name || path.split("/").pop() || "New torrent";
          const prios = item.options?.file_priorities || [];
          const files = uploaded?.filesTree
            ? mapInfoTreeToStatusFiles(uploaded.filesTree, prios)
            : undefined;
          addTorrentFromName(state, name, item.options, uploaded?.size, files);
        }
        return { id, result: true, error: null };
      }
      case "web.download_torrent_from_url": {
        const url = String(params[0] ?? "");
        const path = `/tmp/deluge-web/${randomUUID()}.torrent`;
        const rawName = url.split("/").pop() || "remote.torrent";
        const name = rawName.replace(/\.torrent$/i, "") || "remote";
        const size = 200_000_000;
        state.uploads[path] = {
          name,
          size,
          filesTree: inventDemoFilesTree(name, size),
          infoHash: fakeHash(name + url),
        };
        return { id, result: path, error: null };
      }

      case "core.pause_torrent":
      case "core.pause_torrents":
        for (const tid of idsParam(params)) {
          const t = state.torrents[tid];
          if (t) {
            t.status.state = "Paused";
            t.status.download_payload_rate = 0;
            t.status.upload_payload_rate = 0;
            t.status.eta = -1;
          }
        }
        return { id, result: null, error: null };
      case "core.resume_torrent":
      case "core.resume_torrents":
        for (const tid of idsParam(params)) {
          const t = state.torrents[tid];
          if (!t) continue;
          if (t.status.progress >= 100) {
            t.status.state = "Seeding";
            t.status.upload_payload_rate = 400 * 1024;
          } else {
            t.status.state = "Downloading";
            t.status.download_payload_rate = 1.5 * 1024 ** 2;
            t.status.upload_payload_rate = 40 * 1024;
          }
          t.status.message = "";
        }
        return { id, result: null, error: null };
      case "core.remove_torrent": {
        delete state.torrents[String(params[0])];
        requeue(state);
        return { id, result: true, error: null };
      }
      case "core.remove_torrents": {
        for (const tid of idsParam(params)) delete state.torrents[tid];
        requeue(state);
        return { id, result: true, error: null };
      }
      case "core.force_recheck":
        for (const tid of idsParam(params)) {
          const t = state.torrents[tid];
          if (t) {
            t.status.state = "Checking";
            t.status.progress = Math.min(99, t.status.progress);
            t.status.download_payload_rate = 0;
            t.status.queue = -1;
          }
        }
        requeue(state);
        return { id, result: null, error: null };
      case "core.force_reannounce":
        return { id, result: null, error: null };
      case "core.queue_top": {
        const set = new Set(idsParam(params));
        const queued = queuedEntries(state);
        const moved = queued.filter(([tid]) => set.has(tid)).map(([, t]) => t);
        const rest = queued.filter(([tid]) => !set.has(tid)).map(([, t]) => t);
        assignQueuePositions([...moved, ...rest]);
        return { id, result: null, error: null };
      }
      case "core.queue_bottom": {
        const set = new Set(idsParam(params));
        const queued = queuedEntries(state);
        const moved = queued.filter(([tid]) => set.has(tid)).map(([, t]) => t);
        const rest = queued.filter(([tid]) => !set.has(tid)).map(([, t]) => t);
        assignQueuePositions([...rest, ...moved]);
        return { id, result: null, error: null };
      }
      case "core.queue_up": {
        const ordered = queuedEntries(state);
        const selected = new Set(idsParam(params));
        for (let i = 1; i < ordered.length; i++) {
          if (selected.has(ordered[i][0]) && !selected.has(ordered[i - 1][0])) {
            const tmp = ordered[i];
            ordered[i] = ordered[i - 1];
            ordered[i - 1] = tmp;
          }
        }
        assignQueuePositions(ordered.map(([, t]) => t));
        return { id, result: null, error: null };
      }
      case "core.queue_down": {
        const ordered = queuedEntries(state);
        const selected = new Set(idsParam(params));
        for (let i = ordered.length - 2; i >= 0; i--) {
          if (selected.has(ordered[i][0]) && !selected.has(ordered[i + 1][0])) {
            const tmp = ordered[i];
            ordered[i] = ordered[i + 1];
            ordered[i + 1] = tmp;
          }
        }
        assignQueuePositions(ordered.map(([, t]) => t));
        return { id, result: null, error: null };
      }
      case "core.move_storage": {
        const dest = String(params[1] ?? "");
        for (const tid of idsParam(params)) {
          const t = state.torrents[tid];
          if (t) {
            t.status.state = "Moving";
            t.status.download_location = dest;
            setTimeout(() => {
              const cur = getState().torrents[tid];
              if (cur && cur.status.state === "Moving") {
                cur.status.state = cur.status.progress >= 100 ? "Seeding" : "Downloading";
              }
            }, 800);
          }
        }
        return { id, result: true, error: null };
      }
      case "core.set_torrent_options": {
        const opts = (params[1] as Record<string, unknown>) || {};
        for (const tid of idsParam(params)) {
          const t = state.torrents[tid];
          if (!t) continue;
          Object.assign(t.status, opts);
        }
        return { id, result: null, error: null };
      }
      case "core.set_torrent_trackers": {
        const extra = state.torrents[String(params[0])];
        if (extra) extra.trackers = (params[1] as TorrentTracker[]) || extra.trackers;
        return { id, result: null, error: null };
      }
      case "core.set_torrent_file_priorities": {
        const extra = state.torrents[String(params[0])];
        const prios = (params[1] as number[]) || [];
        if (extra) applyPriorities(extra.files, prios);
        return { id, result: null, error: null };
      }
      case "core.add_torrent_file":
      case "core.add_torrent_file_async": {
        const filename = String(params[0] ?? "file.torrent");
        const options = (params[2] as AddTorrentOptions) || {};
        addTorrentFromName(state, filename.replace(/\.torrent$/i, ""), options);
        return { id, result: true, error: null };
      }
      case "core.add_torrent_magnet": {
        const uri = String(params[0] ?? "");
        addTorrentFromName(state, parseMagnetName(uri), (params[1] as AddTorrentOptions) || {});
        return { id, result: fakeHash(uri), error: null };
      }
      case "core.add_torrent_url": {
        const url = String(params[0] ?? "");
        addTorrentFromName(
          state,
          url.split("/").pop() || "url-torrent",
          (params[1] as AddTorrentOptions) || {}
        );
        return { id, result: true, error: null };
      }
      case "core.get_config":
        return { id, result: { ...state.config }, error: null };
      case "core.set_config":
        Object.assign(state.config, (params[0] as object) || {});
        return { id, result: null, error: null };
      case "core.get_config_value":
        return { id, result: state.config[String(params[0])], error: null };
      case "core.get_config_values": {
        const keys = (params[0] as string[]) || [];
        const out: Record<string, unknown> = {};
        for (const k of keys) out[k] = state.config[k];
        return { id, result: out, error: null };
      }
      case "core.get_available_plugins":
        return { id, result: state.availablePlugins, error: null };
      case "core.get_enabled_plugins":
        return { id, result: state.enabledPlugins, error: null };
      case "core.get_listen_port":
        return { id, result: 6881, error: null };
      case "core.get_session_status":
        return { id, result: sessionStats(state), error: null };

      case "label.get_labels":
        if (!pluginEnabled(state, "Label")) throw new Error("Plugin not enabled");
        return { id, result: Object.keys(state.labels), error: null };
      case "label.add": {
        const name = String(params[0] ?? "").trim().toLowerCase();
        if (!name) throw new Error("Invalid label");
        state.labels[name] = defaultLabelOptions();
        return { id, result: null, error: null };
      }
      case "label.remove": {
        const name = String(params[0]);
        delete state.labels[name];
        for (const t of Object.values(state.torrents)) {
          if (t.status.label === name) t.status.label = "";
        }
        return { id, result: null, error: null };
      }
      case "label.set_torrent": {
        const extra = state.torrents[String(params[0])];
        if (extra) extra.status.label = String(params[1] ?? "") || undefined;
        return { id, result: null, error: null };
      }
      case "label.get_options":
        return {
          id,
          result: state.labels[String(params[0])] ?? defaultLabelOptions(),
          error: null,
        };
      case "label.set_options": {
        const name = String(params[0]);
        state.labels[name] = {
          ...defaultLabelOptions(),
          ...(state.labels[name] || {}),
          ...((params[1] as LabelOptions) || {}),
        };
        return { id, result: null, error: null };
      }

      case "scheduler.get_config":
        return { id, result: { ...state.scheduler }, error: null };
      case "scheduler.set_config":
        Object.assign(state.scheduler, (params[0] as object) || {});
        return { id, result: null, error: null };

      case "extractor.get_config":
        return { id, result: { ...state.extractor }, error: null };
      case "extractor.set_config":
        Object.assign(state.extractor, (params[0] as object) || {});
        return { id, result: null, error: null };

      case "execute.get_commands":
        return {
          id,
          result: state.execute.map((c) => [c.id, c.event, c.command]),
          error: null,
        };
      case "execute.add_command": {
        const cmd: ExecuteCommand = {
          id: randomUUID(),
          event: String(params[0] ?? "complete"),
          command: String(params[2] ?? params[1] ?? ""),
        };
        state.execute.push(cmd);
        return { id, result: cmd.id, error: null };
      }
      case "execute.remove_command":
        state.execute = state.execute.filter((c) => c.id !== String(params[0]));
        return { id, result: null, error: null };
      case "execute.save_command": {
        const cmd = state.execute.find((c) => c.id === String(params[0]));
        if (cmd) {
          cmd.event = String(params[1] ?? cmd.event);
          cmd.command = String(params[3] ?? params[2] ?? cmd.command);
        }
        return { id, result: null, error: null };
      }

      case "notifications.get_config":
        return { id, result: { ...state.notifications }, error: null };
      case "notifications.set_config":
        Object.assign(state.notifications, (params[0] as object) || {});
        return { id, result: null, error: null };

      case "blocklist.get_status":
      case "blocklist.get_config":
        return { id, result: { ...state.blocklist }, error: null };
      case "blocklist.set_config":
        Object.assign(state.blocklist, (params[0] as object) || {});
        return { id, result: null, error: null };
      case "blocklist.check_import":
      case "blocklist.fetch":
        state.blocklist.state = "Imported";
        state.blocklist.last_update = new Date().toISOString();
        state.blocklist.size += 128;
        return { id, result: true, error: null };

      case "autoadd.get_watchdirs":
        return { id, result: { ...state.autoadd }, error: null };
      case "autoadd.add": {
        const opts = (params[0] as Partial<WatchDir>) || {};
        const watch: WatchDir = {
          id: randomUUID(),
          path: opts.path || "/home/deluge/watch",
          enabled: opts.enabled ?? true,
          append_extension: opts.append_extension || ".added",
          download_location: opts.download_location || "/home/deluge/Downloads",
          add_paused: Boolean(opts.add_paused),
          label: opts.label || "",
        };
        state.autoadd[watch.id] = watch;
        return { id, result: watch.id, error: null };
      }
      case "autoadd.remove":
        delete state.autoadd[String(params[0])];
        return { id, result: true, error: null };
      case "autoadd.set_options": {
        const watch = state.autoadd[String(params[0])];
        if (watch) Object.assign(watch, (params[1] as object) || {});
        return { id, result: true, error: null };
      }
      case "autoadd.enable_watchdir": {
        const watch = state.autoadd[String(params[0])];
        if (watch) watch.enabled = true;
        return { id, result: true, error: null };
      }
      case "autoadd.disable_watchdir": {
        const watch = state.autoadd[String(params[0])];
        if (watch) watch.enabled = false;
        return { id, result: true, error: null };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (err) {
    const error = err as Error & { code?: number };
    return {
      id,
      result: null,
      error: { message: error.message || "RPC error", code: error.code },
    };
  }
}

function applyPriorities(node: FileNode, prios: number[]) {
  if (node.type === "file") {
    if (prios[node.index] != null) node.priority = prios[node.index];
    return;
  }
  for (const child of Object.values(node.contents)) applyPriorities(child, prios);
}

export function handleDemoUpload(filename: string, size: number): { success: boolean; files: string[] } {
  const state = getState();
  const path = `/tmp/deluge-web/uploads/${randomUUID()}-${filename || "upload.torrent"}`;
  const name = (filename || "upload.torrent").replace(/\.torrent$/i, "") || "upload";
  const bytes = size || 400_000_000;
  state.uploads[path] = {
    name,
    size: bytes,
    filesTree: inventDemoFilesTree(name, bytes),
    infoHash: fakeHash(name + path),
  };
  return { success: true, files: [path] };
}
