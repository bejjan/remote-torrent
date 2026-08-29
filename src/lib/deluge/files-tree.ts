import type { FileDir, FileNode } from "./types";

/** Official Deluge `web.get_torrent_info` filetree=2 node. */
export interface TorrentInfoFile {
  type: "file";
  index: number;
  length: number;
  download: boolean;
  path?: string;
}

export interface TorrentInfoDir {
  type: "dir";
  contents: Record<string, TorrentInfoNode>;
  length?: number;
}

export type TorrentInfoNode = TorrentInfoFile | TorrentInfoDir;

export interface TorrentFileInfo {
  name: string;
  info_hash: string;
  files_tree?: TorrentInfoNode | "" | null;
  filename?: string;
}

/** Matches `deluge.ui.common.FILE_PRIORITY` used by GTK/Web. */
export const FILE_PRIORITY_OPTIONS = [
  { value: 0, label: "Don't download" },
  { value: 1, label: "Low" },
  { value: 4, label: "Normal" },
  { value: 7, label: "High" },
] as const;

export type CanonicalFilePriority = (typeof FILE_PRIORITY_OPTIONS)[number]["value"];

/** Base UI Select `items` map: value → displayed label (never the raw number). */
export const FILE_PRIORITY_SELECT_ITEMS: Record<string, string> = Object.fromEntries(
  FILE_PRIORITY_OPTIONS.map((opt) => [String(opt.value), opt.label])
);

export const DEFAULT_FILE_PRIORITY = 4;

/**
 * libtorrent priorities are 0–7. Deluge’s four labels map:
 * 0 skip, 1–3 Low, 4 Normal, 5–7 High.
 */
export function canonicalizeFilePriority(priority: number): CanonicalFilePriority {
  if (!Number.isFinite(priority)) return DEFAULT_FILE_PRIORITY;
  if (priority <= 0) return 0;
  if (priority >= 5) return 7;
  if (priority >= 4) return 4;
  return 1;
}

export function filePriorityLabel(priority: number): string {
  const value = canonicalizeFilePriority(priority);
  return FILE_PRIORITY_OPTIONS.find((opt) => opt.value === value)?.label ?? "Normal";
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nodeLength(raw: UnknownRecord): number {
  const length = raw.length ?? raw.size;
  return typeof length === "number" && Number.isFinite(length) ? length : 0;
}

function nodeIndex(raw: UnknownRecord): number {
  const index = raw.index ?? raw.fileindex;
  return typeof index === "number" && Number.isFinite(index) ? index : 0;
}

function nodeDownload(raw: UnknownRecord): boolean {
  if (raw.download === false) return false;
  if (raw.priority === 0) return false;
  return true;
}

export function normalizeFilesTree(raw: unknown): TorrentInfoDir | null {
  if (!raw || raw === true) return null;
  if (typeof raw === "string") return null;
  if (!isRecord(raw)) return null;

  const contents = isRecord(raw.contents) ? raw.contents : raw;
  if (!isRecord(contents)) return null;
  const entries = Object.entries(contents).filter(([key]) => key !== "type" && key !== "length");
  if (!entries.length && raw.type !== "dir" && !raw.contents) return null;

  const mapped: Record<string, TorrentInfoNode> = {};
  for (const [name, child] of entries) {
    const node = normalizeNode(child);
    if (node) mapped[name] = node;
  }
  if (!Object.keys(mapped).length && raw.type !== "dir") return null;
  return { type: "dir", contents: mapped, length: nodeLength(raw) || undefined };
}

function normalizeNode(raw: unknown): TorrentInfoNode | null {
  if (!isRecord(raw)) return null;
  const hasContents = isRecord(raw.contents);
  const type = raw.type === "file" || raw.type === "dir" ? raw.type : hasContents ? "dir" : "file";
  if (type === "dir" || hasContents) {
    const dir = normalizeFilesTree(raw);
    return dir;
  }
  return {
    type: "file",
    index: nodeIndex(raw),
    length: nodeLength(raw),
    download: nodeDownload(raw),
    path: typeof raw.path === "string" ? raw.path : undefined,
  };
}

export function walkInfoFiles(
  node: TorrentInfoNode,
  visit: (file: TorrentInfoFile, path: string) => void,
  path = ""
) {
  if (node.type === "file") {
    visit(node, path);
    return;
  }
  for (const [name, child] of Object.entries(node.contents)) {
    walkInfoFiles(child, visit, path ? `${path}/${name}` : name);
  }
}

export function infoFileIndexes(node: TorrentInfoNode, path = ""): number[] {
  const indexes: number[] = [];
  walkInfoFiles(node, (file) => indexes.push(file.index), path);
  return indexes;
}

export function infoTreeSize(node: TorrentInfoNode): number {
  if (node.type === "file") return node.length;
  if (typeof node.length === "number" && node.length > 0) return node.length;
  return Object.values(node.contents).reduce((sum, child) => sum + infoTreeSize(child), 0);
}

export function initialFilePriorities(tree: TorrentInfoDir | null): number[] {
  if (!tree) return [];
  const prios: number[] = [];
  walkInfoFiles(tree, (file) => {
    prios[file.index] = file.download === false ? 0 : DEFAULT_FILE_PRIORITY;
  });
  return prios;
}

export function compactFilePriorities(priorities: number[]): number[] {
  const length = priorities.length;
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const value = priorities[i];
    out[i] = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_FILE_PRIORITY;
  }
  return out;
}

export function setPrioritiesForIndexes(
  priorities: number[],
  indexes: number[],
  value: number
): number[] {
  const next = priorities.slice();
  for (const index of indexes) next[index] = value;
  return next;
}

export function commonPriority(priorities: number[], indexes: number[]): number | null {
  if (!indexes.length) return null;
  const first = priorities[indexes[0]] ?? DEFAULT_FILE_PRIORITY;
  return indexes.every((index) => (priorities[index] ?? DEFAULT_FILE_PRIORITY) === first)
    ? first
    : null;
}

export function mapInfoTreeToStatusFiles(tree: TorrentInfoDir, priorities: number[] = []): FileDir {
  function mapNode(node: TorrentInfoNode): FileNode {
    if (node.type === "file") {
      return {
        type: "file",
        index: node.index,
        size: node.length,
        progress: 0,
        priority: priorities[node.index] ?? DEFAULT_FILE_PRIORITY,
        offset: 0,
      };
    }
    const contents: Record<string, FileNode> = {};
    for (const [name, child] of Object.entries(node.contents)) contents[name] = mapNode(child);
    return { type: "dir", contents };
  }
  const mapped = mapNode(tree);
  return mapped.type === "dir" ? mapped : { type: "dir", contents: { file: mapped } };
}

export function inventDemoFilesTree(name: string, size: number): TorrentInfoDir {
  const safe = name.replace(/[/\\]/g, "_") || "torrent";
  const total = size > 0 ? size : 400 * 1024 ** 2;
  const video = Math.max(1024, Math.round(total * 0.9));
  const sample = Math.max(1024, Math.round(total * 0.08));
  const nfo = Math.max(256, total - video - sample);
  return {
    type: "dir",
    contents: {
      [safe]: {
        type: "dir",
        length: total,
        contents: {
          [`${safe}.mkv`]: {
            type: "file",
            index: 0,
            length: video,
            download: true,
          },
          sample: {
            type: "dir",
            length: sample,
            contents: {
              [`${safe}-sample.mkv`]: {
                type: "file",
                index: 1,
                length: sample,
                download: true,
              },
            },
          },
          [`${safe}.nfo`]: {
            type: "file",
            index: 2,
            length: nfo,
            download: true,
          },
        },
      },
    },
  };
}

export function parseMagnetInfoHash(uri: string): string {
  try {
    const query = uri.includes("?") ? uri.slice(uri.indexOf("?") + 1) : uri;
    const params = new URLSearchParams(query);
    const xt = params.get("xt") || "";
    const match = xt.match(/urn:btih:([a-zA-Z0-9]+)/i);
    return match?.[1]?.toLowerCase() || "";
  } catch {
    return "";
  }
}

export function isMagnetUri(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("magnet:?") && /xt=urn:btih:/i.test(trimmed);
}
