"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DragResizeHandle } from "@/components/app/drag-resize-handle";
import { FilterSidebar, type SidebarFilters } from "@/components/app/filter-sidebar";
import { HighlightText } from "@/components/app/highlight-text";
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
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
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
  compareQueue,
  formatBytes,
  formatDate,
  formatDuration,
  formatEta,
  formatLimit,
  formatProgress,
  formatQueue,
  formatRate,
  formatRatio,
} from "@/lib/deluge/format";
import { GRID_KEYS } from "@/lib/deluge/keys";
import { clampSidebarSelection } from "@/lib/deluge/sidebar-filters";
import {
  TORRENT_COLUMNS,
  applyColumnVisibility,
  defaultVisibleTorrentColumns,
  loadTorrentColumnVisibility,
  saveTorrentColumnVisibility,
  visibleTorrentColumns,
  type TorrentColumn,
  type TorrentColumnId,
} from "@/lib/deluge/torrent-columns";
import type { FilterDict, SessionStats, TorrentStatus, UiUpdate } from "@/lib/deluge/types";
import {
  SELECT_COLUMN_ID,
  SIDEBAR_DEFAULT_WIDTH,
  clampColumnWidth,
  clampSidebarWidth,
  columnWidthFor,
  loadSidebarWidth,
  loadTorrentColumnWidths,
  saveSidebarWidth,
  saveTorrentColumnWidths,
} from "@/lib/deluge/ui-layout";
import { isWebSidebarVisible } from "@/lib/deluge/web-config";
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
  const [showZeroFilters, setShowZeroFilters] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<TorrentColumnId>>(
    defaultVisibleTorrentColumns
  );
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const splitRef = useRef<HTMLDivElement>(null);
  const sidebarWidthRef = useRef(sidebarWidth);
  const columnWidthsRef = useRef(columnWidths);
  sidebarWidthRef.current = sidebarWidth;
  columnWidthsRef.current = columnWidths;

  useEffect(() => {
    setVisibleColumnIds(loadTorrentColumnVisibility());
    setSidebarWidth(loadSidebarWidth());
    setColumnWidths(loadTorrentColumnWidths());
  }, []);

  const shownColumns = useMemo(
    () => visibleTorrentColumns(visibleColumnIds),
    [visibleColumnIds]
  );

  const widthFor = useCallback(
    (id: string) => columnWidthFor(id, columnWidths),
    [columnWidths]
  );

  const tableMinWidth = useMemo(() => {
    return widthFor(SELECT_COLUMN_ID) + shownColumns.reduce((sum, column) => sum + widthFor(column.id), 0);
  }, [shownColumns, widthFor]);

  const persistSidebarWidth = useCallback(() => {
    saveSidebarWidth(sidebarWidthRef.current);
  }, []);

  const persistColumnWidths = useCallback(() => {
    saveTorrentColumnWidths(columnWidthsRef.current);
  }, []);

  const resizeColumn = useCallback((id: string, dx: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [id]: clampColumnWidth(columnWidthFor(id, prev) + dx, id),
    }));
  }, []);

  const resizeSidebar = useCallback((dx: number) => {
    const containerWidth = splitRef.current?.getBoundingClientRect().width;
    setSidebarWidth((width) => clampSidebarWidth(width + dx, containerWidth));
  }, []);

  function setColumnVisible(id: TorrentColumnId, visible: boolean) {
    setVisibleColumnIds((prev) => {
      const next = applyColumnVisibility(prev, id, visible);
      saveTorrentColumnVisibility(next);
      return next;
    });
  }

  const applyWebUi = useCallback((web: Record<string, unknown> | null | undefined) => {
    setShowZeroFilters(Boolean(web?.sidebar_show_zero));
    setShowSidebar(isWebSidebarVisible(web));
  }, []);

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

  useEffect(() => {
    if (prefsOpen) return;
    let cancelled = false;
    void rpc<Record<string, unknown>>("web.get_config")
      .then((web) => {
        if (!cancelled) applyWebUi(web);
      })
      .catch(() => {
        if (!cancelled) {
          setShowZeroFilters(false);
          setShowSidebar(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [prefsOpen, applyWebUi]);

  useEffect(() => {
    const tree = ui?.filters;
    if (!tree) return;
    setFilters((prev) => {
      const next = clampSidebarSelection(
        prev,
        tree.state ?? [],
        tree.tracker_host ?? [],
        tree.label ?? [],
        showZeroFilters
      );
      if (next.state === prev.state && next.tracker === prev.tracker && next.label === prev.label) {
        return prev;
      }
      return next;
    });
  }, [ui?.filters, showZeroFilters]);

  const torrents = useMemo(() => {
    const entries = Object.entries(ui?.torrents || {}) as [string, TorrentStatus][];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? entries.filter(([, t]) => t.name.toLowerCase().includes(q))
      : entries;
    filtered.sort((a, b) => {
      if (sortKey === "queue") {
        const cmp = compareQueue(a[1].queue, b[1].queue);
        return sortDir === "asc" ? cmp : -cmp;
      }
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
      setSortDir(key === "name" || key === "queue" ? "asc" : "desc");
    }
  }

  function clickRow(id: string, e: React.MouseEvent) {
    if (e.button !== 0) return;
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

  /** Right-click on an already-selected row keeps the full selection; otherwise that row becomes the sole target. */
  function selectForContext(rowId: string): string[] {
    const ids = contextActionIds(selected, rowId);
    if (!selected.has(rowId)) setSelected(new Set(ids));
    setActiveId(rowId);
    return ids;
  }

  async function act(method: string, torrentIds: string[] = selectedIds) {
    if (!torrentIds.length) return;
    try {
      await rpc(method, [torrentIds]);
      await poll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function setLabel(label: string, torrentIds: string[] = selectedIds) {
    if (!torrentIds.length) return;
    try {
      for (const id of torrentIds) await rpc("label.set_torrent", [id, label]);
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
        <table
          className="table-fixed text-sm"
          style={{ width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <colgroup>
            <col style={{ width: widthFor(SELECT_COLUMN_ID) }} />
            {shownColumns.map((column) => (
              <col key={column.id} style={{ width: widthFor(column.id) }} />
            ))}
          </colgroup>
          <ContextMenu>
            <ContextMenuTrigger
              render={<thead className="sticky top-0 z-10 border-b bg-background" />}
            >
              <tr className="text-left text-xs">
                <th className="relative px-2 py-2">
                  <Checkbox
                    checked={ids.length > 0 && selectedIds.length === ids.length}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < ids.length}
                    onCheckedChange={(v) => {
                      setSelected(v ? new Set(ids) : new Set());
                    }}
                  />
                  <DragResizeHandle
                    ariaLabel="Resize selection column"
                    onDelta={(dx) => resizeColumn(SELECT_COLUMN_ID, dx)}
                    onDragEnd={persistColumnWidths}
                  />
                </th>
                {shownColumns.map((column) => (
                  <Th
                    key={column.id}
                    onClick={() => toggleSort(column.sortKey)}
                    active={sortKey === column.sortKey}
                    dir={sortDir}
                    onResize={(dx) => resizeColumn(column.id, dx)}
                    onResizeEnd={persistColumnWidths}
                  >
                    {column.label}
                  </Th>
                ))}
              </tr>
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-52" side="bottom" align="start">
              <ContextMenuLabel>Columns</ContextMenuLabel>
              {TORRENT_COLUMNS.map((column) => (
                <ContextMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumnIds.has(column.id)}
                  disabled={!column.hideable}
                  onCheckedChange={(checked) => setColumnVisible(column.id, checked)}
                >
                  {column.label === "#" ? "# Queue" : column.label}
                </ContextMenuCheckboxItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>
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
                        onContextMenu={() => {
                          selectForContext(id);
                        }}
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
                    {shownColumns.map((column) => (
                      <TorrentColumnCell
                        key={column.id}
                        column={column}
                        torrent={t}
                        query={search}
                        sorted={sortKey === column.sortKey}
                      />
                    ))}
                  </ContextMenuTrigger>
                  <ContextMenuContent className="min-w-48">
                    <ContextMenuItem
                      onClick={() => {
                        void act("core.pause_torrent", selectForContext(id));
                      }}
                    >
                      <Pause /> Pause
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        void act("core.resume_torrent", selectForContext(id));
                      }}
                    >
                      <Play /> Resume
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        selectForContext(id);
                        setRemoveOpen(true);
                      }}
                    >
                      <Trash2 /> Remove
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => void act("core.queue_top", selectForContext(id))}
                    >
                      <ChevronsUp /> Queue top
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => void act("core.queue_bottom", selectForContext(id))}
                    >
                      <ChevronsDown /> Queue bottom
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        selectForContext(id);
                        setMoveOpen(true);
                      }}
                    >
                      <FolderInput /> Move storage
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => void act("core.force_recheck", selectForContext(id))}
                    >
                      <RefreshCw /> Force recheck
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        Label
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        <ContextMenuItem onClick={() => void setLabel("", selectForContext(id))}>
                          No label
                        </ContextMenuItem>
                        {labels.map((lab) => (
                          <ContextMenuItem
                            key={lab}
                            onClick={() => void setLabel(lab, selectForContext(id))}
                          >
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

      <div ref={splitRef} className="flex min-h-0 flex-1">
        {!mobile && showSidebar ? (
          <>
            <aside
              style={{ width: sidebarWidth }}
              className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground"
            >
              <FilterSidebar
                filters={ui?.filters ?? null}
                selected={filters}
                onSelect={setFilters}
                showZero={showZeroFilters}
                onLabelsChanged={() => {
                  void refreshLabels();
                  void poll();
                }}
                className="h-full min-w-0"
              />
            </aside>
            <DragResizeHandle
              variant="sidebar"
              ariaLabel="Resize filter sidebar"
              onDelta={resizeSidebar}
              onDragEnd={persistSidebarWidth}
            />
          </>
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
            showZero={showZeroFilters}
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
      <PreferencesDialog
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        onWebConfigChange={applyWebUi}
      />
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

/** If the row is already selected, operate on the full selection; otherwise only that row. */
function contextActionIds(selected: Set<string>, rowId: string): string[] {
  return selected.has(rowId) ? [...selected] : [rowId];
}

function Th({
  children,
  onClick,
  active,
  dir,
  onResize,
  onResizeEnd,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  onResize: (dx: number) => void;
  onResizeEnd: () => void;
}) {
  return (
    <th
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(
        "relative overflow-hidden px-2 py-2",
        active ? "bg-muted/40 text-foreground" : "text-muted-foreground"
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          if (e.button !== 0) return;
          onClick();
        }}
        className={cn(
          "inline-flex max-w-full items-center gap-1 truncate",
          active ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
        )}
      >
        {children}
        {active ? (
          <span className="text-[10px] text-foreground">{dir === "asc" ? "▲" : "▼"}</span>
        ) : null}
      </button>
      <DragResizeHandle
        ariaLabel="Resize column"
        onDelta={onResize}
        onDragEnd={onResizeEnd}
      />
    </th>
  );
}

function formatAvail(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "∞";
  return value.toFixed(3);
}

function TorrentColumnCell({
  column,
  torrent: t,
  query,
}: {
  column: TorrentColumn;
  torrent: TorrentStatus;
  query: string;
}) {
  const hit = (text: string) => <HighlightText text={text} query={query} />;
  switch (column.id) {
    case "queue":
      return (
        <td className="px-2 py-1.5 tabular text-muted-foreground">{hit(formatQueue(t.queue))}</td>
      );
    case "name":
      return <td className="max-w-[20rem] truncate px-2 py-1.5 font-medium">{hit(t.name)}</td>;
    case "size":
      return <td className="px-2 py-1.5 tabular">{hit(formatBytes(t.total_wanted))}</td>;
    case "progress":
      return (
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", stateBarClass(t.state))}
                style={{ width: `${Math.min(100, t.progress)}%` }}
              />
            </div>
            <span className="tabular text-xs">{hit(formatProgress(t.progress))}</span>
          </div>
        </td>
      );
    case "status":
      return (
        <td className="px-2 py-1.5">
          <StateBadge state={t.state} message={t.message}>
            {hit(t.state)}
          </StateBadge>
        </td>
      );
    case "down":
      return (
        <td className="px-2 py-1.5 tabular text-[color:var(--downloading)]">
          {hit(formatRate(t.download_payload_rate))}
        </td>
      );
    case "up":
      return (
        <td className="px-2 py-1.5 tabular text-[color:var(--seeding)]">
          {hit(formatRate(t.upload_payload_rate))}
        </td>
      );
    case "eta":
      return <td className="px-2 py-1.5 tabular">{hit(formatEta(t.eta))}</td>;
    case "ratio":
      return <td className="px-2 py-1.5 tabular">{hit(formatRatio(t.ratio))}</td>;
    case "seeds":
      return (
        <td className="px-2 py-1.5 tabular text-muted-foreground">
          {hit(`${t.num_seeds} (${t.total_seeds})`)}
        </td>
      );
    case "peers":
      return (
        <td className="px-2 py-1.5 tabular text-muted-foreground">
          {hit(`${t.num_peers} (${t.total_peers})`)}
        </td>
      );
    case "label":
      return <td className="px-2 py-1.5 text-muted-foreground">{hit(t.label || "—")}</td>;
    case "avail":
      return <td className="px-2 py-1.5 tabular">{hit(formatAvail(t.distributed_copies))}</td>;
    case "added":
      return (
        <td className="px-2 py-1.5 tabular whitespace-nowrap">{hit(formatDate(t.time_added))}</td>
      );
    case "tracker":
      return (
        <td className="max-w-[12rem] truncate px-2 py-1.5 text-muted-foreground">
          {hit(t.tracker_host || "—")}
        </td>
      );
    case "save_path":
      return (
        <td className="max-w-[16rem] truncate px-2 py-1.5 text-muted-foreground">
          {hit(t.download_location || "—")}
        </td>
      );
    case "downloaded":
      return <td className="px-2 py-1.5 tabular">{hit(formatBytes(t.total_done))}</td>;
    case "uploaded":
      return <td className="px-2 py-1.5 tabular">{hit(formatBytes(t.total_uploaded))}</td>;
    case "remaining":
      return <td className="px-2 py-1.5 tabular">{hit(formatBytes(t.total_remaining))}</td>;
    case "complete_seen":
      return (
        <td className="px-2 py-1.5 tabular whitespace-nowrap">
          {hit(formatDate(t.last_seen_complete))}
        </td>
      );
    case "completed":
      return (
        <td className="px-2 py-1.5 tabular whitespace-nowrap">{hit(formatDate(t.completed_time))}</td>
      );
    case "auto_managed":
      return (
        <td className="px-2 py-1.5 text-muted-foreground">{hit(t.is_auto_managed ? "Yes" : "No")}</td>
      );
    case "down_limit":
      return <td className="px-2 py-1.5 tabular">{hit(formatLimit(t.max_download_speed))}</td>;
    case "up_limit":
      return <td className="px-2 py-1.5 tabular">{hit(formatLimit(t.max_upload_speed))}</td>;
    case "seeds_peers":
      return <td className="px-2 py-1.5 tabular">{hit(formatAvail(t.seeds_peers_ratio))}</td>;
    case "last_transfer":
      return <td className="px-2 py-1.5 tabular">{hit(formatDuration(t.time_since_transfer))}</td>;
  }
}
