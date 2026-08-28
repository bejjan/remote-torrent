"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronsDown,
  ChevronsUp,
  FolderInput,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  cloneElement,
  memo,
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from "react";
import { HighlightText } from "@/components/app/highlight-text";
import { DragResizeHandle } from "@/components/app/drag-resize-handle";
import { StateBadge, stateBarClass } from "@/components/app/state-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
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
import {
  TORRENT_COLUMNS,
  type TorrentColumn,
  type TorrentColumnId,
} from "@/lib/deluge/torrent-columns";
import type { TorrentSortKey } from "@/lib/deluge/torrent-list";
import type { TorrentStatus } from "@/lib/deluge/types";
import { SELECT_COLUMN_ID } from "@/lib/deluge/ui-layout";
import { cn } from "@/lib/utils";

/** Fixed row height keeps scrolling smooth and avoids measuring 1000+ rows. */
export const TORRENT_ROW_HEIGHT = 36;
const ROW_OVERSCAN = 10;

export type TorrentRowEntry = [id: string, torrent: TorrentStatus];

export type TorrentTableProps = {
  torrents: TorrentRowEntry[];
  selected: Set<string>;
  activeId: string | null;
  sortKey: TorrentSortKey;
  sortDir: "asc" | "desc";
  search: string;
  shownColumns: TorrentColumn[];
  visibleColumnIds: Set<TorrentColumnId>;
  tableMinWidth: number;
  widthFor: (id: string) => number;
  labels: string[];
  loading: boolean;
  hasUi: boolean;
  mobile: boolean;
  onToggleSort: (key: TorrentSortKey) => void;
  onResizeColumn: (id: string, dx: number) => void;
  onSetColumnVisible: (id: TorrentColumnId, visible: boolean) => void;
  onSelectedChange: (next: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  onActiveIdChange: (id: string | null) => void;
  onOpenDetails: (id: string) => void;
  onAddTorrent: () => void;
  onAct: (method: string, torrentIds?: string[]) => void;
  onSetLabel: (label: string, torrentIds?: string[]) => void;
  onRemove: (torrentIds: string[]) => void;
  onMove: (torrentIds: string[]) => void;
};

type RowHandlers = {
  clickRow: (id: string, e: MouseEvent) => void;
  selectForContext: (id: string) => string[];
  toggleChecked: (id: string, checked: boolean) => void;
  openDetails: (id: string) => void;
  act: (method: string, torrentIds?: string[]) => void;
  setLabel: (label: string, torrentIds?: string[]) => void;
  remove: (torrentIds: string[]) => void;
  move: (torrentIds: string[]) => void;
};

/** If the row is already selected, operate on the full selection; otherwise only that row. */
export function contextActionIds(selected: Set<string>, rowId: string): string[] {
  return selected.has(rowId) ? [...selected] : [rowId];
}

export const TorrentTable = memo(function TorrentTable({
  torrents,
  selected,
  activeId,
  sortKey,
  sortDir,
  search,
  shownColumns,
  visibleColumnIds,
  tableMinWidth,
  widthFor,
  labels,
  loading,
  hasUi,
  mobile,
  onToggleSort,
  onResizeColumn,
  onSetColumnVisible,
  onSelectedChange,
  onActiveIdChange,
  onOpenDetails,
  onAddTorrent,
  onAct,
  onSetLabel,
  onRemove,
  onMove,
}: TorrentTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ids = useMemo(() => torrents.map(([id]) => id), [torrents]);
  const selectedCount = selected.size;
  const colCount = shownColumns.length + 1;

  const handlersRef = useRef<RowHandlers>(null!);
  handlersRef.current = {
    clickRow(id, e) {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey) {
        onSelectedChange((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        onActiveIdChange(id);
        return;
      }
      if (e.shiftKey && activeId) {
        const a = ids.indexOf(activeId);
        const b = ids.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          onSelectedChange(new Set(ids.slice(lo, hi + 1)));
          onActiveIdChange(id);
          return;
        }
      }
      onSelectedChange(new Set([id]));
      onActiveIdChange(id);
      if (mobile) onOpenDetails(id);
    },
    selectForContext(id) {
      const actionIds = contextActionIds(selected, id);
      if (!selected.has(id)) onSelectedChange(new Set(actionIds));
      onActiveIdChange(id);
      return actionIds;
    },
    toggleChecked(id, checked) {
      onSelectedChange((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
      onActiveIdChange(id);
    },
    openDetails(id) {
      onActiveIdChange(id);
      onOpenDetails(id);
    },
    act: onAct,
    setLabel: onSetLabel,
    remove: onRemove,
    move: onMove,
  };

  // useVirtualizer returns unstable function identities; skip React Compiler memoization of this body.
  // eslint-disable-next-line react-hooks/incompatible-library -- virtualizer owns scroll; parent TorrentTable is memoized
  const virtualizer = useVirtualizer({
    count: torrents.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => TORRENT_ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
    getItemKey: (index) => torrents[index]?.[0] ?? index,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  const scrollRowIntoView = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: "auto" });
    },
    [virtualizer]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, [contenteditable=true]"))) return;

      const lastIndex = ids.length - 1;
      if (lastIndex < 0) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        onSelectedChange(new Set(ids));
        return;
      }

      const current = activeId ? ids.indexOf(activeId) : -1;

      const moveTo = (index: number, shift: boolean) => {
        const nextIndex = Math.max(0, Math.min(lastIndex, index));
        const id = ids[nextIndex];
        if (!id) return;
        if (shift && current >= 0) {
          const anchor = current;
          const [lo, hi] = anchor < nextIndex ? [anchor, nextIndex] : [nextIndex, anchor];
          onSelectedChange(new Set(ids.slice(lo, hi + 1)));
        } else if (!shift) {
          onSelectedChange(new Set([id]));
        }
        onActiveIdChange(id);
        scrollRowIntoView(nextIndex);
      };

      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveTo(current < 0 ? 0 : current + 1, e.shiftKey);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveTo(current < 0 ? 0 : current - 1, e.shiftKey);
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        moveTo(0, e.shiftKey);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        moveTo(lastIndex, e.shiftKey);
        return;
      }
      if (e.key === "PageDown" || e.key === "PageUp") {
        e.preventDefault();
        const page = Math.max(1, Math.floor((scrollRef.current?.clientHeight ?? 400) / TORRENT_ROW_HEIGHT) - 1);
        moveTo(current < 0 ? 0 : current + (e.key === "PageDown" ? page : -page), e.shiftKey);
        return;
      }
      if (e.key === "Enter" && activeId) {
        e.preventDefault();
        onOpenDetails(activeId);
        return;
      }
      if (e.key === " " && activeId) {
        e.preventDefault();
        handlersRef.current.toggleChecked(activeId, !selected.has(activeId));
      }
    },
    [activeId, ids, onActiveIdChange, onOpenDetails, onSelectedChange, scrollRowIntoView, selected]
  );

  if (loading && !hasUi) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading torrents…
      </div>
    );
  }

  if (torrents.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium">No torrents match this view</p>
        <p className="text-sm text-muted-foreground">
          Add a torrent or clear filters to see the session.
        </p>
        <Button size="sm" onClick={onAddTorrent}>
          <Plus />
          Add torrent
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-auto"
      tabIndex={0}
      aria-label="Torrent list"
      onKeyDown={onKeyDown}
    >
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
        <thead className="sticky top-0 z-10 border-b bg-background">
          <ContextMenu>
            <ContextMenuTrigger render={<tr className="text-left text-xs" />}>
              <th className="relative px-2 py-2">
                <Checkbox
                  checked={ids.length > 0 && selectedCount === ids.length}
                  indeterminate={selectedCount > 0 && selectedCount < ids.length}
                  onCheckedChange={(v) => {
                    onSelectedChange(v ? new Set(ids) : new Set());
                  }}
                />
                <DragResizeHandle
                  ariaLabel="Resize selection column"
                  onDelta={(dx) => onResizeColumn(SELECT_COLUMN_ID, dx)}
                />
              </th>
              {shownColumns.map((column) => (
                <Th
                  key={column.id}
                  onClick={() => onToggleSort(column.sortKey)}
                  active={sortKey === column.sortKey}
                  dir={sortDir}
                  onResize={(dx) => onResizeColumn(column.id, dx)}
                >
                  {column.label}
                </Th>
              ))}
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-52" side="bottom" align="start">
              {/* GroupLabel throws without Group: "MenuGroupContext is missing". */}
              <ContextMenuGroup>
                <ContextMenuLabel>Columns</ContextMenuLabel>
                {TORRENT_COLUMNS.map((column) => (
                  <ContextMenuCheckboxItem
                    key={column.id}
                    checked={visibleColumnIds.has(column.id)}
                    disabled={!column.hideable}
                    onCheckedChange={(checked) => onSetColumnVisible(column.id, checked)}
                  >
                    {column.label === "#" ? "# Queue" : column.label}
                  </ContextMenuCheckboxItem>
                ))}
              </ContextMenuGroup>
            </ContextMenuContent>
          </ContextMenu>
        </thead>
        <tbody>
          {paddingTop > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={colCount} style={{ height: paddingTop, padding: 0, border: 0 }} />
            </tr>
          ) : null}
          {virtualRows.map((virtualRow) => {
            const entry = torrents[virtualRow.index];
            if (!entry) return null;
            const [id, torrent] = entry;
            return (
              <TorrentRow
                key={id}
                torrentId={id}
                torrent={torrent}
                selected={selected.has(id)}
                shownColumns={shownColumns}
                query={search}
                sortKey={sortKey}
                labels={labels}
                handlersRef={handlersRef}
                height={virtualRow.size}
              />
            );
          })}
          {paddingBottom > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={colCount} style={{ height: paddingBottom, padding: 0, border: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
});

const TorrentRow = memo(function TorrentRow({
  torrentId,
  torrent,
  selected,
  shownColumns,
  query,
  sortKey,
  labels,
  handlersRef,
  height,
}: {
  torrentId: string;
  torrent: TorrentStatus;
  selected: boolean;
  shownColumns: TorrentColumn[];
  query: string;
  sortKey: TorrentSortKey;
  labels: string[];
  handlersRef: { current: RowHandlers };
  height: number;
}) {
  const id = torrentId;
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <tr
            className={cn(
              "cursor-pointer border-b hover:bg-muted/50",
              selected && "bg-primary/10 hover:bg-primary/15"
            )}
            style={{ height }}
            onClick={(e) => handlersRef.current.clickRow(id, e)}
            onContextMenu={() => {
              handlersRef.current.selectForContext(id);
            }}
            onDoubleClick={() => handlersRef.current.openDetails(id)}
          />
        }
      >
        <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => {
              handlersRef.current.toggleChecked(id, Boolean(v));
            }}
          />
        </td>
        {shownColumns.map((column) => (
          <TorrentColumnCell
            key={column.id}
            column={column}
            torrent={torrent}
            query={query}
            sorted={sortKey === column.sortKey}
          />
        ))}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem
          onClick={() => {
            handlersRef.current.act("core.pause_torrent", handlersRef.current.selectForContext(id));
          }}
        >
          <Pause /> Pause
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            handlersRef.current.act("core.resume_torrent", handlersRef.current.selectForContext(id));
          }}
        >
          <Play /> Resume
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            handlersRef.current.remove(handlersRef.current.selectForContext(id));
          }}
        >
          <Trash2 /> Remove
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => handlersRef.current.act("core.queue_top", handlersRef.current.selectForContext(id))}
        >
          <ChevronsUp /> Queue top
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() =>
            handlersRef.current.act("core.queue_bottom", handlersRef.current.selectForContext(id))
          }
        >
          <ChevronsDown /> Queue bottom
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            handlersRef.current.move(handlersRef.current.selectForContext(id));
          }}
        >
          <FolderInput /> Move storage
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() =>
            handlersRef.current.act("core.force_recheck", handlersRef.current.selectForContext(id))
          }
        >
          <RefreshCw /> Force recheck
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Label</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              onClick={() => handlersRef.current.setLabel("", handlersRef.current.selectForContext(id))}
            >
              No label
            </ContextMenuItem>
            {labels.map((lab) => (
              <ContextMenuItem
                key={lab}
                onClick={() => handlersRef.current.setLabel(lab, handlersRef.current.selectForContext(id))}
              >
                {lab}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
});

function Th({
  children,
  onClick,
  active,
  dir,
  onResize,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  onResize: (dx: number) => void;
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
      <DragResizeHandle ariaLabel="Resize column" onDelta={onResize} />
    </th>
  );
}

function formatAvail(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "∞";
  return value.toFixed(3);
}

const TorrentColumnCell = memo(function TorrentColumnCell({
  column,
  torrent: t,
  query,
  sorted,
}: {
  column: TorrentColumn;
  torrent: TorrentStatus;
  query: string;
  sorted?: boolean;
}) {
  const hit = (text: string) => <HighlightText text={text} query={query} />;
  const cell = (() => {
    switch (column.id) {
      case "queue":
        return (
          <td className="px-2 py-1.5 tabular text-muted-foreground">{hit(formatQueue(t.queue))}</td>
        );
      case "name":
        return <td className="truncate px-2 py-1.5 font-medium">{hit(t.name)}</td>;
      case "size":
        return <td className="px-2 py-1.5 tabular">{hit(formatBytes(t.total_wanted))}</td>;
      case "progress":
        return (
          <td className="px-2 py-1.5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-muted">
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
          <td className="truncate px-2 py-1.5 text-muted-foreground">
            {hit(t.tracker_host || "—")}
          </td>
        );
      case "save_path":
        return (
          <td className="truncate px-2 py-1.5 text-muted-foreground">
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
  })();
  if (!cell) return null;
  return cloneElement(cell as ReactElement<{ className?: string }>, {
    className: cn(cell.props.className, "overflow-hidden", sorted && "bg-muted/25"),
  });
});
