import {
  Captions,
  Disc3,
  File,
  FileArchive,
  FileImage,
  FileMusic,
  Film,
  Folder,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { fileIconKind, type FileIconKind } from "@/lib/deluge/file-tree-view";

const FILE_KIND_ICONS: Record<FileIconKind, LucideIcon> = {
  video: Film,
  audio: FileMusic,
  image: FileImage,
  archive: FileArchive,
  subtitle: Captions,
  disk: Disc3,
  file: File,
};

export const TREE_ICON_CLASS = "size-3.5 shrink-0 text-muted-foreground";

export function FileKindIcon({ name }: { name: string }) {
  const Icon = FILE_KIND_ICONS[fileIconKind(name)];
  return <Icon className={TREE_ICON_CLASS} aria-hidden />;
}

export function FolderTreeIcon({ open }: { open: boolean }) {
  const Icon = open ? FolderOpen : Folder;
  return <Icon className={TREE_ICON_CLASS} aria-hidden />;
}
