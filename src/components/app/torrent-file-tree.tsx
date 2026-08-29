"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FileKindIcon, FolderTreeIcon } from "@/components/app/file-tree-icons";
import { FilePrioritySelect } from "@/components/app/file-priority-select";
import { rpc } from "@/lib/deluge/client";
import { defaultFolderExpanded, isHugeFileTree } from "@/lib/deluge/file-tree-view";
import { canonicalizeFilePriority, compactFilePriorities } from "@/lib/deluge/files-tree";
import { formatBytes, formatProgress } from "@/lib/deluge/format";
import type { FileNode } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

const FILE_PRIORITY_CLASS = "h-7 w-[6.75rem] min-w-0 shrink-0 @min-[420px]:w-36";

export function FileTree({
  node,
  torrentId,
  name,
  onApplied,
}: {
  node: FileNode;
  torrentId: string;
  name: string;
  onApplied: () => Promise<void>;
}) {
  const huge = isHugeFileTree(node);
  return (
    <div className="min-w-0">
      <FileTreeNode
        node={node}
        torrentId={torrentId}
        name={name}
        path=""
        depth={0}
        huge={huge}
        onApplied={onApplied}
      />
    </div>
  );
}

function FileTreeNode({
  node,
  torrentId,
  name,
  path,
  depth,
  huge,
  onApplied,
}: {
  node: FileNode;
  torrentId: string;
  name: string;
  path: string;
  depth: number;
  huge: boolean;
  onApplied: () => Promise<void>;
}) {
  const [open, setOpen] = useState(() => defaultFolderExpanded(depth, huge));

  if (node.type === "file") {
    return (
      <TreeRow
        leading={<span className="inline-block size-6 shrink-0" aria-hidden />}
        icon={<FileKindIcon name={name} />}
        name={name}
        size={node.size}
        progress={node.progress}
        action={
          <FilePrioritySelect
            className={FILE_PRIORITY_CLASS}
            value={node.priority}
            onChange={(priority) => {
              void setFilePriorities(torrentId, [node.index], priority, onApplied);
            }}
          />
        }
      />
    );
  }

  const files: Extract<FileNode, { type: "file" }>[] = [];
  walkFiles(node, (f) => files.push(f));
  const indexes = files.map((f) => f.index);
  const first = files[0];
  const shared =
    first &&
    files.every((f) => canonicalizeFilePriority(f.priority) === canonicalizeFilePriority(first.priority))
      ? canonicalizeFilePriority(first.priority)
      : null;
  const showRow = Boolean(path);

  return (
    <div className="min-w-0 text-sm">
      {showRow ? (
        <TreeRow
          leading={
            <button
              type="button"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-expanded={open}
              aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          }
          icon={<FolderTreeIcon open={open} />}
          name={name}
          nameClass="font-medium"
          size={fileTreeSize(node)}
          action={
            <FilePrioritySelect
              className={FILE_PRIORITY_CLASS}
              value={shared ?? "mixed"}
              mixed={shared == null}
              onChange={(priority) => {
                void setFilePriorities(torrentId, indexes, priority, onApplied);
              }}
            />
          }
        />
      ) : null}
      <div className={showRow ? (open ? "ml-3 min-w-0 overflow-hidden border-l pl-3" : "hidden") : "min-w-0"}>
        {Object.entries(node.contents).map(([childName, child]) => (
          <FileTreeNode
            key={childName}
            node={child}
            torrentId={torrentId}
            name={childName}
            path={`${path}/${childName}`}
            depth={depth + 1}
            huge={huge}
            onApplied={onApplied}
          />
        ))}
      </div>
    </div>
  );
}

function TreeRow({
  leading,
  icon,
  name,
  nameClass,
  size,
  progress,
  action,
}: {
  leading: ReactNode;
  icon: ReactNode;
  name: string;
  nameClass?: string;
  size: number;
  progress?: number;
  action: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 py-1 text-sm">
      {leading}
      {icon}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className={cn("min-w-0 truncate", nameClass)} title={name}>
          {name}
        </div>
        <div className="flex min-w-0 gap-x-2 text-[11px] tabular text-muted-foreground @min-[420px]:hidden">
          <span>{formatBytes(size)}</span>
          {progress != null ? <span>{formatProgress(progress * 100)}</span> : null}
        </div>
      </div>
      <span className="tabular hidden w-16 shrink-0 text-right text-xs text-muted-foreground @min-[420px]:inline">
        {formatBytes(size)}
      </span>
      {progress != null ? (
        <span className="tabular hidden w-10 shrink-0 text-right text-xs @min-[420px]:inline">
          {formatProgress(progress * 100)}
        </span>
      ) : (
        <span className="hidden w-10 shrink-0 @min-[420px]:inline" aria-hidden />
      )}
      {action}
    </div>
  );
}

async function setFilePriorities(
  torrentId: string,
  indexes: number[],
  priority: number,
  onApplied: () => Promise<void>
) {
  try {
    const tree = await rpc<FileNode>("web.get_torrent_files", [torrentId]);
    const prios: number[] = [];
    const indexSet = new Set(indexes);
    walkFiles(tree, (f) => {
      prios[f.index] = indexSet.has(f.index) ? priority : f.priority;
    });
    await rpc("core.set_torrent_file_priorities", [torrentId, compactFilePriorities(prios)]);
    await onApplied();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Priority failed");
  }
}

function walkFiles(node: FileNode, visit: (f: Extract<FileNode, { type: "file" }>) => void) {
  if (node.type === "file") visit(node);
  else Object.values(node.contents).forEach((c) => walkFiles(c, visit));
}

function fileTreeSize(node: FileNode): number {
  if (node.type === "file") return node.size;
  return Object.values(node.contents).reduce((sum, child) => sum + fileTreeSize(child), 0);
}
