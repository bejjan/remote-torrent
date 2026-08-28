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
import { AboutDialog } from "@/components/app/about-dialog";
import { Brand } from "@/components/app/brand";
import { ConnectionManager } from "@/components/app/connection-manager";
import { DragResizeHandle } from "@/components/app/drag-resize-handle";
import { FilterSidebar, type SidebarFilters } from "@/components/app/filter-sidebar";
import { PreferencesDialog } from "@/components/app/preferences-dialog";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { TorrentDetails } from "@/components/app/torrent-details";
import {
  AddTorrentDialog,
  MoveTorrentDialog,
  RemoveTorrentDialog,
} from "@/components/app/torrent-dialogs";
import { TorrentTable } from "@/components/app/torrent-table";
import { Button } from "@/components/ui/button";
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
import { formatBytes, formatRate } from "@/lib/deluge/format";
import { GRID_KEYS } from "@/lib/deluge/keys";
import {
  LABEL_RPC,
  isLabelPluginEnabled,
  isUnknownMethodMessage,
  labelRpcErrorMessage,
} from "@/lib/deluge/label-plugin";
import {
  classifyEscapeTarget,
  decideEscapeSelectionAction,
  hasOpenDismissibleOverlay,
} from "@/lib/deluge/escape-selection";
import { clampSidebarSelection } from "@/lib/deluge/sidebar-filters";
import {
  applyColumnVisibility,
  defaultTorrentColumnOrder,
  defaultVisibleTorrentColumns,
  loadTorrentColumnOrder,
  loadTorrentColumnVisibility,
  moveColumnBefore,
  saveTorrentColumnOrder,
  saveTorrentColumnVisibility,
  sameColumnOrder,
  visibleTorrentColumns,
  type TorrentColumnId,
} from "@/lib/deluge/torrent-columns";
import {
  filterAndSortTorrents,
  type TorrentSortKey,
} from "@/lib/deluge/torrent-list";
import type { FilterDict, SessionStats, TorrentStatus, UiUpdate } from "@/lib/deluge/types";
import { mergeUiUpdate } from "@/lib/deluge/ui-merge";
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
  const [sortKey, setSortKey] = useState<TorrentSortKey>("queue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [hostsOpen, setHostsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const [labelPluginEnabled, setLabelPluginEnabled] = useState<boolean | null>(null);
  const [showZeroFilters, setShowZeroFilters] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<TorrentColumnId>>(
    defaultVisibleTorrentColumns
  );
  const [columnOrder, setColumnOrder] = useState<TorrentColumnId[]>(defaultTorrentColumnOrder);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const splitRef = useRef<HTMLDivElement>(null);
  const searchValueRef = useRef(search);
  const selectedRef = useRef(selected);
  const activeIdRef = useRef(activeId);
  searchValueRef.current = search;
  selectedRef.current = selected;
  activeIdRef.current = activeId;

  useEffect(() => {
    setVisibleColumnIds(loadTorrentColumnVisibility());
    setColumnOrder(loadTorrentColumnOrder());
    setSidebarWidth(loadSidebarWidth());
    setColumnWidths(loadTorrentColumnWidths());
  }, []);

  const shownColumns = useMemo(
    () => visibleTorrentColumns(visibleColumnIds, columnOrder),
    [visibleColumnIds, columnOrder]
  );

  const widthFor = useCallback(
    (id: string) => columnWidthFor(id, columnWidths),
    [columnWidths]
  );

  const tableMinWidth = useMemo(() => {
    return widthFor(SELECT_COLUMN_ID) + shownColumns.reduce((sum, column) => sum + widthFor(column.id), 0);
  }, [shownColumns, widthFor]);

  const resizeColumn = useCallback((id: string, dx: number) => {
    setColumnWidths((prev) => {
      const next = {
        ...prev,
        [id]: clampColumnWidth(columnWidthFor(id, prev) + dx, id),
      };
      saveTorrentColumnWidths(next);
      return next;
    });
  }, []);

  const resizeSidebar = useCallback((dx: number) => {
    const containerWidth = splitRef.current?.getBoundingClientRect().width;
    setSidebarWidth((width) => {
      const next = clampSidebarWidth(width + dx, containerWidth);
      saveSidebarWidth(next);
      return next;
    });
  }, []);

  const setColumnVisible = useCallback((id: TorrentColumnId, visible: boolean) => {
    setVisibleColumnIds((prev) => {
      const next = applyColumnVisibility(prev, id, visible);
      saveTorrentColumnVisibility(next);
      return next;
    });
  }, []);

  const reorderColumn = useCallback((draggedId: TorrentColumnId, beforeId: TorrentColumnId | null) => {
    setColumnOrder((prev) => {
      const next = moveColumnBefore(prev, draggedId, beforeId);
      if (sameColumnOrder(next, prev)) return prev;
      saveTorrentColumnOrder(next);
      return next;
    });
  }, []);

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
      setUi((prev) => mergeUiUpdate(prev, result));
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
      let enabled = false;
      try {
        const plugins = await rpc<{ enabled_plugins?: string[] }>("web.get_plugins");
        enabled = isLabelPluginEnabled(plugins);
      } catch {
        const list = await rpc<string[]>("core.get_enabled_plugins");
        enabled = isLabelPluginEnabled(list);
      }
      setLabelPluginEnabled(enabled);
      if (!enabled) {
        setLabels([]);
        return;
      }
      setLabels(await rpc<string[]>(LABEL_RPC.getLabels));
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (isUnknownMethodMessage(message)) setLabelPluginEnabled(false);
      setLabels([]);
    }
  }, []);

  useEffect(() => {
    if (prefsOpen) return;
    let cancelled = false;
    void refreshLabels();
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
  }, [prefsOpen, applyWebUi, refreshLabels]);

  useEffect(() => {
    const tree = ui?.filters;
    if (!tree) return;
    setFilters((prev) => {
      const next = clampSidebarSelection(
        prev,
        tree.state ?? [],
        tree.tracker_host ?? [],
        tree.label ?? [],
        showZeroFilters,
        labels
      );
      if (next.state === prev.state && next.tracker === prev.tracker && next.label === prev.label) {
        return prev;
      }
      return next;
    });
  }, [ui?.filters, showZeroFilters, labels]);

  const torrents = useMemo(
    () => filterAndSortTorrents(ui?.torrents, search, sortKey, sortDir),
    [ui?.torrents, search, sortKey, sortDir]
  );

  const selectedIds = useMemo(() => [...selected], [selected]);
  const primary = activeId && ui?.torrents?.[activeId] ? activeId : selectedIds[0] ?? null;
  const primaryTorrent = primary ? (ui?.torrents?.[primary] as TorrentStatus | undefined) : null;
  const stats = ui?.stats as SessionStats | null;

  const toggleSort = useCallback((key: TorrentSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" || key === "queue" ? "asc" : "desc");
    }
  }, [sortKey]);

  const act = useCallback(
    async (method: string, torrentIds?: string[]) => {
      const ids = torrentIds ?? [...selected];
      if (!ids.length) return;
      try {
        await rpc(method, [ids]);
        await poll();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      }
    },
    [poll, selected]
  );

  const setLabel = useCallback(
    async (label: string, torrentIds?: string[]) => {
      const ids = torrentIds ?? [...selected];
      if (!ids.length) return;
      try {
        for (const id of ids) await rpc(LABEL_RPC.setTorrent, [id, label]);
        await poll();
      } catch (err) {
        toast.error(labelRpcErrorMessage(err, "Label failed"));
      }
    },
    [poll, selected]
  );

  const openDetails = useCallback((id: string) => {
    setActiveId(id);
    setDetailsOpen(true);
  }, []);

  const openRemove = useCallback((torrentIds: string[]) => {
    setSelected(new Set(torrentIds));
    setRemoveOpen(true);
  }, []);

  const openMove = useCallback((torrentIds: string[]) => {
    setSelected(new Set(torrentIds));
    setMoveOpen(true);
  }, []);

  async function logout() {
    try {
      await rpc("auth.delete_session");
    } catch {
      /* still leave */
    }
    onLogout();
  }

  const onLabelsChanged = useCallback(() => {
    void refreshLabels();
    void poll();
  }, [refreshLabels, poll]);

  const openAdd = useCallback(() => setAddOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = decideEscapeSelectionAction({
        key: event.key,
        defaultPrevented: event.defaultPrevented,
        overlayOpen: hasOpenDismissibleOverlay(document),
        targetKind: classifyEscapeTarget(event.target),
        search: searchValueRef.current,
        selectedCount: selectedRef.current.size,
        hasActiveId: activeIdRef.current != null,
      });
      if (action === "none") return;
      event.preventDefault();
      if (action === "clear-search") {
        setSearch("");
        return;
      }
      setSelected(new Set());
      setActiveId(null);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

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
    <TorrentTable
      torrents={torrents}
      selected={selected}
      activeId={activeId}
      sortKey={sortKey}
      sortDir={sortDir}
      search={search}
      shownColumns={shownColumns}
      visibleColumnIds={visibleColumnIds}
      tableMinWidth={tableMinWidth}
      widthFor={widthFor}
      labels={labels}
      loading={loading}
      hasUi={Boolean(ui)}
      mobile={mobile}
      onToggleSort={toggleSort}
      onResizeColumn={resizeColumn}
      onReorderColumns={reorderColumn}
      onSetColumnVisible={setColumnVisible}
      onSelectedChange={setSelected}
      onActiveIdChange={setActiveId}
      onOpenDetails={openDetails}
      onAddTorrent={openAdd}
      onAct={act}
      onSetLabel={setLabel}
      onRemove={openRemove}
      onMove={openMove}
    />
  );


  return (
    <div className="flex h-svh min-h-0 flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-2 py-1.5 md:px-3">
        {mobile ? (
          <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)} aria-label="Filters">
            <Menu />
          </Button>
        ) : null}
        <Brand
          className="mr-2 hidden sm:flex"
          markClassName="size-7"
          onClick={() => setAboutOpen(true)}
        />
        {toolbar}
        <div className="relative ml-auto min-w-0 max-w-xs flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-torrent-search=""
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search torrents"
            aria-label="Search torrents"
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
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem className="whitespace-nowrap" onClick={() => setHostsOpen(true)}>
              <Server /> Connection Manager
            </DropdownMenuItem>
            <DropdownMenuItem className="whitespace-nowrap" onClick={() => onManageHosts()}>
              <Server /> Open hosts page
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="whitespace-nowrap" onClick={() => void logout()}>
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
          <div
            className="relative min-h-0 min-w-0 shrink-0 self-stretch"
            style={{ width: sidebarWidth }}
          >
            <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
              <FilterSidebar
                filters={ui?.filters ?? null}
                selected={filters}
                onSelect={setFilters}
                showZero={showZeroFilters}
                labelPluginEnabled={labelPluginEnabled}
                definedLabels={labels}
                onLabelsChanged={onLabelsChanged}
                className="h-full min-w-0"
              />
            </aside>
            <DragResizeHandle
              variant="sidebar"
              ariaLabel="Resize filter sidebar"
              onDelta={resizeSidebar}
            />
          </div>
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
            labelPluginEnabled={labelPluginEnabled}
            definedLabels={labels}
            onLabelsChanged={onLabelsChanged}
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
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
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
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="disabled:opacity-40 disabled:text-muted-foreground"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
