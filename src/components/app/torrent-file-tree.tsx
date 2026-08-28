"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FileKindIcon, FolderTreeIcon } from "@/components/app/file-tree-icons";
import { FilePrioritySelect } from "@/components/app/file-priority-select";
import { rpc } from "@/lib/deluge/client";
import { defaultFolderExpanded, isHugeFileTree } from "@/lib/deluge/file-tree-view";
import { canonicalizeFilePriority, compactFilePriorities } from "@/lib/deluge/files-tree";
import { formatBytes, formatProgress } from "@/lib/deluge/format";
import type { FileNode } from "@/lib/deluge/types";

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
    <FileTreeNode
      node={node}
      torrentId={torrentId}
      name={name}
      path=""
      depth={0}
      huge={huge}
      onApplied={onApplied}
    />
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
      <div className="flex items-center gap-2 py-1 text-sm">
        <span className="inline-block size-6 shrink-0" aria-hidden />
        <FileKindIcon name={name} />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="tabular w-20 text-right text-muted-foreground">{formatBytes(node.size)}</span>
        <span className="tabular w-12 text-right">{formatProgress(node.progress * 100)}</span>
        <FilePrioritySelect
          value={node.priority}
          onChange={(priority) => {
            void setFilePriorities(torrentId, [node.index], priority, onApplied);
          }}
        />
      </div>
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
    <div className="text-sm">
      {showRow ? (
        <div className="flex items-center gap-2 py-1">
          <button
            type="button"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-expanded={open}
            aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
          <FolderTreeIcon open={open} />
          <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
          <span className="tabular w-20 text-right text-muted-foreground">{formatBytes(fileTreeSize(node))}</span>
          <span className="w-12" />
          <FilePrioritySelect
            value={shared ?? "mixed"}
            mixed={shared == null}
            onChange={(priority) => {
              void setFilePriorities(torrentId, indexes, priority, onApplied);
            }}
          />
        </div>
      ) : null}
      <div className={showRow ? (open ? "ml-3 border-l pl-3" : "hidden") : ""}>
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
