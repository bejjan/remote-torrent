"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
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
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
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
  formatLimit,
  formatProgress,
  formatQueue,
  formatTorrentEta,
  formatTorrentRate,
  formatRatio,
  formatSwarmCount,
} from "@/lib/deluge/format";
import {
  COLUMN_REORDER_DRAG_THRESHOLD,
  TORRENT_COLUMNS,
  columnDropEdge,
  dropIndexFromX,
  isIdentityColumnDrop,
  type TorrentColumn,
  type TorrentColumnId,
} from "@/lib/deluge/torrent-columns";
import {
  TORRENT_FILTER_EMPTY_HINT,
  TORRENT_FILTER_EMPTY_TITLE,
  TORRENT_SEARCH_EMPTY_HINT,
  torrentSearchEmptyTitle,
} from "@/lib/deluge/torrent-empty-state";
import type { TorrentSortKey } from "@/lib/deluge/torrent-list";
import type { TorrentStatus } from "@/lib/deluge/types";
import {
  applyVisibleSelection,
  idsBetween,
  moveListSelection,
  resolveRangeAnchor,
  visibleSelectionState,
} from "@/lib/deluge/selection";
import { SELECT_COLUMN_ID } from "@/lib/deluge/ui-layout";
import { cn } from "@/lib/utils";

/** Fixed row height keeps scrolling smooth and avoids measuring 1000+ rows. */
export const TORRENT_ROW_HEIGHT = 36;
const ROW_OVERSCAN = 10;

type TorrentRowTone = {
  striped: boolean;
  selected: boolean;
  selectedAbove?: boolean;
  selectedBelow?: boolean;
};

/**
 * Finder-style zebra + inset rounded selection. Header stays full-bleed; body
 * highlight is inset via the overlay (`left-1.5` / `right-1.5`). Do not use a
 * thick side-border gutter — `border-left-width` / `border-right-width` clips
 * `border-radius` so the curve looks cut off. Do not round first/last `<td>`
 * either: the checkbox column is ~32–40×36px, so `rounded-md` on that cell
 * reads as a pill. Paint one continuous `rounded-md` overlay behind the row.
 * Content gutter is padding, matching header `pl-3.5` / `pr-3.5`.
 */
export function torrentRowClassName(_tone: TorrentRowTone): string {
  return cn(
    "group relative isolate cursor-pointer [transform:translateZ(0)]",
    // Overlay is the last `td` (out of flow). Content cells stack above it.
    "[&>td:not([data-row-highlight])]:relative [&>td:not([data-row-highlight])]:z-10"
  );
}

/** Full-row highlight: `rounded-md` (`--radius-md`, same as buttons), not cell corners. */
export function torrentRowHighlightClassName({
  striped,
  selected,
  selectedAbove = false,
  selectedBelow = false,
}: TorrentRowTone): string {
  const mergeTop = selected && selectedAbove;
  const mergeBottom = selected && selectedBelow;
  return cn(
    "pointer-events-none absolute inset-y-0 left-1.5 right-1.5 z-0 block border-0 p-0",
    mergeTop && mergeBottom
      ? "rounded-none"
      : mergeTop
        ? "rounded-b-md"
        : mergeBottom
          ? "rounded-t-md"
          : "rounded-md",
    !selected && striped && "bg-muted/50",
    !selected && "group-hover:bg-muted/70",
    selected && "bg-primary/10 group-hover:bg-primary/15"
  );
}

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
  onReorderColumns: (draggedId: TorrentColumnId, beforeId: TorrentColumnId | null) => void;
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
  onReorderColumns,
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
  const rangeAnchorIdRef = useRef<string | null>(null);
  const ids = useMemo(() => torrents.map(([id]) => id), [torrents]);
  const headerSelect = visibleSelectionState(ids, selected);
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
        rangeAnchorIdRef.current = id;
        onActiveIdChange(id);
        return;
      }
      if (e.shiftKey) {
        const anchorId = resolveRangeAnchor(ids, rangeAnchorIdRef.current, activeId);
        if (anchorId) {
          rangeAnchorIdRef.current = anchorId;
          onSelectedChange(new Set(idsBetween(ids, anchorId, id)));
          onActiveIdChange(id);
          return;
        }
      }
      rangeAnchorIdRef.current = id;
      onSelectedChange(new Set([id]));
      onActiveIdChange(id);
      if (mobile) onOpenDetails(id);
    },
    selectForContext(id) {
      const actionIds = contextActionIds(selected, id);
      if (!selected.has(id)) onSelectedChange(new Set(actionIds));
      rangeAnchorIdRef.current = id;
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
      rangeAnchorIdRef.current = id;
      onActiveIdChange(id);
    },
    openDetails(id) {
      rangeAnchorIdRef.current = id;
      onActiveIdChange(id);
      onOpenDetails(id);
    },
    act: onAct,
    setLabel: onSetLabel,
    remove: onRemove,
    move: onMove,
  };

  const shownColumnsRef = useRef(shownColumns);
  shownColumnsRef.current = shownColumns;
  const headerCellsRef = useRef(new Map<string, HTMLTableCellElement>());
  const suppressSortRef = useRef(false);
  const reorderSessionRef = useRef(false);
  const [dragId, setDragId] = useState<TorrentColumnId | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const setHeaderCell = useCallback((id: string, node: HTMLTableCellElement | null) => {
    if (node) headerCellsRef.current.set(id, node);
    else headerCellsRef.current.delete(id);
  }, []);

  const startReorder = useCallback(
    (id: TorrentColumnId, event: ReactPointerEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if (reorderSessionRef.current) return;
      if (shownColumnsRef.current.length < 2) return;

      reorderSessionRef.current = true;
      const startX = event.clientX;
      const startY = event.clientY;
      const target = event.currentTarget;
      const pointerId = "pointerId" in event ? event.pointerId : undefined;
      let dragging = false;
      let currentDrop: number | null = null;
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      const measureDrop = (clientX: number) => {
        const mids: number[] = [];
        for (const column of shownColumnsRef.current) {
          const el = headerCellsRef.current.get(column.id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          mids.push(rect.left + rect.width / 2);
        }
        return dropIndexFromX(mids, clientX);
      };

      const move = (clientX: number, clientY: number, ev?: PointerEvent) => {
        if (!dragging) {
          if (Math.hypot(clientX - startX, clientY - startY) < COLUMN_REORDER_DRAG_THRESHOLD) return;
          dragging = true;
          setDragId(id);
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
          if (pointerId != null) {
            try {
              target.setPointerCapture(pointerId);
            } catch {
              /* synthetic pointers may reject capture */
            }
          }
        }
        if (ev) ev.preventDefault();
        const nextDrop = measureDrop(clientX);
        currentDrop = nextDrop;
        setDropIndex(nextDrop);
      };

      const onPointerMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY, ev);
      const onMouseMove = (ev: globalThis.MouseEvent) => move(ev.clientX, ev.clientY);
      const stop = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", stop);
        if (pointerId != null && target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        reorderSessionRef.current = false;
        if (dragging) {
          suppressSortRef.current = true;
          window.setTimeout(() => {
            suppressSortRef.current = false;
          }, 0);
          const from = shownColumnsRef.current.findIndex((column) => column.id === id);
          const drop = currentDrop ?? from;
          if (from >= 0 && !isIdentityColumnDrop(from, drop)) {
            const beforeId =
              drop >= shownColumnsRef.current.length
                ? null
                : shownColumnsRef.current[drop]?.id ?? null;
            onReorderColumns(id, beforeId);
          }
          setDragId(null);
          setDropIndex(null);
        }
      };

      if (pointerId != null) {
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", stop);
        window.addEventListener("pointercancel", stop);
      } else {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", stop);
      }
    },
    [onReorderColumns]
  );

  const onHeaderSortClick = useCallback(
    (key: TorrentSortKey) => {
      if (suppressSortRef.current) {
        suppressSortRef.current = false;
        return;
      }
      onToggleSort(key);
    },
    [onToggleSort]
  );

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
        const moved = moveListSelection({
          ids,
          activeId,
          anchorId: rangeAnchorIdRef.current,
          nextIndex: index,
          shift,
        });
        if (!moved) return;
        rangeAnchorIdRef.current = moved.anchorId;
        onSelectedChange(new Set(moved.selected));
        onActiveIdChange(moved.activeId);
        scrollRowIntoView(ids.indexOf(moved.activeId));
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
    const query = search.trim();
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium" title={query ? torrentSearchEmptyTitle(search, false) : undefined}>
          {query ? torrentSearchEmptyTitle(search) : TORRENT_FILTER_EMPTY_TITLE}
        </p>
        <p className="text-sm text-muted-foreground">
          {query ? TORRENT_SEARCH_EMPTY_HINT : TORRENT_FILTER_EMPTY_HINT}
        </p>
        {query ? null : (
          <Button size="sm" onClick={onAddTorrent}>
            <Plus />
            Add torrent
          </Button>
        )}
      </div>
    );
  }

  const dragFromIndex = dragId ? shownColumns.findIndex((column) => column.id === dragId) : -1;

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-auto"
      tabIndex={0}
      aria-label="Torrent list"
      onKeyDown={onKeyDown}
    >
      <table
        className="table-fixed border-separate border-spacing-0 text-sm"
        // Pixel sum of <col> widths. width:100% redistributes leftover viewport space
        // across columns, so resizing one header shrinks/grows the others.
        style={{ width: tableMinWidth }}
      >
        <colgroup>
          <col style={{ width: widthFor(SELECT_COLUMN_ID) }} />
          {shownColumns.map((column) => (
            <col key={column.id} style={{ width: widthFor(column.id) }} />
          ))}
        </colgroup>
        <thead className={cn("sticky top-0 z-10 bg-background [&_th]:border-b", dragId && "touch-none")}>
          <ContextMenu>
            <ContextMenuTrigger render={<tr className="text-left text-xs" />}>
              <th className="relative py-2 pr-2 pl-3.5">
                <Checkbox
                  checked={headerSelect.checked}
                  indeterminate={headerSelect.indeterminate}
                  onCheckedChange={(v) => {
                    onSelectedChange((prev) => applyVisibleSelection(prev, ids, Boolean(v)));
                  }}
                />
                <DragResizeHandle
                  ariaLabel="Resize selection column"
                  onDelta={(dx) => onResizeColumn(SELECT_COLUMN_ID, dx)}
                />
              </th>
              {shownColumns.map((column, index) => {
                const dropEdge =
                  dragFromIndex >= 0 && dropIndex != null
                    ? columnDropEdge(index, dropIndex, dragFromIndex, shownColumns.length)
                    : null;
                return (
                  <Th
                    key={column.id}
                    columnId={column.id}
                    onClick={() => onHeaderSortClick(column.sortKey)}
                    active={sortKey === column.sortKey}
                    dir={sortDir}
                    dragging={dragId === column.id}
                    dropEdge={dropEdge}
                    headerRef={(node) => setHeaderCell(column.id, node)}
                    onReorderPointerDown={(event) => startReorder(column.id, event)}
                    onResize={(dx) => onResizeColumn(column.id, dx)}
                    last={index === shownColumns.length - 1}
                  >
                    {column.label}
                  </Th>
                );
              })}
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
            const prevId = torrents[virtualRow.index - 1]?.[0];
            const nextId = torrents[virtualRow.index + 1]?.[0];
            return (
              <TorrentRow
                key={id}
                torrentId={id}
                torrent={torrent}
                striped={virtualRow.index % 2 === 1}
                selected={selected.has(id)}
                selectedAbove={!!prevId && selected.has(prevId)}
                selectedBelow={!!nextId && selected.has(nextId)}
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
  striped,
  selected,
  selectedAbove,
  selectedBelow,
  shownColumns,
  query,
  sortKey,
  labels,
  handlersRef,
  height,
}: {
  torrentId: string;
  torrent: TorrentStatus;
  striped: boolean;
  selected: boolean;
  selectedAbove: boolean;
  selectedBelow: boolean;
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
            className={torrentRowClassName({
              striped,
              selected,
              selectedAbove,
              selectedBelow,
            })}
            style={{ height }}
            onClick={(e) => handlersRef.current.clickRow(id, e)}
            onContextMenu={() => {
              handlersRef.current.selectForContext(id);
            }}
            onDoubleClick={() => handlersRef.current.openDetails(id)}
          />
        }
      >
        <td className="overflow-hidden py-1.5 pr-2 pl-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => {
              handlersRef.current.toggleChecked(id, Boolean(v));
            }}
          />
        </td>
        {shownColumns.map((column, index) => (
          <TorrentColumnCell
            key={column.id}
            column={column}
            torrent={torrent}
            query={query}
            sorted={sortKey === column.sortKey}
            last={index === shownColumns.length - 1}
          />
        ))}
        <td
          aria-hidden
          data-row-highlight=""
          className={torrentRowHighlightClassName({
            striped,
            selected,
            selectedAbove,
            selectedBelow,
          })}
        />
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem
          onClick={() => {
            handlersRef.current.selectForContext(id);
            handlersRef.current.openDetails(id);
          }}
        >
          <AppWindow /> Open inspector...
        </ContextMenuItem>
        <ContextMenuSeparator />
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
          onClick={() => handlersRef.current.act("core.queue_up", handlersRef.current.selectForContext(id))}
        >
          <ArrowUp /> Queue up
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handlersRef.current.act("core.queue_down", handlersRef.current.selectForContext(id))}
        >
          <ArrowDown /> Queue down
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
          <FolderInput /> Move storage…
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
  columnId,
  onClick,
  active,
  dir,
  dragging,
  dropEdge,
  headerRef,
  onReorderPointerDown,
  onResize,
  last = false,
}: {
  children: React.ReactNode;
  columnId: TorrentColumnId;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  dragging: boolean;
  dropEdge: "before" | "after" | null;
  headerRef: (node: HTMLTableCellElement | null) => void;
  onReorderPointerDown: (event: ReactPointerEvent<HTMLTableCellElement> | MouseEvent<HTMLTableCellElement>) => void;
  onResize: (dx: number) => void;
  last?: boolean;
}) {
  return (
    <th
      ref={headerRef}
      data-column-id={columnId}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      aria-grabbed={dragging || undefined}
      className={cn(
        "relative overflow-visible py-2 select-none",
        last ? "pr-3.5 pl-2" : "px-2",
        dragging ? "cursor-grabbing" : "cursor-grab",
        active ? "bg-muted/40 text-foreground" : "text-muted-foreground"
      )}
      onPointerDown={onReorderPointerDown}
      onMouseDown={onReorderPointerDown}
    >
      {dropEdge === "before" ? (
        <span
          aria-hidden
          data-drop-indicator="before"
          className="pointer-events-none absolute inset-y-0 left-0 z-30 w-0.5 -translate-x-1/2 bg-primary"
        />
      ) : null}
      {dropEdge === "after" ? (
        <span
          aria-hidden
          data-drop-indicator="after"
          className="pointer-events-none absolute inset-y-0 right-0 z-30 w-0.5 translate-x-1/2 bg-primary"
        />
      ) : null}
      <button
        type="button"
        draggable={false}
        onClick={(e) => {
          if (e.button !== 0) return;
          onClick();
        }}
        className={cn(
          "inline-flex max-w-full cursor-grab items-center gap-1 truncate",
          dragging && "opacity-50",
          active ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
        )}
      >
        {children}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="size-3 shrink-0 text-foreground" aria-hidden />
          ) : (
            <ChevronDown className="size-3 shrink-0 text-foreground" aria-hidden />
          )
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
  last,
}: {
  column: TorrentColumn;
  torrent: TorrentStatus;
  query: string;
  sorted?: boolean;
  last?: boolean;
}) {
  const hit = (text: string) => <HighlightText text={text} query={query} />;
  const cell = (() => {
    switch (column.id) {
      case "queue":
        return (
          <td className="px-2 py-1.5 tabular text-muted-foreground">{hit(formatQueue(t.queue))}</td>
        );
      case "name":
        return <td className="px-2 py-1.5 font-medium">{hit(t.name)}</td>;
      case "size":
        return <td className="px-2 py-1.5 tabular">{hit(formatBytes(t.total_wanted))}</td>;
      case "progress":
        return (
          <td className="px-2 py-1.5">
            <div className="flex min-w-0 w-full flex-1 items-center gap-2">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                <div
                  className={cn("h-full rounded-full", stateBarClass(t.state))}
                  style={{ width: `${Math.min(100, t.progress)}%` }}
                />
              </div>
              <span className="shrink-0 tabular text-xs">{hit(formatProgress(t.progress))}</span>
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
            {hit(formatTorrentRate(t.download_payload_rate))}
          </td>
        );
      case "up":
        return (
          <td className="px-2 py-1.5 tabular text-[color:var(--seeding)]">
            {hit(formatTorrentRate(t.upload_payload_rate))}
          </td>
        );
      case "eta":
        return <td className="px-2 py-1.5 tabular">{hit(formatTorrentEta(t.eta, t.progress))}</td>;
      case "ratio":
        return <td className="px-2 py-1.5 tabular">{hit(formatRatio(t.ratio))}</td>;
      case "seeds":
        return (
          <td className="px-2 py-1.5 tabular text-muted-foreground">
            {hit(formatSwarmCount(t.num_seeds, t.total_seeds))}
          </td>
        );
      case "peers":
        return (
          <td className="px-2 py-1.5 tabular text-muted-foreground">
            {hit(formatSwarmCount(t.num_peers, t.total_peers))}
          </td>
        );
      case "label":
        return <td className="px-2 py-1.5 text-muted-foreground">{hit(t.label || "—")}</td>;
      case "avail":
        return <td className="px-2 py-1.5 tabular">{hit(formatAvail(t.distributed_copies))}</td>;
      case "added":
        return <td className="px-2 py-1.5 tabular">{hit(formatDate(t.time_added))}</td>;
      case "tracker":
        return (
          <td className="px-2 py-1.5 text-muted-foreground">{hit(t.tracker_host || "—")}</td>
        );
      case "save_path":
        return (
          <td className="px-2 py-1.5 text-muted-foreground">
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
        return <td className="px-2 py-1.5 tabular">{hit(formatDate(t.last_seen_complete))}</td>;
      case "completed":
        return <td className="px-2 py-1.5 tabular">{hit(formatDate(t.completed_time))}</td>;
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
  const typed = cell as ReactElement<{ className?: string; children?: React.ReactNode }>;
  const isProgress = column.id === "progress";
  return cloneElement(typed, {
    className: cn(
      typed.props.className,
      // table-layout:fixed still lets min-content wrap; max-w-0 + nowrap/ellipsis clips to the col width.
      "max-w-0 min-w-0 overflow-hidden align-middle",
      column.numeric && "font-mono text-xs",
      !isProgress && "text-ellipsis whitespace-nowrap",
      last && "pr-3.5",
      sorted && "bg-muted/25"
    ),
    children: (
      <div
        className={cn(
          "min-w-0",
          // flex + text-overflow:ellipsis clips without drawing dots; progress needs flex for the bar.
          isProgress ? "flex h-full w-full items-center" : "truncate"
        )}
      >
        {typed.props.children}
      </div>
    ),
  });
});
