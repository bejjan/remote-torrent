import { readLocalStorage, storageKey, writeLocalStorage } from "../storage";

export const ADMIN_DEMO_HEADER = "x-nova-admin-demo";
export const STORAGE_ADMIN_DEMO = storageKey("admin-demo");

export const ADMIN_DEMO_DEFAULT_COUNT = 2000;
export const ADMIN_DEMO_MAX_COUNT = 10_000;
export const ADMIN_DEMO_MIN_COUNT = 1;
export const ADMIN_DEMO_DEFAULT_SEED = 1;
export const ADMIN_DEMO_DEFAULT_SEEDING_PCT = 55;
export const ADMIN_DEMO_DEFAULT_DOWNLOADING_PCT = 30;
export const ADMIN_DEMO_DEFAULT_PAUSED_PCT = 10;

/** Unique announce URLs — keep this modest so STATE/TRACKERS stay snappy at 2k+ torrents. */
export const SYNTHETIC_TRACKERS = [
  "https://torrent.ubuntu.com/announce",
  "https://bttracker.debian.org:443/announce",
  "https://linuxmint.com/torrent/announce",
  "http://torrent.fedoraproject.org:6969/announce",
  "http://tracker.opensuse.org:6969/announce",
  "udp://tracker.archlinux.org:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://tracker.openbittorrent.com:6969/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://open.stealth.si:80/announce",
  "udp://explodie.org:6969/announce",
  "udp://tracker.moeking.me:6969/announce",
  "udp://tracker1.bt.moack.co.kr:80/announce",
  "https://tracker.gbitt.info:443/announce",
  "http://tracker.bt4g.com:2095/announce",
  "udp://tracker.tiny-vps.com:6969/announce",
  "udp://tracker.dler.org:6969/announce",
  "udp://open.demonii.com:1337/announce",
  "udp://exodus.desync.com:6969/announce",
  "udp://tracker.theoks.net:6969/announce",
  "udp://tracker-01.loadtest.example:6969/announce",
  "udp://tracker-02.loadtest.example:6969/announce",
  "udp://tracker-03.loadtest.example:6969/announce",
  "udp://tracker-04.loadtest.example:6969/announce",
  "udp://tracker-05.loadtest.example:6969/announce",
  "http://tracker-06.loadtest.example:80/announce",
  "http://tracker-07.loadtest.example:80/announce",
  "https://tracker-08.loadtest.example/announce",
  "https://tracker-09.loadtest.example/announce",
  "udp://public-a.loadtest.example:1337/announce",
  "udp://public-b.loadtest.example:1337/announce",
  "udp://public-c.loadtest.example:1337/announce",
] as const;

export const SYNTHETIC_LABELS = ["linux", "movies", "tv", "music", "books", "games", "other"] as const;

export type SyntheticTorrentState =
  | "Downloading"
  | "Seeding"
  | "Paused"
  | "Checking"
  | "Queued"
  | "Error";

export interface AdminDemoConfig {
  enabled: boolean;
  count: number;
  seed: number;
  seedingPct: number;
  downloadingPct: number;
  pausedPct: number;
}

export interface StoredAdminDemo extends AdminDemoConfig {
  open: boolean;
}

export interface SyntheticMix {
  seeding: number;
  downloading: number;
  paused: number;
  other: number;
}

export interface SyntheticTorrentSpec {
  index: number;
  name: string;
  hash: string;
  size: number;
  progress: number;
  state: SyntheticTorrentState;
  down: number;
  up: number;
  label?: string;
  tracker: string;
  queue: number;
  message?: string;
}

const AMP_TITLES = [
  "Cats & Dogs (2001) 1080p",
  "Tom & Jerry S01E01",
  "R&H Showcase Collection",
  "Simon & Garfunkel Live",
  "Wallace & Gromit: The Curse of the Were-Rabbit",
  "Dune.Part.Two.2024.REPACK.2160p.UPSCALE.WEB.HEVC.10Bit.AAC.2.0-R&H.mkv",
];

const NAME_STEMS = [
  "ubuntu-desktop",
  "debian-netinst",
  "fedora-workstation",
  "archlinux",
  "linuxmint-cinnamon",
  "opensuse-tumbleweed",
  "blender-open-movie",
  "big-buck-bunny",
  "sintel-4k",
  "tears-of-steel",
  "cosmos-s01",
  "planet-earth-ii",
  "jazz-standards",
  "classical-box",
  "gutenberg-epub",
  "libreoffice",
  "kernel-src",
  "game-assets",
];

export function defaultAdminDemoConfig(overrides: Partial<AdminDemoConfig> = {}): AdminDemoConfig {
  return clampAdminDemoConfig({
    enabled: false,
    count: ADMIN_DEMO_DEFAULT_COUNT,
    seed: ADMIN_DEMO_DEFAULT_SEED,
    seedingPct: ADMIN_DEMO_DEFAULT_SEEDING_PCT,
    downloadingPct: ADMIN_DEMO_DEFAULT_DOWNLOADING_PCT,
    pausedPct: ADMIN_DEMO_DEFAULT_PAUSED_PCT,
    ...overrides,
  });
}

export function defaultStoredAdminDemo(): StoredAdminDemo {
  return { ...defaultAdminDemoConfig(), open: false };
}

export function clampPct(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function clampAdminDemoConfig(raw: unknown): AdminDemoConfig {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const countRaw = Number(rec.count ?? rec.torrentCount ?? rec.torrents);
  const seedRaw = Number(rec.seed ?? rec.rngSeed);
  return {
    enabled: rec.enabled === true,
    count: Number.isFinite(countRaw)
      ? Math.max(ADMIN_DEMO_MIN_COUNT, Math.min(ADMIN_DEMO_MAX_COUNT, Math.floor(countRaw)))
      : ADMIN_DEMO_DEFAULT_COUNT,
    seed: Number.isFinite(seedRaw) ? Math.floor(seedRaw) : ADMIN_DEMO_DEFAULT_SEED,
    seedingPct: clampPct(rec.seedingPct ?? rec.seeding, ADMIN_DEMO_DEFAULT_SEEDING_PCT),
    downloadingPct: clampPct(rec.downloadingPct ?? rec.downloading, ADMIN_DEMO_DEFAULT_DOWNLOADING_PCT),
    pausedPct: clampPct(rec.pausedPct ?? rec.paused, ADMIN_DEMO_DEFAULT_PAUSED_PCT),
  };
}

export function getStoredAdminDemo(): StoredAdminDemo {
  const raw = readLocalStorage(STORAGE_ADMIN_DEMO);
  if (!raw) return defaultStoredAdminDemo();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return { ...clampAdminDemoConfig(parsed), open: parsed.open === true };
  } catch {
    return defaultStoredAdminDemo();
  }
}

export function setStoredAdminDemo(value: StoredAdminDemo) {
  const next: StoredAdminDemo = { ...clampAdminDemoConfig(value), open: Boolean(value.open) };
  writeLocalStorage(STORAGE_ADMIN_DEMO, JSON.stringify(next));
}

export function parseAdminDemoHeader(raw: string | null | undefined): AdminDemoConfig | null {
  if (!raw?.trim()) return null;
  try {
    const config = clampAdminDemoConfig(JSON.parse(raw));
    return config.enabled ? config : null;
  } catch {
    return null;
  }
}

export function encodeAdminDemoHeader(config: AdminDemoConfig): string {
  return JSON.stringify(clampAdminDemoConfig(config));
}

export function adminDemoCacheKey(config: AdminDemoConfig): string {
  const c = clampAdminDemoConfig(config);
  return [c.count, c.seed, c.seedingPct, c.downloadingPct, c.pausedPct].join(":");
}

export function normalizeMix(config: AdminDemoConfig): SyntheticMix {
  const seeding = config.seedingPct;
  const downloading = config.downloadingPct;
  const paused = config.pausedPct;
  const sum = seeding + downloading + paused;
  if (sum <= 0) {
    return { seeding: 55, downloading: 30, paused: 10, other: 5 };
  }
  if (sum >= 100) {
    return {
      seeding: (seeding / sum) * 100,
      downloading: (downloading / sum) * 100,
      paused: (paused / sum) * 100,
      other: 0,
    };
  }
  return { seeding, downloading, paused, other: 100 - sum };
}

/** Deterministic 40-char hex so catalogs stay stable across reloads for a given seed. */
export function hashFromSeed(seed: string): string {
  let n = 2166136261;
  let hex = "";
  for (let i = 0; i < 40; i++) {
    n ^= seed.charCodeAt(i % seed.length) + i;
    n = Math.imul(n, 16777619);
    hex += (n >>> 0).toString(16).padStart(8, "0").slice(-1);
  }
  return hex;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickState(index: number, count: number, mix: SyntheticMix): SyntheticTorrentState {
  const t = count > 0 ? (index + 0.5) / count : 0;
  const d = mix.downloading / 100;
  const s = d + mix.seeding / 100;
  const p = s + mix.paused / 100;
  if (t < d) return "Downloading";
  if (t < s) return "Seeding";
  if (t < p) return "Paused";
  const rest = ["Checking", "Queued", "Error"] as const;
  return rest[index % rest.length];
}

function torrentName(index: number, rng: () => number): string {
  if (index % 17 === 0) {
    const title = AMP_TITLES[index % AMP_TITLES.length];
    return `${title} [${String(index + 1).padStart(4, "0")}]`;
  }
  const stem = NAME_STEMS[index % NAME_STEMS.length];
  const tag = rng() > 0.7 ? "-REPACK" : "";
  return `${stem}${tag}-${String(index + 1).padStart(4, "0")}.iso`;
}

/**
 * Build N torrent specs in memory. Cheap enough for 10k; callers map through
 * the existing Deluge / Transmission / qBittorrent adapters.
 */
export function generateSyntheticTorrentSpecs(config: AdminDemoConfig): SyntheticTorrentSpec[] {
  const clamped = clampAdminDemoConfig({ ...config, enabled: true });
  const mix = normalizeMix(clamped);
  const rng = mulberry32(clamped.seed >>> 0);
  const out: SyntheticTorrentSpec[] = new Array(clamped.count);
  let queue = 0;
  for (let i = 0; i < clamped.count; i++) {
    const state = pickState(i, clamped.count, mix);
    const size = Math.round((0.35 + rng() * 18) * 1024 ** 3);
    let progress = 100;
    let down = 0;
    let up = 64 * 1024 + Math.round(rng() * 900 * 1024);
    let message: string | undefined;
    if (state === "Downloading") {
      progress = 4 + rng() * 92;
      down = 200 * 1024 + Math.round(rng() * 4 * 1024 ** 2);
      up = 12 * 1024 + Math.round(rng() * 80 * 1024);
    } else if (state === "Paused") {
      progress = rng() * 90;
      up = 0;
    } else if (state === "Queued") {
      progress = 0;
      up = 0;
    } else if (state === "Checking") {
      progress = 10 + rng() * 80;
      up = 0;
    } else if (state === "Error") {
      progress = 8 + rng() * 40;
      up = 0;
      message = rng() > 0.5 ? "Tracker unavailable" : "No space left on device";
    }
    const inQueue = state === "Downloading" || state === "Paused" || state === "Queued" || state === "Error";
    const labelRoll = rng();
    const label = labelRoll > 0.35 ? SYNTHETIC_LABELS[i % SYNTHETIC_LABELS.length] : undefined;
    const name = torrentName(i, rng);
    out[i] = {
      index: i,
      name,
      hash: hashFromSeed(`admin-${clamped.seed}-${i}-${name}`),
      size,
      progress,
      state,
      down,
      up,
      label,
      tracker: SYNTHETIC_TRACKERS[i % SYNTHETIC_TRACKERS.length],
      queue: inQueue ? queue++ : -1,
      message,
    };
  }
  return out;
}
