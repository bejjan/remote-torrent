"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileKindIcon, FolderTreeIcon } from "@/components/app/file-tree-icons";
import { FilePrioritySelect } from "@/components/app/file-priority-select";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { DelugeError, getStoredClientKind, rpc, uploadTorrent } from "@/lib/deluge/client";
import { formatBytes } from "@/lib/deluge/format";
import {
  commonPriority,
  compactFilePriorities,
  infoFileIndexes,
  infoTreeSize,
  initialFilePriorities,
  isMagnetUri,
  normalizeFilesTree,
  setPrioritiesForIndexes,
  type TorrentFileInfo,
  type TorrentInfoDir,
  type TorrentInfoNode,
} from "@/lib/deluge/files-tree";
import type { AddTorrentOptions } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

const ADD_CONFIG_KEYS = [
  "add_paused",
  "download_location",
  "move_completed",
  "move_completed_path",
  "prioritize_first_last_pieces",
  "sequential_download",
  "max_download_speed_per_torrent",
  "max_upload_speed_per_torrent",
] as const;

type AddTab = "file" | "magnet" | "url";

interface TorrentPreview {
  path: string;
  name: string;
  infoHash: string;
  tree: TorrentInfoDir | null;
}

function errMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function torrentFileFromList(files: FileList | null): File | null {
  if (!files?.length) return null;
  const listed = Array.from(files);
  return (
    listed.find(
      (item) =>
        item.name.toLowerCase().endsWith(".torrent") || item.type === "application/x-bittorrent"
    ) ??
    listed[0] ??
    null
  );
}

export function AddTorrentDialog({
  open,
  onOpenChange,
  defaultPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPath: string;
}) {
  const [tab, setTab] = useState<AddTab>("file");
  const [file, setFile] = useState<File | null>(null);
  const [magnet, setMagnet] = useState("");
  const [url, setUrl] = useState("");
  const [downloadLocation, setDownloadLocation] = useState(defaultPath);
  const [moveCompleted, setMoveCompleted] = useState(false);
  const [moveCompletedPath, setMoveCompletedPath] = useState("");
  const [addPaused, setAddPaused] = useState(false);
  const [sequential, setSequential] = useState(false);
  const [firstLast, setFirstLast] = useState(false);
  const [maxDown, setMaxDown] = useState("-1");
  const [maxUp, setMaxUp] = useState("-1");
  const [preview, setPreview] = useState<TorrentPreview | null>(null);
  const [priorities, setPriorities] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadGen = useRef(0);
  const transmission = getStoredClientKind() === "transmission";

  useEffect(() => {
    if (!open) {
      loadGen.current += 1;
      return;
    }
    const gen = ++loadGen.current;
    setTab("file");
    setFile(null);
    setFileDragOver(false);
    setAdvancedOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMagnet("");
    setUrl("");
    setPreview(null);
    setPriorities([]);
    setError(null);
    setBusy(false);
    setLoadingInfo(false);
    setDownloadLocation(defaultPath);
    let cancelled = false;
    void (async () => {
      try {
        const cfg = await rpc<Record<string, unknown>>("core.get_config_values", [
          [...ADD_CONFIG_KEYS],
        ]);
        if (cancelled || gen !== loadGen.current) return;
        if (typeof cfg.download_location === "string" && cfg.download_location) {
          setDownloadLocation(cfg.download_location);
        } else if (defaultPath) {
          setDownloadLocation(defaultPath);
        }
        setMoveCompleted(Boolean(cfg.move_completed));
        setMoveCompletedPath(
          typeof cfg.move_completed_path === "string" ? cfg.move_completed_path : ""
        );
        setAddPaused(Boolean(cfg.add_paused));
        setSequential(Boolean(cfg.sequential_download));
        setFirstLast(Boolean(cfg.prioritize_first_last_pieces));
        if (typeof cfg.max_download_speed_per_torrent === "number") {
          setMaxDown(String(cfg.max_download_speed_per_torrent));
        }
        if (typeof cfg.max_upload_speed_per_torrent === "number") {
          setMaxUp(String(cfg.max_upload_speed_per_torrent));
        }
      } catch {
        if (!cancelled && defaultPath) setDownloadLocation(defaultPath);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, defaultPath]);

  function applyInfo(path: string, info: TorrentFileInfo | false | null | Record<string, unknown>) {
    if (!info || typeof info !== "object" || !("info_hash" in info) || !info.info_hash) {
      throw new DelugeError("Not a valid torrent");
    }
    const typed = info as TorrentFileInfo;
    const tree = normalizeFilesTree(typed.files_tree);
    setPreview({
      path,
      name: typed.name || path.split("/").pop() || "Torrent",
      infoHash: String(typed.info_hash),
      tree,
    });
    setPriorities(initialFilePriorities(tree));
  }

  async function onPickFile(next: File | null) {
    const gen = ++loadGen.current;
    setFile(next);
    setPreview(null);
    setPriorities([]);
    setError(null);
    if (!next) return;
    setLoadingInfo(true);
    try {
      const path = await uploadTorrent(next);
      const info = await rpc<TorrentFileInfo | false>("web.get_torrent_info", [path]);
      if (gen !== loadGen.current) return;
      applyInfo(path, info);
    } catch (err) {
      if (gen !== loadGen.current) return;
      setPreview(null);
      setError(errMessage(err, "Failed to upload torrent"));
    } finally {
      if (gen === loadGen.current) setLoadingInfo(false);
    }
  }

  async function loadMagnetInfo(uri: string) {
    const trimmed = uri.trim();
    const gen = ++loadGen.current;
    setError(null);
    setPreview(null);
    setPriorities([]);
    if (!trimmed) return;
    if (!isMagnetUri(trimmed)) {
      setError("Paste a magnet URI starting with magnet:?xt=urn:btih:");
      return;
    }
    setLoadingInfo(true);
    try {
      const info = await rpc<TorrentFileInfo | Record<string, never>>("web.get_magnet_info", [
        trimmed,
      ]);
      if (gen !== loadGen.current) return;
      if (!info || typeof info !== "object" || !("info_hash" in info) || !info.info_hash) {
        throw new DelugeError("Invalid magnet URI");
      }
      setPreview({
        path: trimmed,
        name: info.name || "Magnet download",
        infoHash: String(info.info_hash),
        tree: normalizeFilesTree(info.files_tree),
      });
      setPriorities([]);
    } catch (err) {
      if (gen !== loadGen.current) return;
      setError(errMessage(err, "Failed to parse magnet URI"));
    } finally {
      if (gen === loadGen.current) setLoadingInfo(false);
    }
  }

  async function loadUrlInfo(source: string): Promise<TorrentPreview> {
    const trimmed = source.trim();
    const gen = loadGen.current;
    if (!trimmed) throw new DelugeError("Paste an HTTP(S) URL to a .torrent file");
    if (isMagnetUri(trimmed)) {
      throw new DelugeError("Use the Magnet tab for magnet URIs");
    }
    const path = await rpc<string>("web.download_torrent_from_url", [trimmed]);
    if (gen !== loadGen.current) throw new DelugeError("Cancelled");
    if (!path) throw new DelugeError("Failed to download torrent from URL");
    const info = await rpc<TorrentFileInfo | false>("web.get_torrent_info", [path]);
    if (gen !== loadGen.current) throw new DelugeError("Cancelled");
    if (!info || typeof info !== "object" || !info.info_hash) {
      throw new DelugeError("Not a valid torrent");
    }
    const tree = normalizeFilesTree(info.files_tree);
    const next: TorrentPreview = {
      path,
      name: info.name || trimmed.split("/").pop() || "Torrent",
      infoHash: String(info.info_hash),
      tree,
    };
    setPreview(next);
    setPriorities(initialFilePriorities(tree));
    return next;
  }

  async function fetchUrl() {
    const gen = ++loadGen.current;
    setError(null);
    setLoadingInfo(true);
    try {
      await loadUrlInfo(url);
      if (gen !== loadGen.current) return;
    } catch (err) {
      if (gen !== loadGen.current) return;
      setPreview(null);
      setError(errMessage(err, "Failed to download torrent from URL"));
    } finally {
      if (gen === loadGen.current) setLoadingInfo(false);
    }
  }

  function optionsFromForm(): AddTorrentOptions {
    const down = Number(maxDown);
    const up = Number(maxUp);
    return {
      download_location: downloadLocation,
      move_completed: moveCompleted,
      move_completed_path: moveCompleted ? moveCompletedPath : undefined,
      add_paused: addPaused,
      sequential_download: sequential,
      prioritize_first_last_pieces: firstLast,
      max_download_speed: Number.isFinite(down) ? down : -1,
      max_upload_speed: Number.isFinite(up) ? up : -1,
      file_priorities: compactFilePriorities(priorities),
    };
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const options = optionsFromForm();
    try {
      if (tab === "file") {
        if (!file) throw new DelugeError("Choose a .torrent file");
        if (!preview) throw new DelugeError("Wait for the torrent contents to load, or pick the file again");
        await rpc("web.add_torrents", [[{ path: preview.path, options }]]);
      } else if (tab === "magnet") {
        const lines = magnet
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (!lines.length) throw new DelugeError("Paste a magnet URI");
        for (const line of lines) {
          if (!isMagnetUri(line)) {
            throw new DelugeError("Invalid magnet URI");
          }
          await rpc("core.add_torrent_magnet", [line, options]);
        }
      } else {
        const ready = preview ?? (await loadUrlInfo(url));
        await rpc("web.add_torrents", [[{ path: ready.path, options }]]);
      }
      toast.success("Torrent added");
      onOpenChange(false);
    } catch (err) {
      const message = errMessage(err, "Failed to add torrent");
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  const canAdd =
    !busy &&
    !loadingInfo &&
    (tab === "file" ? Boolean(preview) : tab === "magnet" ? magnet.trim().length > 0 : url.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-w-0 max-w-[calc(100%-2rem)] grid-cols-1 overflow-x-hidden overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add torrent</DialogTitle>
        </DialogHeader>
        <Tabs
          className="min-w-0"
          value={tab}
          onValueChange={(value) => {
            setTab(value as AddTab);
            setError(null);
            if (value !== tab) {
              loadGen.current += 1;
              setPreview(null);
              setPriorities([]);
              setLoadingInfo(false);
            }
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="file">File</TabsTrigger>
            <TabsTrigger value="magnet">Magnet</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>
          <div className="min-h-28">
            <TabsContent value="file" className="grid min-h-28 min-w-0 gap-3 pt-3">
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setFileDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setFileDragOver(true);
              }}
              onDragLeave={(e) => {
                const next = e.relatedTarget;
                if (next instanceof Node && e.currentTarget.contains(next)) return;
                setFileDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setFileDragOver(false);
                const next = torrentFileFromList(e.dataTransfer.files);
                if (!next) return;
                if (fileInputRef.current) fileInputRef.current.value = "";
                void onPickFile(next);
              }}
              className={cn(
                "grid min-h-24 min-w-0 content-center gap-2 overflow-hidden rounded-lg border border-dashed p-3 transition-colors",
                fileDragOver
                  ? "border-foreground/35 bg-muted/70 dark:bg-input/50"
                  : "border-input bg-muted/25 dark:bg-input/20"
              )}
            >
              <input
                ref={fileInputRef}
                id="add-torrent-file"
                type="file"
                accept=".torrent,application/x-bittorrent"
                className="hidden"
                tabIndex={-1}
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex min-w-0 items-center gap-x-3 gap-y-1.5">
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  aria-describedby="add-torrent-file-name"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload />
                  Choose torrent file
                </Button>
                <p
                  id="add-torrent-file-name"
                  className="min-w-0 flex-1 truncate overflow-hidden text-sm text-muted-foreground"
                  title={file ? file.name : undefined}
                >
                  {file ? `${file.name} · ${formatBytes(file.size)}` : "No file chosen"}
                </p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="magnet" className="grid min-h-28 gap-3 pt-3">
            <Textarea
              rows={4}
              className="h-24 min-h-24 field-sizing-fixed"
              placeholder="magnet:?xt=urn:btih:…"
              value={magnet}
              onChange={(e) => setMagnet(e.target.value)}
              onBlur={() => {
                const first = magnet.split(/\n+/).map((s) => s.trim()).find(Boolean);
                if (first) void loadMagnetInfo(first);
              }}
            />
          </TabsContent>
          <TabsContent value="url" className="grid min-h-28 min-w-0 gap-3 pt-3">
            <div className="flex min-h-24 min-w-0 items-center gap-2">
              <Input
                placeholder="https://example.com/file.torrent"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void fetchUrl();
                  }
                }}
              />
              <Button type="button" variant="outline" disabled={loadingInfo || !url.trim()} onClick={() => void fetchUrl()}>
                Load
              </Button>
            </div>
          </TabsContent>
          </div>
        </Tabs>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <TorrentPreviewCard
          preview={preview}
          priorities={priorities}
          onPriorities={setPriorities}
          loading={loadingInfo}
          loadingLabel={
            tab === "file"
              ? "Uploading and reading torrent…"
              : tab === "url"
                ? "Downloading torrent…"
                : "Reading magnet…"
          }
        />
        <div className="grid min-w-0 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="add-download-location">Download location</Label>
            <Input
              id="add-download-location"
              value={downloadLocation}
              onChange={(e) => setDownloadLocation(e.target.value)}
            />
          </div>
          <div className="rounded-md border border-border bg-muted/40">
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              {advancedOpen ? (
                <ChevronDown className="size-3.5 shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0" />
              )}
              Advanced settings
            </button>
            {advancedOpen ? (
              <div className="grid gap-x-3 gap-y-2 border-t border-border px-2.5 py-2 sm:grid-cols-2 sm:items-center">
                {transmission ? null : (
                  <>
                    <label className="flex min-h-7 items-center gap-2 text-sm leading-snug">
                      <Switch size="sm" checked={moveCompleted} onCheckedChange={setMoveCompleted} />
                      Move completed
                    </label>
                    <Input
                      id="add-move-completed"
                      aria-label="Move completed path"
                      placeholder="Move completed path"
                      value={moveCompletedPath}
                      disabled={!moveCompleted}
                      onChange={(e) => setMoveCompletedPath(e.target.value)}
                      className="h-7"
                    />
                  </>
                )}
                <label className="flex min-h-7 items-center gap-2 text-sm leading-snug">
                  <Switch size="sm" checked={addPaused} onCheckedChange={setAddPaused} />
                  Add in paused state
                </label>
                {transmission ? null : (
                  <>
                    <label className="flex min-h-7 items-center gap-2 text-sm leading-snug">
                      <Switch size="sm" checked={sequential} onCheckedChange={setSequential} />
                      Sequential download
                    </label>
                    <label className="flex min-h-7 items-center gap-2 text-sm leading-snug sm:col-span-2">
                      <Switch size="sm" checked={firstLast} onCheckedChange={setFirstLast} />
                      Prioritize first and last pieces
                    </label>
                  </>
                )}
                <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                  <Label htmlFor="add-max-down" className="text-sm font-normal leading-snug">
                    Max download
                  </Label>
                  <Input
                    id="add-max-down"
                    value={maxDown}
                    aria-describedby="add-speed-hint"
                    onChange={(e) => setMaxDown(e.target.value)}
                    className="h-7"
                  />
                </div>
                <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                  <Label htmlFor="add-max-up" className="text-sm font-normal leading-snug">
                    Max upload
                  </Label>
                  <Input
                    id="add-max-up"
                    value={maxUp}
                    aria-describedby="add-speed-hint"
                    onChange={(e) => setMaxUp(e.target.value)}
                    className="h-7"
                  />
                </div>
                <p id="add-speed-hint" className="text-[11px] leading-none text-muted-foreground sm:col-span-2">
                  KiB/s, −1 unlimited
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canAdd} onClick={() => void submit()}>
            {busy ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TorrentPreviewCard({
  preview,
  priorities,
  onPriorities,
  loading,
  loadingLabel,
}: {
  preview: TorrentPreview | null;
  priorities: number[];
  onPriorities: (next: number[]) => void;
  loading: boolean;
  loadingLabel: string;
}) {
  const fileCount = preview?.tree ? infoFileIndexes(preview.tree).length : 0;
  const tree = preview?.tree ?? null;
  const emptyTree = !loading && !tree;
  return (
    <div className="grid min-w-0 gap-2 overflow-hidden rounded-lg border p-3">
      <div className="grid min-w-0 gap-1 overflow-hidden">
        <p className="min-w-0 truncate overflow-hidden font-medium" title={preview?.name}>
          {preview?.name || "\u00a0"}
        </p>
        <p
          className="min-w-0 truncate overflow-hidden break-all font-mono text-xs text-muted-foreground"
          title={preview?.infoHash}
        >
          {preview?.infoHash || "\u00a0"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {tree
            ? `${fileCount} file${fileCount === 1 ? "" : "s"} · ${formatBytes(infoTreeSize(tree))}`
            : preview
              ? "File list is available after metadata is downloaded."
              : "\u00a0"}
        </p>
      </div>
      <div
        className={cn(
          "min-h-56 max-h-56 min-w-0 overflow-auto rounded-md border bg-muted/30 px-2 py-1",
          (loading || emptyTree) && "flex items-center justify-center"
        )}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {loadingLabel}
          </div>
        ) : tree ? (
          Object.entries(tree.contents).map(([childName, child]) => (
            <AddFilesTree
              key={childName}
              name={childName}
              node={child}
              path={childName}
              depth={0}
              priorities={priorities}
              onPriorities={onPriorities}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">File list will appear here</p>
        )}
      </div>
    </div>
  );
}

function AddFilesTree({
  name,
  node,
  path,
  depth,
  priorities,
  onPriorities,
}: {
  name: string;
  node: TorrentInfoNode;
  path: string;
  depth: number;
  priorities: number[];
  onPriorities: (next: number[]) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  if (node.type === "file") {
    const value = String(priorities[node.index] ?? 4);
    return (
      <div className="flex min-w-0 items-center gap-2 py-1 text-sm">
        <span className="inline-block size-6 shrink-0" aria-hidden />
        <FileKindIcon name={name} />
        <span className="min-w-0 flex-1 truncate overflow-hidden break-all" title={path}>
          {name}
        </span>
        <span className="tabular w-20 shrink-0 text-right text-muted-foreground">{formatBytes(node.length)}</span>
        <FilePrioritySelect
          className="w-36 shrink-0"
          value={value}
          onChange={(next) => onPriorities(setPrioritiesForIndexes(priorities, [node.index], next))}
        />
      </div>
    );
  }
  const indexes = infoFileIndexes(node);
  const shared = commonPriority(priorities, indexes);
  return (
    <div className="min-w-0 text-sm">
      <div className="flex min-w-0 items-center gap-2 py-1">
        <button
          type="button"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <FolderTreeIcon open={open} />
        <span className="min-w-0 flex-1 truncate overflow-hidden break-all font-medium" title={path}>
          {name}
        </span>
        <span className="tabular w-20 shrink-0 text-right text-muted-foreground">{formatBytes(infoTreeSize(node))}</span>
        <FilePrioritySelect
          className="w-36 shrink-0"
          value={shared == null ? "mixed" : String(shared)}
          mixed={shared == null}
          onChange={(next) => onPriorities(setPrioritiesForIndexes(priorities, indexes, next))}
        />
      </div>
      <div className={cn(open ? "ml-3 min-w-0 overflow-hidden border-l pl-3" : "hidden")}>
        {Object.entries(node.contents).map(([childName, child]) => (
          <AddFilesTree
            key={childName}
            name={childName}
            node={child}
            path={`${path}/${childName}`}
            depth={depth + 1}
            priorities={priorities}
            onPriorities={onPriorities}
          />
        ))}
      </div>
    </div>
  );
}

export function RemoveTorrentDialog({
  open,
  onOpenChange,
  ids,
  onRemoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  onRemoved: () => void;
}) {
  const [removeData, setRemoveData] = useState(false);

  useEffect(() => {
    if (open) setRemoveData(false);
  }, [open]);

  async function confirm() {
    try {
      if (ids.length === 1) {
        await rpc("core.remove_torrent", [ids[0], removeData]);
      } else {
        await rpc("core.remove_torrents", [ids, removeData]);
      }
      toast.success(ids.length > 1 ? "Torrents removed" : "Torrent removed");
      onRemoved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {ids.length} torrent{ids.length === 1 ? "" : "s"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes the torrent from Deluge. Downloaded files stay unless you choose to delete
            them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={removeData} onCheckedChange={(v) => setRemoveData(v === true)} />
          Also delete downloaded files
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void confirm()}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MoveTorrentDialog({
  open,
  onOpenChange,
  ids,
  currentPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  currentPath: string;
}) {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    if (open) setPath(currentPath);
  }, [open, currentPath]);

  async function submit() {
    try {
      await rpc("core.move_storage", [ids, path]);
      toast.success("Moving storage");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Move failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move storage</DialogTitle>
          <DialogDescription>New download location for the selected torrents.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>Path</Label>
          <Input value={path} onChange={(e) => setPath(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
