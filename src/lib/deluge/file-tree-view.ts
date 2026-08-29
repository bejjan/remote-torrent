import type { FileNode } from "./types";

/** Icon category for a torrent file, derived from its extension. */
export type FileIconKind = "video" | "audio" | "image" | "archive" | "subtitle" | "disk" | "file";

const KIND_EXTENSIONS: Record<Exclude<FileIconKind, "file">, readonly string[]> = {
  video: [
    "mp4",
    "mkv",
    "avi",
    "mov",
    "wmv",
    "webm",
    "m4v",
    "mpg",
    "mpeg",
    "mpe",
    "flv",
    "ts",
    "m2ts",
    "mts",
    "vob",
    "ogv",
    "3gp",
    "asf",
    "f4v",
  ],
  audio: ["mp3", "flac", "wav", "aac", "ogg", "oga", "m4a", "wma", "opus", "aiff", "aif", "alac", "ape", "ac3", "dts", "mka"],
  image: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "svg", "heic", "heif", "raw", "cr2", "nef", "dng", "psd", "ico"],
  archive: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz", "tbz", "tbz2", "txz", "zst", "lz", "lz4", "cab", "arj"],
  subtitle: ["srt", "ass", "ssa", "sub", "idx", "vtt", "sup", "smi", "mks", "lrc"],
  disk: ["iso", "img", "nrg", "bin", "cue", "dmg", "vhd", "vhdx", "vmdk", "vdi"],
};

const EXT_TO_KIND = new Map<string, FileIconKind>();
for (const [kind, exts] of Object.entries(KIND_EXTENSIONS) as [Exclude<FileIconKind, "file">, readonly string[]][]) {
  for (const ext of exts) EXT_TO_KIND.set(ext, kind);
}

const COMPOUND_SUFFIXES: [string, FileIconKind][] = [
  [".tar.gz", "archive"],
  [".tar.bz2", "archive"],
  [".tar.xz", "archive"],
  [".tar.zst", "archive"],
];

/** Expand every folder unless the tree has this many nodes (files + dirs). */
export const HUGE_FILE_TREE_NODE_COUNT = 50;

export function fileExtension(name: string): string {
  const base = name.split(/[/\\]/).pop() || name;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function fileIconKind(name: string): FileIconKind {
  const base = (name.split(/[/\\]/).pop() || name).toLowerCase();
  for (const [suffix, kind] of COMPOUND_SUFFIXES) {
    if (base.endsWith(suffix)) return kind;
  }
  return EXT_TO_KIND.get(fileExtension(base)) ?? "file";
}

export function countFileTreeNodes(node: FileNode): number {
  if (node.type === "file") return 1;
  let n = 1;
  for (const child of Object.values(node.contents)) n += countFileTreeNodes(child);
  return n;
}

export function isHugeFileTree(node: FileNode): boolean {
  return countFileTreeNodes(node) >= HUGE_FILE_TREE_NODE_COUNT;
}

/**
 * Root is depth 0 (always shown). Depth 1 is the first visible folder row.
 * Huge trees expand only that first level; smaller trees start fully expanded.
 */
export function defaultFolderExpanded(depth: number, huge: boolean): boolean {
  if (!huge) return true;
  return depth < 2;
}
