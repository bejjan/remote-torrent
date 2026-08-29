"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  FolderOpen,
  HardDrive,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DEMO_FILES,
  DEMO_STATS,
  DEMO_TORRENTS,
  matchesFilter,
} from "@/lib/deluge/demo";
import {
  formatBytes,
  formatEta,
  formatProgress,
  formatRate,
  formatRatio,
} from "@/lib/deluge/format";
import { STATE_FILTERS } from "@/lib/deluge/keys";
import type { TorrentState, TorrentStatus } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

const STATE_TONE: Record<TorrentState, string> = {
  Downloading: "text-sky-400",
  Seeding: "text-emerald-400",
  Paused: "text-zinc-400",
  Checking: "text-amber-400",
  Queued: "text-violet-400",
  Error: "text-red-400",
  Allocating: "text-zinc-400",
  Moving: "text-amber-400",
};

const BAR_TONE: Record<TorrentState, string> = {
  Downloading: "bg-sky-400",
  Seeding: "bg-emerald-400",
  Paused: "bg-zinc-500",
  Checking: "bg-amber-400",
  Queued: "bg-violet-400",
  Error: "bg-red-400",
  Allocating: "bg-zinc-500",
  Moving: "bg-amber-400",
};

function ProgressBar({
  value,
  state,
}: {
  value: number;
  state: TorrentState;
}) {
  return (
    <div className="flex min-w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", BAR_TONE[state])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {formatProgress(value)}
      </span>
    </div>
  );
}

export function TorrentDashboard() {
  const searchParams = useSearchParams();
  const shot = searchParams.get("shot");
  const [filter, setFilter] = useState<(typeof STATE_FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (shot === "details") {
      const firstId = Object.keys(DEMO_TORRENTS)[0];
      if (firstId) setDetailId(firstId);
    } else if (shot === "add") {
      setAddOpen(true);
    }
  }, [shot]);

  const entries = useMemo(() => Object.entries(DEMO_TORRENTS), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(([, t]) => {
      if (!matchesFilter(t.state, filter)) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.label?.toLowerCase().includes(q) ||
        t.tracker_host.toLowerCase().includes(q)
      );
    });
  }, [entries, filter, query]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(STATE_FILTERS.map((f) => [f, 0])) as Record<
      string,
      number
    >;
    for (const [, t] of entries) {
      map.All += 1;
      map[t.state] = (map[t.state] ?? 0) + 1;
      if (matchesFilter(t.state, "Active")) map.Active += 1;
    }
    return map;
  }, [entries]);

  const labels = useMemo(() => {
    const map = new Map<string, number>();
    for (const [, t] of entries) {
      if (!t.label) continue;
      map.set(t.label, (map.get(t.label) ?? 0) + 1);
    }
    return [...map.entries()];
  }, [entries]);

  const detail = detailId ? DEMO_TORRENTS[detailId] : null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(([id]) => id)));
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <div className="flex items-center gap-2 pr-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Waves className="size-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Nova</span>
        </div>
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search torrents, labels, trackers…"
            className="pl-8"
            aria-label="Search torrents"
          />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Pause selected">
            <Pause />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Resume selected">
            <Play />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Remove selected">
            <Trash2 />
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Add torrent
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-52 shrink-0 flex-col gap-5 border-r p-3">
          <nav className="flex flex-col gap-0.5">
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              State
            </p>
            {STATE_FILTERS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setFilter(name)}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors",
                  filter === name
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {name}
                <span className="tabular-nums text-xs opacity-70">
                  {counts[name] ?? 0}
                </span>
              </button>
            ))}
          </nav>
          <nav className="flex flex-col gap-0.5">
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Labels
            </p>
            {labels.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setQuery(name)}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {name}
                <span className="tabular-nums text-xs opacity-70">{count}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur-sm">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="w-8 px-3 py-2 font-medium">
                  <Checkbox
                    checked={
                      filtered.length > 0 && selected.size === filtered.length
                    }
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Size</th>
                <th className="px-2 py-2 font-medium">Progress</th>
                <th className="px-2 py-2 font-medium">Down</th>
                <th className="px-2 py-2 font-medium">Up</th>
                <th className="px-2 py-2 font-medium">ETA</th>
                <th className="px-2 py-2 font-medium">Ratio</th>
                <th className="px-2 py-2 font-medium">Seeds</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(([id, torrent]) => (
                <tr
                  key={id}
                  onClick={() => setDetailId(id)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 hover:bg-muted/40",
                    selected.has(id) && "bg-muted/50",
                    detailId === id && "bg-muted/40"
                  )}
                >
                  <td
                    className="px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selected.has(id)}
                      onCheckedChange={() => toggle(id)}
                      aria-label={`Select ${torrent.name}`}
                    />
                  </td>
                  <td className="max-w-xs px-2 py-2">
                    <div className="truncate font-medium">{torrent.name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={STATE_TONE[torrent.state]}>
                        {torrent.state}
                      </span>
                      {torrent.label && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          {torrent.label}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">
                    {formatBytes(torrent.total_wanted)}
                  </td>
                  <td className="px-2 py-2">
                    <ProgressBar value={torrent.progress} state={torrent.state} />
                  </td>
                  <td className="px-2 py-2 tabular-nums text-sky-400">
                    {torrent.download_payload_rate > 0
                      ? formatRate(torrent.download_payload_rate)
                      : "—"}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-emerald-400">
                    {torrent.upload_payload_rate > 0
                      ? formatRate(torrent.upload_payload_rate)
                      : "—"}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">
                    {formatEta(torrent.eta)}
                  </td>
                  <td className="px-2 py-2 tabular-nums">
                    {formatRatio(torrent.ratio)}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">
                    {torrent.num_seeds} <span className="opacity-50">/</span>{" "}
                    {torrent.total_seeds}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-4 border-t px-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 text-sky-400">
          <ArrowDown className="size-3" />
          {formatRate(DEMO_STATS.download_rate)}
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <ArrowUp className="size-3" />
          {formatRate(DEMO_STATS.upload_rate)}
        </span>
        <span>{entries.length} torrents</span>
        <span>{DEMO_STATS.num_connections} connections</span>
        <span>DHT {DEMO_STATS.dht_nodes}</span>
        <span className="ml-auto flex items-center gap-1">
          <HardDrive className="size-3" />
          {formatBytes(DEMO_STATS.free_space)} free
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Connected
        </span>
      </footer>

      <Sheet open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent side="right" className="sm:max-w-md">
          {detail && detailId && (
            <TorrentDetails id={detailId} torrent={detail} />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add torrent</DialogTitle>
            <DialogDescription>
              Paste a magnet link or drop a .torrent file. It is added to your
              Deluge daemon.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="magnet">Magnet or URL</Label>
              <Textarea
                id="magnet"
                placeholder="magnet:?xt=urn:btih:…"
                className="min-h-20 font-mono text-xs"
              />
            </div>
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-sm text-muted-foreground">
              <FolderOpen className="size-5" />
              Drop a .torrent file here
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Download location</Label>
              <Input id="location" defaultValue="/data/downloads" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setAddOpen(false)}>Add to queue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TorrentDetails({
  id,
  torrent,
}: {
  id: string;
  torrent: TorrentStatus;
}) {
  const files = DEMO_FILES[id] ?? [torrent.name];
  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-8 leading-snug">{torrent.name}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <span className={STATE_TONE[torrent.state]}>{torrent.state}</span>
          {torrent.message && (
            <span className="inline-flex items-center gap-1 text-red-400">
              <CircleAlert className="size-3" />
              {torrent.message}
            </span>
          )}
        </SheetDescription>
      </SheetHeader>
      <div className="px-4">
        <ProgressBar value={torrent.progress} state={torrent.state} />
      </div>
      <Tabs defaultValue="info" className="min-h-0 flex-1 px-4">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="peers">Peers</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="flex flex-col gap-3 py-3">
          <DetailRow label="Size" value={formatBytes(torrent.total_wanted)} />
          <DetailRow label="Downloaded" value={formatBytes(torrent.total_done)} />
          <DetailRow
            label="Uploaded"
            value={formatBytes(torrent.total_uploaded)}
          />
          <DetailRow label="Ratio" value={formatRatio(torrent.ratio)} />
          <DetailRow label="ETA" value={formatEta(torrent.eta)} />
          <DetailRow label="Tracker" value={torrent.tracker_host} />
          <DetailRow label="Save path" value={torrent.download_location} />
          <DetailRow label="Label" value={torrent.label ?? "—"} />
        </TabsContent>
        <TabsContent value="files" className="py-3">
          <ul className="flex flex-col gap-2">
            {files.map((file) => (
              <li
                key={file}
                className="rounded-lg border px-3 py-2 text-xs leading-relaxed"
              >
                {file}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="peers" className="py-3 text-sm text-muted-foreground">
          {torrent.num_peers} connected · {torrent.total_peers} in swarm
        </TabsContent>
      </Tabs>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right tabular-nums">{value}</span>
    </div>
  );
}
