"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StateBadge } from "@/components/app/state-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rpc } from "@/lib/deluge/client";
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatEta,
  formatProgress,
  formatRate,
  formatRatio,
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

  useEffect(() => {
    setDetail(torrent);
  }, [torrent]);

  useEffect(() => {
    if (!torrentId) {
      setFiles(null);
      setPeers([]);
      setTrackers([]);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [tree, status] = await Promise.all([
          rpc<FileNode>("web.get_torrent_files", [torrentId]),
          rpc<TorrentStatus & { peers?: TorrentPeer[]; trackers?: TorrentTracker[] }>(
            "web.get_torrent_status",
            [torrentId, []]
          ),
        ]);
        if (cancelled) return;
        setFiles(tree);
        setPeers(status.peers || []);
        setTrackers(status.trackers || []);
        setDetail(status);
      } catch {
        /* polling shell still has grid fields */
      }
    }
    void load();
    const id = setInterval(() => void load(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [torrentId]);

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
        {files ? <FileTree node={files} torrentId={torrentId} name={detail.name} /> : <Muted>No files</Muted>}
      </TabsContent>
      <TabsContent value="peers" className="min-h-0 overflow-auto p-3">
        <PeerTable peers={peers} />
      </TabsContent>
      <TabsContent value="options" className="min-h-0 overflow-auto p-3">
        <OptionsForm torrentId={torrentId} torrent={detail} />
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
    ["Seeds", `${torrent.num_seeds} (${torrent.total_seeds})`],
    ["Peers", `${torrent.num_peers} (${torrent.total_peers})`],
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
}: {
  node: FileNode;
  torrentId: string;
  name: string;
  path?: string;
}) {
  if (node.type === "file") {
    return (
      <div className="flex items-center gap-3 py-1 text-sm">
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="tabular w-20 text-right text-muted-foreground">{formatBytes(node.size)}</span>
        <span className="tabular w-12 text-right">{formatProgress(node.progress * 100)}</span>
        <Select
          value={String(node.priority)}
          onValueChange={(v) => {
            if (v == null) return;
            void setPriority(torrentId, node.index, Number(v));
          }}
        >
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Skip</SelectItem>
            <SelectItem value="1">Normal</SelectItem>
            <SelectItem value="5">High</SelectItem>
            <SelectItem value="7">Highest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }
  return (
    <div className="text-sm">
      {path ? <div className="py-1 font-medium">{name}</div> : null}
      <div className={path ? "ml-3 border-l pl-3" : ""}>
        {Object.entries(node.contents).map(([childName, child]) => (
          <FileTree
            key={childName}
            node={child}
            torrentId={torrentId}
            name={childName}
            path={`${path}/${childName}`}
          />
        ))}
      </div>
    </div>
  );
}

async function setPriority(torrentId: string, index: number, priority: number) {
  try {
    const tree = await rpc<FileNode>("web.get_torrent_files", [torrentId]);
    const prios: number[] = [];
    walkFiles(tree, (f) => {
      prios[f.index] = f.index === index ? priority : f.priority;
    });
    await rpc("core.set_torrent_file_priorities", [torrentId, prios]);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Priority failed");
  }
}

function walkFiles(node: FileNode, visit: (f: Extract<FileNode, { type: "file" }>) => void) {
  if (node.type === "file") visit(node);
  else Object.values(node.contents).forEach((c) => walkFiles(c, visit));
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
            <td className="py-1">{p.country}</td>
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

function OptionsForm({ torrentId, torrent }: { torrentId: string; torrent: TorrentStatus }) {
  const [maxDown, setMaxDown] = useState(String(torrent.max_download_speed));
  const [maxUp, setMaxUp] = useState(String(torrent.max_upload_speed));
  const [maxConn, setMaxConn] = useState(String(torrent.max_connections));
  const [maxSlots, setMaxSlots] = useState(String(torrent.max_upload_slots));
  const [auto, setAuto] = useState(torrent.is_auto_managed);
  const [stopRatio, setStopRatio] = useState(torrent.stop_at_ratio);
  const [ratio, setRatio] = useState(String(torrent.stop_ratio));
  const [removeAt, setRemoveAt] = useState(torrent.remove_at_ratio);
  const [move, setMove] = useState(torrent.move_completed);
  const [movePath, setMovePath] = useState(torrent.move_completed_path);
  const [superSeed, setSuperSeed] = useState(torrent.super_seeding);
  const [firstLast, setFirstLast] = useState(torrent.prioritize_first_last);

  async function save() {
    try {
      await rpc("core.set_torrent_options", [
        [torrentId],
        {
          max_download_speed: Number(maxDown),
          max_upload_speed: Number(maxUp),
          max_connections: Number(maxConn),
          max_upload_slots: Number(maxSlots),
          is_auto_managed: auto,
          stop_at_ratio: stopRatio,
          stop_ratio: Number(ratio),
          remove_at_ratio: removeAt,
          move_completed: move,
          move_completed_path: movePath,
          super_seeding: superSeed,
          prioritize_first_last: firstLast,
        },
      ]);
      toast.success("Options saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="grid max-w-xl gap-3">
      <NumField label="Max download (KiB/s, −1 unlimited)" value={maxDown} onChange={setMaxDown} />
      <NumField label="Max upload (KiB/s, −1 unlimited)" value={maxUp} onChange={setMaxUp} />
      <NumField label="Max connections" value={maxConn} onChange={setMaxConn} />
      <NumField label="Max upload slots" value={maxSlots} onChange={setMaxSlots} />
      <Toggle label="Auto managed" checked={auto} onChange={setAuto} />
      <Toggle label="Stop at ratio" checked={stopRatio} onChange={setStopRatio} />
      <NumField label="Stop ratio" value={ratio} onChange={setRatio} />
      <Toggle label="Remove at ratio" checked={removeAt} onChange={setRemoveAt} />
      <Toggle label="Move completed" checked={move} onChange={setMove} />
      <div className="grid gap-1.5">
        <Label>Move completed path</Label>
        <Input value={movePath} onChange={(e) => setMovePath(e.target.value)} />
      </div>
      <Toggle label="Super seeding" checked={superSeed} onChange={setSuperSeed} />
      <Toggle label="Prioritize first/last" checked={firstLast} onChange={setFirstLast} />
      <Button className="w-fit" onClick={() => void save()}>
        Apply
      </Button>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
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
