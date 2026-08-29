"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal, PanelBottom, PanelRight, X } from "lucide-react";
import { toast } from "sonner";
import { FileTree } from "@/components/app/torrent-file-tree";
import { OptionsForm } from "@/components/app/torrent-options-form";
import { PeerCountry } from "@/components/app/peer-country";
import { StateBadge, stateBarClass } from "@/components/app/state-badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  formatSwarmCount,
} from "@/lib/deluge/format";
import type { DetailsDock } from "@/lib/deluge/ui-layout";
import type { FileNode, TorrentPeer, TorrentStatus, TorrentTracker } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

export function TorrentDetails({
  torrentId,
  torrent,
  className,
  dock,
  onDockChange,
  onClose,
}: {
  torrentId: string | null;
  torrent: TorrentStatus | null;
  className?: string;
  dock?: DetailsDock;
  onDockChange?: (dock: DetailsDock) => void;
  onClose?: () => void;
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

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className={cn("@container flex h-full min-h-0 min-w-0 flex-col gap-0", className)}
    >
      <DetailsHeader
        name={detail?.name || "Details"}
        hash={torrentId}
        dock={dock ?? "bottom"}
        onDockChange={onDockChange}
        onClose={onClose}
      />
      <div className="min-w-0 overflow-x-auto border-b px-2 pt-1">
        <TabsList variant="line" className="w-max min-w-full justify-start">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="peers">Peers</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="trackers">Trackers</TabsTrigger>
        </TabsList>
      </div>
      {torrentId && detail ? (
        <>
          <TabsContent value="status" className="min-h-0 min-w-0 overflow-auto p-3">
            <StatusGrid torrent={detail} />
          </TabsContent>
          <TabsContent value="files" className="min-h-0 min-w-0 overflow-auto p-3">
            {files ? (
              <FileTree
                key={torrentId}
                node={files}
                torrentId={torrentId}
                name={detail.name}
                onApplied={loadDetails}
              />
            ) : (
              <Muted>No files</Muted>
            )}
          </TabsContent>
          <TabsContent value="peers" className="min-h-0 min-w-0 overflow-auto p-3">
            <PeerTable peers={peers} />
          </TabsContent>
          <TabsContent value="options" className="min-h-0 min-w-0 overflow-auto p-3">
            <OptionsForm key={torrentId} torrentId={torrentId} torrent={detail} />
          </TabsContent>
          <TabsContent value="trackers" className="min-h-0 min-w-0 overflow-auto p-3">
            <TrackersForm key={torrentId} torrentId={torrentId} trackers={trackers} onChange={setTrackers} />
          </TabsContent>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center px-3 text-sm text-muted-foreground">
          Select a torrent to inspect status, files, peers, and options.
        </div>
      )}
    </Tabs>
  );
}

function DetailsTitle({ name, hash }: { name: string; hash: string | null }) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden">
      <div className="truncate text-sm font-medium" title={name}>
        {name}
      </div>
      {hash ? (
        <div
          className="line-clamp-2 min-w-0 break-all font-mono text-[11px] leading-snug text-muted-foreground"
          title={hash}
        >
          {hash}
        </div>
      ) : null}
    </div>
  );
}

function DetailsHeader({
  name,
  hash,
  dock,
  onDockChange,
  onClose,
}: {
  name: string;
  hash: string | null;
  dock: DetailsDock;
  onDockChange?: (dock: DetailsDock) => void;
  onClose?: () => void;
}) {
  const title = <DetailsTitle name={name} hash={hash} />;
  const controls = (
    <div className="flex shrink-0 items-center pt-px">
      {onDockChange ? <DetailsDockControl dock={dock} onDockChange={onDockChange} /> : null}
      {onClose ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Close details"
          className="text-muted-foreground"
          onClick={onClose}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-w-0 items-start gap-1 overflow-hidden border-b px-2 py-1">
      {onDockChange ? (
        <ContextMenu>
          <ContextMenuTrigger className="min-w-0 flex-1 overflow-hidden">
            {title}
          </ContextMenuTrigger>
          <ContextMenuContent className="min-w-48" side="bottom" align="end">
          <ContextMenuRadioGroup
            value={dock}
            onValueChange={(value) => {
              if (value === "bottom" || value === "right") {
                window.setTimeout(() => onDockChange(value), 200);
              }
            }}
          >
              <ContextMenuRadioItem value="bottom">
                <PanelBottom />
                Display at bottom
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="right">
                <PanelRight />
                Display on the right
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        title
      )}
      {controls}
    </div>
  );
}

function DetailsDockControl({
  dock,
  onDockChange,
}: {
  dock: DetailsDock;
  onDockChange: (dock: DetailsDock) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex shrink-0 items-center self-stretch pr-1 pl-0.5">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Details layout"
              className="text-muted-foreground"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuRadioGroup
            value={dock}
            onValueChange={(value) => {
              if (value === "bottom" || value === "right") {
                setMenuOpen(false);
                window.setTimeout(() => onDockChange(value), 200);
              }
            }}
          >
            <DropdownMenuRadioItem value="bottom">
              <PanelBottom />
              Display at bottom
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="right">
              <PanelRight />
              Display on the right
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function StatusGrid({ torrent }: { torrent: TorrentStatus }) {
  const wrapRows = new Set(["Tracker", "Tracker status", "Download folder", "Message", "Comment", "Creator"]);
  const rows: [string, React.ReactNode][] = [
    ["Name", torrent.name],
    ["State", <StateBadge key="s" state={torrent.state} message={torrent.message} />],
    ["Size", `${formatBytes(torrent.total_done)} / ${formatBytes(torrent.total_wanted)}`],
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
    <div className="grid min-w-0 gap-3">
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="tabular shrink-0 text-sm">{formatProgress(torrent.progress)}</span>
        </div>
        <div className="h-1.5 min-w-0 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", stateBarClass(torrent.state))}
            style={{ width: `${Math.min(100, Math.max(0, torrent.progress))}%` }}
          />
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm @min-[360px]:grid-cols-2">
          <TransferStat label="Downloaded" value={formatBytes(torrent.total_payload_download)} />
          <TransferStat label="Uploaded" value={formatBytes(torrent.total_payload_upload)} />
          <TransferStat label="Download speed" value={formatRate(torrent.download_payload_rate)} />
          <TransferStat label="Upload speed" value={formatRate(torrent.upload_payload_rate)} />
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm @min-[360px]:grid-cols-2 @min-[640px]:grid-cols-3">
        {rows.map(([k, v]) => {
          const text = typeof v === "string" ? v : undefined;
          return (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd
                className={cn("min-w-0", wrapRows.has(k) ? "break-all" : "truncate")}
                title={text}
              >
                {v}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function TransferStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate tabular" title={value}>
        {value}
      </span>
    </div>
  );
}

function PeerTable({ peers }: { peers: TorrentPeer[] }) {
  if (!peers.length) return <Muted>No connected peers.</Muted>;
  return (
    <div className="min-w-0">
      <ul className="grid gap-2 @min-[520px]:hidden">
        {peers.map((p, i) => (
          <li
            key={`${p.ip}-${i}`}
            className="min-w-0 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 dark:bg-muted/25"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <PeerCountry country={p.country} />
              <span className="min-w-0 flex-1 truncate font-mono text-xs" title={p.ip}>
                {p.ip}
              </span>
              {p.seed ? <span className="shrink-0 text-[11px] text-muted-foreground">Seed</span> : null}
            </div>
            <div className="mt-0.5 min-w-0 truncate text-xs text-muted-foreground" title={p.client}>
              {p.client}
            </div>
            <div className="mt-0.5 flex min-w-0 flex-wrap gap-x-3 text-xs tabular">
              <span>{formatProgress(p.progress * 100)}</span>
              <span>↓ {formatRate(p.down_speed)}</span>
              <span>↑ {formatRate(p.up_speed)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden min-w-0 overflow-x-auto @min-[520px]:block">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-2 font-medium">IP</th>
              <th className="py-1 pr-2 font-medium">Client</th>
              <th className="py-1 pr-2 font-medium">Country</th>
              <th className="py-1 pr-2 font-medium">Progress</th>
              <th className="py-1 pr-2 font-medium">Down</th>
              <th className="py-1 pr-2 font-medium">Up</th>
              <th className="hidden py-1 font-medium @min-[640px]:table-cell">Seed</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p, i) => (
              <tr key={`${p.ip}-${i}`} className="border-t">
                <td className="max-w-[9rem] truncate py-1 pr-2 font-mono text-xs" title={p.ip}>
                  {p.ip}
                </td>
                <td className="max-w-[10rem] truncate py-1 pr-2" title={p.client}>
                  {p.client}
                </td>
                <td className="py-1 pr-2">
                  <PeerCountry country={p.country} />
                </td>
                <td className="py-1 pr-2 tabular">{formatProgress(p.progress * 100)}</td>
                <td className="py-1 pr-2 tabular">{formatRate(p.down_speed)}</td>
                <td className="py-1 pr-2 tabular">{formatRate(p.up_speed)}</td>
                <td className="hidden py-1 @min-[640px]:table-cell">{p.seed ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
    <div className="grid min-w-0 gap-3">
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-12" />
          </colgroup>
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-2 font-medium">URL</th>
              <th className="py-1 font-medium">Tier</th>
            </tr>
          </thead>
          <tbody>
            {trackers.map((t) => (
              <tr key={t.url} className="border-t">
                <td className="min-w-0 truncate py-1 pr-2 font-mono text-xs" title={t.url}>
                  {t.url}
                </td>
                <td className="py-1 tabular">{t.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex min-w-0 flex-col gap-2 @min-[400px]:flex-row">
        <Input
          className="min-w-0 w-full"
          placeholder="udp://tracker.example:6969/announce"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          variant="outline"
          className="shrink-0 @min-[400px]:self-auto"
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
