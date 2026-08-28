"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  FolderInput,
  LogOut,
  Menu,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/app/brand";
import { ConnectionManager } from "@/components/app/connection-manager";
import { FilterSidebar, type SidebarFilters } from "@/components/app/filter-sidebar";
import { PreferencesDialog } from "@/components/app/preferences-dialog";
import { StateBadge, stateBarClass } from "@/components/app/state-badge";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { TorrentDetails } from "@/components/app/torrent-details";
import {
  AddTorrentDialog,
  MoveTorrentDialog,
  RemoveTorrentDialog,
} from "@/components/app/torrent-dialogs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { rpc } from "@/lib/deluge/client";
import {
  formatBytes,
  formatEta,
  formatProgress,
  formatRate,
  formatRatio,
} from "@/lib/deluge/format";
import { GRID_KEYS } from "@/lib/deluge/keys";
import type { FilterDict, SessionStats, TorrentStatus, UiUpdate } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

type SortKey = keyof TorrentStatus | "id";

export function TorrentShell({
  onLogout,
  onManageHosts,
}: {
  onLogout: () => void;
  onManageHosts: () => void;
}) {
  const mobile = useIsMobile();
  const [ui, setUi] = useState<UiUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<SidebarFilters>({
    state: "All",
    tracker: "",
    label: "__all__",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("queue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [hostsOpen, setHostsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);

  const filterDict = useMemo<FilterDict>(() => {
    const dict: FilterDict = {};
    if (filters.state && filters.state !== "All") dict.state = [filters.state];
    if (filters.tracker) dict.tracker_host = [filters.tracker];
    if (filters.label && filters.label !== "__all__") {
      dict.label = [filters.label === "__none__" ? "" : filters.label];
    }
    return dict;
  }, [filters]);

  const poll = useCallback(async () => {
    try {
      const result = await rpc<UiUpdate>("web.update_ui", [[...GRID_KEYS], filterDict]);
      setUi(result);
      setError(null);
      if (!result.connected) setError("Daemon disconnected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }, [filterDict]);

  useEffect(() => {
    void poll();
    const id = setInterval(() => void poll(), 1000);
    return () => clearInterval(id);
  }, [poll]);

  const refreshLabels = useCallback(async () => {
    try {
      setLabels(await rpc<string[]>("label.get_labels"));
    } catch {
      setLabels([]);
    }
  }, []);

  useEffect(() => {
    void refreshLabels();
  }, [refreshLabels]);

  const torrents = useMemo(() => {
    const entries = Object.entries(ui?.torrents || {}) as [string, TorrentStatus][];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? entries.filter(([, t]) => t.name.toLowerCase().includes(q))
      : entries;
    filtered.sort((a, b) => {
      const av = a[1][sortKey as keyof TorrentStatus];
      const bv = b[1][sortKey as keyof TorrentStatus];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return filtered;
  }, [ui, search, sortKey, sortDir]);

  const ids = useMemo(() => torrents.map(([id]) => id), [torrents]);
  const selectedIds = [...selected];
  const primary = activeId && ui?.torrents?.[activeId] ? activeId : selectedIds[0] ?? null;
  const primaryTorrent = primary ? (ui?.torrents?.[primary] as TorrentStatus | undefined) : null;
  const stats = ui?.stats as SessionStats | null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function clickRow(id: string, e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setActiveId(id);
      return;
    }
    if (e.shiftKey && activeId) {
      const a = ids.indexOf(activeId);
      const b = ids.indexOf(id);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelected(new Set(ids.slice(lo, hi + 1)));
        setActiveId(id);
        return;
      }
    }
    setSelected(new Set([id]));
    setActiveId(id);
    if (mobile) setDetailsOpen(true);
  }

  async function act(method: string, params: unknown[] = [selectedIds]) {
    if (!selectedIds.length) return;
    try {
      await rpc(method, params);
      await poll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function setLabel(label: string) {
    try {
      for (const id of selectedIds) await rpc("label.set_torrent", [id, label]);
      await poll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Label failed");
    }
  }

  async function logout() {
    try {
      await rpc("auth.delete_session");
    } catch {
      /* still leave */
    }
    onLogout();
  }

  const downloadPath =
    primaryTorrent?.download_location || "/home/deluge/Downloads";

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1">
      <ToolBtn label="Add torrent" onClick={() => setAddOpen(true)}>
        <Plus />
      </ToolBtn>
      <ToolBtn label="Pause" disabled={!selectedIds.length} onClick={() => void act("core.pause_torrent")}>
        <Pause />
      </ToolBtn>
      <ToolBtn label="Resume" disabled={!selectedIds.length} onClick={() => void act("core.resume_torrent")}>
        <Play />
      </ToolBtn>
      <ToolBtn
        label="Remove"
        disabled={!selectedIds.length}
        onClick={() => setRemoveOpen(true)}
      >
        <Trash2 />
      </ToolBtn>
      <ToolBtn label="Queue top" disabled={!selectedIds.length} onClick={() => void act("core.queue_top")}>
        <ChevronsUp />
      </ToolBtn>
      <ToolBtn label="Queue up" disabled={!selectedIds.length} onClick={() => void act("core.queue_up")}>
        <ArrowUp />
      </ToolBtn>
      <ToolBtn label="Queue down" disabled={!selectedIds.length} onClick={() => void act("core.queue_down")}>
        <ArrowDown />
      </ToolBtn>
      <ToolBtn
        label="Queue bottom"
        disabled={!selectedIds.length}
        onClick={() => void act("core.queue_bottom")}
      >
        <ChevronsDown />
      </ToolBtn>
      <ToolBtn label="Move storage" disabled={!selectedIds.length} onClick={() => setMoveOpen(true)}>
        <FolderInput />
      </ToolBtn>
      <ToolBtn
        label="Force recheck"
        disabled={!selectedIds.length}
        onClick={() => void act("core.force_recheck")}
      >
        <RefreshCw />
      </ToolBtn>
    </div>
  );

  const table = (
    <div className="min-h-0 flex-1 overflow-auto">
      {loading && !ui ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading torrents…
        </div>
      ) : torrents.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-sm font-medium">No torrents match this view</p>
          <p className="text-sm text-muted-foreground">
            Add a torrent or clear filters to see the session.
          </p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus />
            Add torrent
          </Button>
        </div>
      ) : (
        <table className="w-full min-w-[64rem] text-sm">
          <thead className="sticky top-0 z-10 border-b bg-background">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="w-8 px-2 py-2">
                <Checkbox
                  checked={ids.length > 0 && selectedIds.length === ids.length}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < ids.length}
                  onCheckedChange={(v) => {
                    setSelected(v ? new Set(ids) : new Set());
                  }}
                />
              </th>
              <Th onClick={() => toggleSort("queue")} active={sortKey === "queue"} dir={sortDir}>
                #
              </Th>
              <Th onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir}>
                Name
              </Th>
              <Th onClick={() => toggleSort("total_wanted")} active={sortKey === "total_wanted"} dir={sortDir}>
                Size
              </Th>
              <Th onClick={() => toggleSort("progress")} active={sortKey === "progress"} dir={sortDir}>
                Progress
              </Th>
              <Th onClick={() => toggleSort("state")} active={sortKey === "state"} dir={sortDir}>
                Status
              </Th>
              <Th
                onClick={() => toggleSort("download_payload_rate")}
                active={sortKey === "download_payload_rate"}
                dir={sortDir}
              >
                Down
              </Th>
              <Th
                onClick={() => toggleSort("upload_payload_rate")}
                active={sortKey === "upload_payload_rate"}
                dir={sortDir}
              >
                Up
              </Th>
              <Th onClick={() => toggleSort("eta")} active={sortKey === "eta"} dir={sortDir}>
                ETA
              </Th>
              <Th onClick={() => toggleSort("ratio")} active={sortKey === "ratio"} dir={sortDir}>
                Ratio
              </Th>
              <th className="px-2 py-2 font-medium">Seeds</th>
              <th className="px-2 py-2 font-medium">Peers</th>
              <Th onClick={() => toggleSort("label")} active={sortKey === "label"} dir={sortDir}>
                Label
              </Th>
            </tr>
          </thead>
          <tbody>
            {torrents.map(([id, t]) => {
              const isSel = selected.has(id);
              return (
                <ContextMenu key={id}>
                  <ContextMenuTrigger
                    render={
                      <tr
                        className={cn(
                          "cursor-pointer border-b hover:bg-muted/50",
                          isSel && "bg-primary/10 hover:bg-primary/15"
                        )}
                        onClick={(e) => clickRow(id, e)}
                        onDoubleClick={() => {
                          setActiveId(id);
                          setDetailsOpen(true);
                        }}
                      />
                    }
                  >
                    <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={(v) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(id);
                            else next.delete(id);
                            return next;
                          });
                          setActiveId(id);
                        }}
                      />
                    </td>
                    <td className="px-2 py-1.5 tabular text-muted-foreground">{t.queue}</td>
                    <td className="max-w-[20rem] truncate px-2 py-1.5 font-medium">{t.name}</td>
                    <td className="px-2 py-1.5 tabular">{formatBytes(t.total_wanted)}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", stateBarClass(t.state))}
                            style={{ width: `${Math.min(100, t.progress)}%` }}
                          />
                        </div>
                        <span className="tabular text-xs">{formatProgress(t.progress)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <StateBadge state={t.state} />
                    </td>
                    <td className="px-2 py-1.5 tabular text-[color:var(--downloading)]">
                      {formatRate(t.download_payload_rate)}
                    </td>
                    <td className="px-2 py-1.5 tabular text-[color:var(--seeding)]">
                      {formatRate(t.upload_payload_rate)}
                    </td>
                    <td className="px-2 py-1.5 tabular">{formatEta(t.eta)}</td>
                    <td className="px-2 py-1.5 tabular">{formatRatio(t.ratio)}</td>
                    <td className="px-2 py-1.5 tabular text-muted-foreground">
                      {t.num_seeds} ({t.total_seeds})
                    </td>
                    <td className="px-2 py-1.5 tabular text-muted-foreground">
                      {t.num_peers} ({t.total_peers})
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{t.label || "—"}</td>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="min-w-48">
                    <ContextMenuItem
                      onClick={() => {
                        setSelected(new Set([id]));
                        setActiveId(id);
                        void act("core.pause_torrent", [[id]]);
                      }}
                    >
                      <Pause /> Pause
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        setSelected(new Set([id]));
                        void act("core.resume_torrent", [[id]]);
                      }}
                    >
                      <Play /> Resume
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        setSelected(new Set([id]));
                        setRemoveOpen(true);
                      }}
                    >
                      <Trash2 /> Remove
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => void act("core.queue_top", [[id]])}>
                      <ChevronsUp /> Queue top
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => void act("core.queue_bottom", [[id]])}>
                      <ChevronsDown /> Queue bottom
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        setSelected(new Set([id]));
                        setMoveOpen(true);
                      }}
                    >
                      <FolderInput /> Move storage
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => void act("core.force_recheck", [[id]])}>
                      <RefreshCw /> Force recheck
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        Label
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        <ContextMenuItem onClick={() => void setLabel("")}>No label</ContextMenuItem>
                        {labels.map((lab) => (
                          <ContextMenuItem key={lab} onClick={() => void setLabel(lab)}>
                            {lab}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="flex h-svh min-h-0 flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-2 py-1.5 md:px-3">
        {mobile ? (
          <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)} aria-label="Filters">
            <Menu />
          </Button>
        ) : null}
        <Brand className="mr-2 hidden sm:flex" markClassName="size-7" />
        {toolbar}
        <div className="relative ml-auto min-w-0 max-w-xs flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search torrents"
            className="h-8 pl-7"
          />
        </div>
        <ToolBtn label="Preferences" onClick={() => setPrefsOpen(true)}>
          <Settings />
        </ToolBtn>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Session menu" />}>
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setHostsOpen(true)}>
              <Server /> Connection Manager
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageHosts()}>
              <Server /> Open hosts page
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void logout()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
      </header>

      {error ? (
        <div className="border-b bg-destructive/10 px-3 py-1.5 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {!mobile ? (
          <aside className="w-56 shrink-0 border-r bg-sidebar text-sidebar-foreground">
            <FilterSidebar
              filters={ui?.filters ?? null}
              selected={filters}
              onSelect={setFilters}
              onLabelsChanged={() => {
                void refreshLabels();
                void poll();
              }}
              className="h-full"
            />
          </aside>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          {table}
          {!mobile ? (
            <div className="h-[min(16rem,36vh)] shrink-0 border-t">
              <TorrentDetails torrentId={primary} torrent={primaryTorrent ?? null} className="h-full" />
            </div>
          ) : null}
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-sidebar px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          {torrents.length} torrent{torrents.length === 1 ? "" : "s"}
          {selectedIds.length ? ` · ${selectedIds.length} selected` : ""}
        </span>
        <span className="text-[color:var(--downloading)] tabular">
          ↓ {formatRate(stats?.download_rate ?? 0)}
        </span>
        <span className="text-[color:var(--seeding)] tabular">↑ {formatRate(stats?.upload_rate ?? 0)}</span>
        <span>Connections {stats?.num_connections ?? 0}</span>
        <span>DHT {stats?.dht_nodes ?? 0}</span>
        <span>Free {formatBytes(stats?.free_space ?? 0)}</span>
        <span className="ml-auto font-mono">{stats?.external_ip || ""}</span>
      </footer>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-3">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <FilterSidebar
            filters={ui?.filters ?? null}
            selected={filters}
            onSelect={(next) => {
              setFilters(next);
              setSidebarOpen(false);
            }}
            onLabelsChanged={() => {
              void refreshLabels();
              void poll();
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="p-3">
            <SheetTitle className="truncate">{primaryTorrent?.name || "Details"}</SheetTitle>
          </SheetHeader>
          <TorrentDetails torrentId={primary} torrent={primaryTorrent ?? null} className="h-[calc(80vh-3.5rem)]" />
        </SheetContent>
      </Sheet>

      <AddTorrentDialog open={addOpen} onOpenChange={setAddOpen} defaultPath={downloadPath} />
      <RemoveTorrentDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        ids={selectedIds}
        onRemoved={() => setSelected(new Set())}
      />
      <MoveTorrentDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        ids={selectedIds}
        currentPath={downloadPath}
      />
      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
      <Dialog open={hostsOpen} onOpenChange={setHostsOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Connection Manager</DialogTitle>
          </DialogHeader>
          <ConnectionManager embedded onConnected={() => setHostsOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolBtn({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick} />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th className="px-2 py-2">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-medium">
        {children}
        {active ? (
          <span className="text-[10px] text-primary">{dir === "asc" ? "▲" : "▼"}</span>
        ) : null}
      </button>
    </th>
  );
}
