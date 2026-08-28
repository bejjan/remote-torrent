"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FilePrioritySelect } from "@/components/app/file-priority-select";
import { OptionsForm } from "@/components/app/torrent-options-form";
import { PeerCountry } from "@/components/app/peer-country";
import { StateBadge } from "@/components/app/state-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rpc } from "@/lib/deluge/client";
import { canonicalizeFilePriority, compactFilePriorities } from "@/lib/deluge/files-tree";
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatEta,
  formatProgress,
  formatRate,
  formatRatio,
  formatSwarmCount,
} from "@/lib/deluge/format";
import type { FileNode, TorrentPeer, TorrentStatus, TorrentTracker } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

export function TorrentDetails({
  torrentId,
  torrent,
  className,
}: {
  torrentId: string | null;
  torrent: TorrentStatus | null;
  className?: string;
}) {
  const [tab, setTab] = useState("status");
  const [files, setFiles] = useState<FileNode | null>(null);
  const [peers, setPeers] = useState<TorrentPeer[]>([]);
  const [trackers, setTrackers] = useState<TorrentTracker[]>([]);
  const [detail, setDetail] = useState<TorrentStatus | null>(torrent);
  const loadGen = useRef(0);

  useEffect(() => {
    setDetail(torrent);
  }, [torrent]);

  const loadDetails = useCallback(async () => {
    if (!torrentId) {
      setFiles(null);
      setPeers([]);
      setTrackers([]);
      return;
    }
    const gen = ++loadGen.current;
    try {
      const [tree, status] = await Promise.all([
        rpc<FileNode>("web.get_torrent_files", [torrentId]),
        rpc<TorrentStatus & { peers?: TorrentPeer[]; trackers?: TorrentTracker[] }>(
          "web.get_torrent_status",
          [torrentId, []]
        ),
      ]);
      if (gen !== loadGen.current) return;
      setFiles(tree);
      setPeers(status.peers || []);
      setTrackers(status.trackers || []);
      setDetail(status);
    } catch {
      /* polling shell still has grid fields */
    }
  }, [torrentId]);

  useEffect(() => {
    void loadDetails();
    const id = setInterval(() => void loadDetails(), 2000);
    return () => {
      loadGen.current += 1;
      clearInterval(id);
    };
  }, [loadDetails]);

  if (!torrentId || !detail) {
    return (
      <div className={cn("flex h-full items-center justify-center text-sm text-muted-foreground", className)}>
        Select a torrent to inspect status, files, peers, and options.
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className={cn("flex h-full min-h-0 flex-col gap-0", className)}>
      <div className="border-b px-2 pt-1">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="peers">Peers</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="trackers">Trackers</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="status" className="min-h-0 overflow-auto p-3">
        <StatusGrid torrent={detail} />
      </TabsContent>
      <TabsContent value="files" className="min-h-0 overflow-auto p-3">
        {files ? (
          <FileTree node={files} torrentId={torrentId} name={detail.name} onApplied={loadDetails} />
        ) : (
          <Muted>No files</Muted>
        )}
      </TabsContent>
      <TabsContent value="peers" className="min-h-0 overflow-auto p-3">
        <PeerTable peers={peers} />
      </TabsContent>
      <TabsContent value="options" className="min-h-0 overflow-auto p-3">
        <OptionsForm key={torrentId} torrentId={torrentId} torrent={detail} />
      </TabsContent>
      <TabsContent value="trackers" className="min-h-0 overflow-auto p-3">
        <TrackersForm torrentId={torrentId} trackers={trackers} onChange={setTrackers} />
      </TabsContent>
    </Tabs>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function StatusGrid({ torrent }: { torrent: TorrentStatus }) {
  const rows: [string, React.ReactNode][] = [
    ["Name", torrent.name],
    ["State", <StateBadge key="s" state={torrent.state} message={torrent.message} />],
    ["Progress", formatProgress(torrent.progress)],
    ["Size", `${formatBytes(torrent.total_done)} / ${formatBytes(torrent.total_wanted)}`],
    ["Downloaded", formatBytes(torrent.total_payload_download)],
    ["Uploaded", formatBytes(torrent.total_payload_upload)],
    ["Download speed", formatRate(torrent.download_payload_rate)],
    ["Upload speed", formatRate(torrent.upload_payload_rate)],
    ["ETA", formatEta(torrent.eta)],
    ["Ratio", formatRatio(torrent.ratio)],
    ["Seeds", formatSwarmCount(torrent.num_seeds, torrent.total_seeds)],
    ["Peers", formatSwarmCount(torrent.num_peers, torrent.total_peers)],
    ["Availability", torrent.distributed_copies.toFixed(3)],
    ["Tracker", torrent.tracker_host],
    ["Tracker status", torrent.tracker_status],
    ["Download folder", torrent.download_location],
    ["Added", formatDate(torrent.time_added)],
    ["Completed", formatDate(torrent.completed_time)],
    ["Active time", formatDuration(torrent.active_time)],
    ["Seeding time", formatDuration(torrent.seeding_time)],
    ["Pieces", `${torrent.num_pieces} × ${formatBytes(torrent.piece_length, 0)}`],
    ["Message", torrent.message || "—"],
    ["Comment", torrent.comment || "—"],
    ["Creator", torrent.creator || "—"],
    ["Label", torrent.label || "—"],
    ["Owner", torrent.owner || "—"],
  ];
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="truncate">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function FileTree({
  node,
  torrentId,
  name,
  path = "",
  onApplied,
}: {
  node: FileNode;
  torrentId: string;
  name: string;
  path?: string;
  onApplied: () => Promise<void>;
}) {
  if (node.type === "file") {
    return (
      <div className="flex items-center gap-3 py-1 text-sm">
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

  return (
    <div className="text-sm">
      {path ? (
        <div className="flex items-center gap-3 py-1">
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
      <div className={path ? "ml-3 border-l pl-3" : ""}>
        {Object.entries(node.contents).map(([childName, child]) => (
          <FileTree
            key={childName}
            node={child}
            torrentId={torrentId}
            name={childName}
            path={`${path}/${childName}`}
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

function PeerTable({ peers }: { peers: TorrentPeer[] }) {
  if (!peers.length) return <Muted>No connected peers.</Muted>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr>
          <th className="py-1 font-medium">IP</th>
          <th className="py-1 font-medium">Client</th>
          <th className="py-1 font-medium">Country</th>
          <th className="py-1 font-medium">Progress</th>
          <th className="py-1 font-medium">Down</th>
          <th className="py-1 font-medium">Up</th>
          <th className="py-1 font-medium">Seed</th>
        </tr>
      </thead>
      <tbody>
        {peers.map((p) => (
          <tr key={p.ip} className="border-t">
            <td className="py-1 font-mono text-xs">{p.ip}</td>
            <td className="py-1">{p.client}</td>
            <td className="py-1">
              <PeerCountry country={p.country} />
            </td>
            <td className="py-1 tabular">{formatProgress(p.progress * 100)}</td>
            <td className="py-1 tabular">{formatRate(p.down_speed)}</td>
            <td className="py-1 tabular">{formatRate(p.up_speed)}</td>
            <td className="py-1">{p.seed ? "Yes" : "No"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TrackersForm({
  torrentId,
  trackers,
  onChange,
}: {
  torrentId: string;
  trackers: TorrentTracker[];
  onChange: (t: TorrentTracker[]) => void;
}) {
  const [url, setUrl] = useState("");

  async function save(next: TorrentTracker[]) {
    try {
      await rpc("core.set_torrent_trackers", [torrentId, next]);
      onChange(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tracker update failed");
    }
  }

  return (
    <div className="grid gap-3">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1 font-medium">URL</th>
            <th className="py-1 font-medium">Tier</th>
          </tr>
        </thead>
        <tbody>
          {trackers.map((t) => (
            <tr key={t.url} className="border-t">
              <td className="py-1 font-mono text-xs">{t.url}</td>
              <td className="py-1">{t.tier}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <Input
          placeholder="udp://tracker.example:6969/announce"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => {
            if (!url.trim()) return;
            void save([...trackers, { url: url.trim(), tier: 0 }]);
            setUrl("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
