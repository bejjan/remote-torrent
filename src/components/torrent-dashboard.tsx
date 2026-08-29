"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  FolderOpen,
  HardDrive,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  Waves,
} from "lucide-react";
import { toast } from "sonner";

import { ConnectScreen } from "@/components/connect-screen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  addMagnet,
  addTorrentUrl,
  addUploadedTorrents,
  checkSession,
  connectToDaemon,
  deleteSession,
  DelugeError,
  getDownloadLocation,
  getStoredWebUrl,
  getTorrentFiles,
  isAuthError,
  pauseTorrents,
  removeTorrents,
  resumeTorrents,
  updateUi,
  uploadTorrent,
} from "@/lib/deluge/client";
import {
  formatBytes,
  formatEta,
  formatProgress,
  formatRate,
  formatRatio,
} from "@/lib/deluge/format";
import { STATE_FILTERS, STATUS_KEYS } from "@/lib/deluge/keys";
import type {
  FileDir,
  FileLeaf,
  FileNode,
  SessionStats,
  TorrentState,
  TorrentStatus,
} from "@/lib/deluge/types";
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

type Phase = "boot" | "login" | "app";

function matchesFilter(state: TorrentState, filter: string): boolean {
  if (filter === "All") return true;
  if (filter === "Active") {
    return (
      state === "Downloading" || state === "Seeding" || state === "Checking"
    );
  }
  return state === filter;
}

function stateClass(state: string) {
  return STATE_TONE[state as TorrentState] ?? "text-zinc-400";
}

function barClass(state: string) {
  return BAR_TONE[state as TorrentState] ?? "bg-zinc-500";
}

function actionError(error: unknown, fallback: string) {
  return error instanceof DelugeError ? error.message : fallback;
}

function flattenFiles(
  node: FileNode,
  prefix = ""
): { name: string; size: number; progress: number }[] {
  if (node.type === "dir" || ("contents" in node && node.contents)) {
    const dir = node as FileDir;
    return Object.entries(dir.contents).flatMap(([name, child]) =>
      flattenFiles(child, prefix ? `${prefix}/${name}` : name)
    );
  }
  const file = node as FileLeaf;
  const progress = file.progress <= 1 ? file.progress * 100 : file.progress;
  return [{ name: prefix || "File", size: file.size, progress }];
}

function ProgressBar({
  value,
  state,
}: {
  value: number;
  state: string;
}) {
  return (
    <div className="flex min-w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barClass(state))}
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
  const chromeOnly =
    shot === "empty" || shot === "add" || shot === "disconnected";

  const [phase, setPhase] = useState<Phase>(chromeOnly ? "app" : "boot");
  const [loginError, setLoginError] = useState("");
  const [connected, setConnected] = useState(shot !== "disconnected");
  const [torrents, setTorrents] = useState<Record<string, TorrentStatus>>({});
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof STATE_FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(shot === "add");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeData, setRemoveData] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const chromeOnlyRef = useRef(chromeOnly);
  chromeOnlyRef.current = chromeOnly;

  useEffect(() => {
    if (shot === "add") setAddOpen(true);
  }, [shot]);

  const refresh = useCallback(async () => {
    if (chromeOnlyRef.current) return;
    const ui = await updateUi(STATUS_KEYS);
    setConnected(ui.connected);
    setTorrents(ui.torrents ?? {});
    setStats(ui.stats);
    setPollError(null);
  }, []);

  useEffect(() => {
    if (chromeOnly) return;
    let cancelled = false;
    (async () => {
      if (!getStoredWebUrl()) {
        setPhase("login");
        return;
      }
      try {
        const ok = await checkSession();
        if (cancelled) return;
        if (!ok) {
          setPhase("login");
          return;
        }
        const daemon = await connectToDaemon();
        if (cancelled) return;
        setConnected(daemon);
        setPhase("app");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof DelugeError) setLoginError(error.message);
        setPhase("login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chromeOnly]);

  useEffect(() => {
    if (phase !== "app" || chromeOnly) return;
    let cancelled = false;
    async function tick() {
      try {
        await refresh();
      } catch (error) {
        if (cancelled) return;
        if (isAuthError(error)) {
          setPhase("login");
          return;
        }
        setPollError(actionError(error, "Lost contact with Deluge Web."));
      }
    }
    void tick();
    const id = setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase, chromeOnly, refresh]);

  const entries = useMemo(() => Object.entries(torrents), [torrents]);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => id in torrents));
      return next.size === prev.size ? prev : next;
    });
    if (detailId && !(detailId in torrents)) setDetailId(null);
  }, [torrents, detailId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(([, torrent]) => {
      if (!matchesFilter(torrent.state, filter)) return false;
      if (!q) return true;
      return (
        torrent.name.toLowerCase().includes(q) ||
        torrent.label?.toLowerCase().includes(q) ||
        torrent.tracker_host.toLowerCase().includes(q)
      );
    });
  }, [entries, filter, query]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(STATE_FILTERS.map((name) => [name, 0])) as Record<
      string,
      number
    >;
    for (const [, torrent] of entries) {
      map.All += 1;
      map[torrent.state] = (map[torrent.state] ?? 0) + 1;
      if (matchesFilter(torrent.state, "Active")) map.Active += 1;
    }
    return map;
  }, [entries]);

  const labels = useMemo(() => {
    const map = new Map<string, number>();
    for (const [, torrent] of entries) {
      if (!torrent.label) continue;
      map.set(torrent.label, (map.get(torrent.label) ?? 0) + 1);
    }
    return [...map.entries()];
  }, [entries]);

  const detail = detailId ? torrents[detailId] : null;
  const hasSelection = selected.size > 0;

  async function runAction(task: () => Promise<unknown>, fallback: string) {
    setBusyAction(true);
    try {
      await task();
      await refresh();
    } catch (error) {
      toast.error(actionError(error, fallback));
    } finally {
      setBusyAction(false);
    }
  }

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

  async function onChangeConnection() {
    try {
      await deleteSession();
    } catch {
      // Session cookie may already be gone.
    }
    setPhase("login");
    setLoginError("");
    setTorrents({});
    setStats(null);
    setSelected(new Set());
    setDetailId(null);
  }

  if (phase === "boot") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (phase === "login") {
    return (
      <ConnectScreen
        initialError={loginError}
        onSuccess={(daemonConnected) => {
          setConnected(daemonConnected);
          setLoginError("");
          setPhase("app");
        }}
      />
    );
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search torrents, labels, trackers…"
            className="pl-8"
            aria-label="Search torrents"
          />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Pause selected"
            disabled={!hasSelection || busyAction}
            onClick={() =>
              void runAction(
                () => pauseTorrents([...selected]),
                "Could not pause torrents."
              )
            }
          >
            <Pause />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Resume selected"
            disabled={!hasSelection || busyAction}
            onClick={() =>
              void runAction(
                () => resumeTorrents([...selected]),
                "Could not resume torrents."
              )
            }
          >
            <Play />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove selected"
            disabled={!hasSelection || busyAction}
            onClick={() => setRemoveOpen(true)}
          >
            <Trash2 />
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Add torrent
          </Button>
        </div>
      </header>

      {!connected && (
        <div className="border-b px-3 py-2">
          <Alert>
            <CircleAlert />
            <AlertTitle>Not connected to a daemon</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              Logged in to Deluge Web, but no daemon is attached.
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void runAction(async () => {
                    setConnected(await connectToDaemon());
                  }, "Could not attach to a daemon.")
                }
              >
                Retry
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void onChangeConnection()}>
                Change server
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {pollError && connected && (
        <div className="border-b px-3 py-2">
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Deluge Web unreachable</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              {pollError}
              <Button size="sm" variant="ghost" onClick={() => void onChangeConnection()}>
                Change server
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

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
            {labels.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground">No labels</p>
            ) : (
              labels.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setQuery(name)}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  {name}
                  <span className="tabular-nums text-xs opacity-70">{count}</span>
                </button>
              ))
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <EmptyQueue
              hasTorrents={entries.length > 0}
              connected={connected}
              onAdd={() => setAddOpen(true)}
            />
          ) : (
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
                      onClick={(event) => event.stopPropagation()}
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
                        <span className={stateClass(torrent.state)}>
                          {torrent.state}
                        </span>
                        {torrent.label && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1.5 text-[10px]"
                          >
                            {torrent.label}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 tabular-nums text-muted-foreground">
                      {formatBytes(torrent.total_wanted)}
                    </td>
                    <td className="px-2 py-2">
                      <ProgressBar
                        value={torrent.progress}
                        state={torrent.state}
                      />
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
          )}
        </main>
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-4 border-t px-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 text-sky-400">
          <ArrowDown className="size-3" />
          {stats ? formatRate(stats.download_rate) : "—"}
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <ArrowUp className="size-3" />
          {stats ? formatRate(stats.upload_rate) : "—"}
        </span>
        <span>{entries.length} torrents</span>
        <span>
          {stats ? `${stats.num_connections} connections` : "— connections"}
        </span>
        <span>DHT {stats ? stats.dht_nodes : "—"}</span>
        <span className="ml-auto flex items-center gap-1">
          <HardDrive className="size-3" />
          {stats ? `${formatBytes(stats.free_space)} free` : "— free"}
        </span>
        <button
          type="button"
          onClick={() => void onChangeConnection()}
          className={cn(
            "flex items-center gap-1",
            connected ? "text-emerald-400" : "text-amber-500"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              connected ? "bg-emerald-400" : "bg-amber-500"
            )}
          />
          {connected ? "Connected" : "Disconnected"}
        </button>
      </footer>

      <Sheet open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent side="right" className="sm:max-w-md">
          {detail && detailId && (
            <TorrentDetails id={detailId} torrent={detail} />
          )}
        </SheetContent>
      </Sheet>

      <AddTorrentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => void refresh()}
      />

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {selected.size} torrent{selected.size === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They leave the Deluge queue. Downloaded files stay unless you
              choose to delete them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={removeData}
              onCheckedChange={(value) => setRemoveData(value === true)}
            />
            Also delete downloaded files
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const ids = [...selected];
                const wipe = removeData;
                setRemoveOpen(false);
                setRemoveData(false);
                void runAction(
                  () => removeTorrents(ids, wipe),
                  "Could not remove torrents."
                );
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyQueue({
  hasTorrents,
  connected,
  onAdd,
}: {
  hasTorrents: boolean;
  connected: boolean;
  onAdd: () => void;
}) {
  const title = hasTorrents
    ? "No torrents match this filter"
    : connected
      ? "Queue is empty"
      : "Waiting for a daemon";
  const copy = hasTorrents
    ? "Try another state, label, or search."
    : connected
      ? "Add a magnet or .torrent file to start downloading."
      : "Connect Deluge Web to a daemon to see the live queue.";

  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{copy}</p>
      {connected && !hasTorrents && (
        <Button size="sm" onClick={onAdd}>
          <Plus data-icon="inline-start" />
          Add torrent
        </Button>
      )}
    </div>
  );
}

function AddTorrentDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [magnet, setMagnet] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMagnet("");
    setFile(null);
    setError("");
    void getDownloadLocation()
      .then((path) => setLocation(path ?? ""))
      .catch(() => setLocation(""));
  }, [open]);

  function takeFile(next: File | null) {
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".torrent")) {
      setError("Choose a .torrent file.");
      return;
    }
    setError("");
    setFile(next);
  }

  async function onSubmit() {
    const uri = magnet.trim();
    if (!uri && !file) {
      setError("Paste a magnet, URL, or choose a .torrent file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const options = location.trim()
        ? { download_location: location.trim() }
        : {};
      if (file) {
        const path = await uploadTorrent(file);
        await addUploadedTorrents([path], options);
      } else if (uri.startsWith("magnet:")) {
        await addMagnet(uri, options);
      } else {
        await addTorrentUrl(uri, options);
      }
      onOpenChange(false);
      onAdded();
    } catch (err) {
      setError(actionError(err, "Could not add torrent."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add torrent</DialogTitle>
          <DialogDescription>
            Paste a magnet link or drop a .torrent file. It is added to your
            Deluge daemon.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Could not add torrent</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="magnet">Magnet or URL</Label>
            <Textarea
              id="magnet"
              value={magnet}
              onChange={(event) => setMagnet(event.target.value)}
              placeholder="magnet:?xt=urn:btih:…"
              className="min-h-20 font-mono text-xs"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".torrent,application/x-bittorrent"
            className="hidden"
            onChange={(event) => takeFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              takeFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-sm text-muted-foreground",
              dragging && "border-foreground/40 bg-muted/40"
            )}
          >
            <FolderOpen className="size-5" />
            {file ? file.name : "Drop a .torrent file here"}
          </button>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Download location</Label>
            <Input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Daemon default"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void onSubmit()}>
            {busy && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Add to queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TorrentDetails({
  id,
  torrent,
}: {
  id: string;
  torrent: TorrentStatus;
}) {
  const [files, setFiles] = useState<
    { name: string; size: number; progress: number }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    void getTorrentFiles(id)
      .then((tree) => {
        if (!cancelled) setFiles(flattenFiles(tree));
      })
      .catch(() => {
        if (!cancelled) setFiles([{ name: torrent.name, size: torrent.total_wanted, progress: torrent.progress }]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, torrent.name, torrent.progress, torrent.total_wanted]);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-8 leading-snug">{torrent.name}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <span className={stateClass(torrent.state)}>{torrent.state}</span>
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
          <DetailRow label="Tracker" value={torrent.tracker_host || "—"} />
          <DetailRow label="Save path" value={torrent.download_location || "—"} />
          <DetailRow label="Label" value={torrent.label ?? "—"} />
        </TabsContent>
        <TabsContent value="files" className="py-3">
          <ul className="flex flex-col gap-2">
            {files.map((file) => (
              <li
                key={file.name}
                className="rounded-lg border px-3 py-2 text-xs leading-relaxed"
              >
                <div>{file.name}</div>
                <div className="text-muted-foreground">
                  {formatBytes(file.size)} · {formatProgress(file.progress)}
                </div>
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
