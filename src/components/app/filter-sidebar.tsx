"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleAlert,
  Clock,
  Globe,
  ListFilter,
  Pause,
  Plus,
  SearchCheck,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { rpc } from "@/lib/deluge/client";
import {
  isUnusableTrackerFavicon,
  trackerFaviconLetter,
  trackerFaviconSources,
} from "@/lib/deluge/format";
import {
  LABEL_PLUGIN_ENABLE_HINT,
  LABEL_RPC,
  invalidLabelIdMessage,
  labelRpcErrorMessage,
  normalizeLabelId,
} from "@/lib/deluge/label-plugin";
import {
  FILTER_ALL,
  completeStateFilters,
  isVisibleFilterRow,
  sidebarGroupRows,
  stateAllCount,
} from "@/lib/deluge/sidebar-filters";
import type { FilterTuple } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

export interface SidebarFilters {
  state: string;
  tracker: string;
  label: string;
}

const EMPTY_TUPLES: FilterTuple[] = [];
const EMPTY_LABELS: string[] = [];

const STATE_ICONS: Record<string, { Icon: LucideIcon; className: string }> = {
  All: { Icon: ListFilter, className: "text-muted-foreground" },
  Downloading: { Icon: ArrowDownToLine, className: "text-[color:var(--downloading)]" },
  Seeding: { Icon: ArrowUpFromLine, className: "text-[color:var(--seeding)]" },
  Paused: { Icon: Pause, className: "text-muted-foreground" },
  Checking: { Icon: SearchCheck, className: "text-[color:var(--checking)]" },
  Queued: { Icon: Clock, className: "text-[color:var(--queued)]" },
  Error: { Icon: CircleAlert, className: "text-destructive" },
  Active: { Icon: Activity, className: "text-muted-foreground" },
};

export function FilterSidebar({
  filters,
  selected,
  onSelect,
  onLabelsChanged,
  showZero = false,
  labelPluginEnabled = null,
  definedLabels = EMPTY_LABELS,
  className,
}: {
  filters: Record<string, FilterTuple[]> | null;
  selected: SidebarFilters;
  onSelect: (next: SidebarFilters) => void;
  onLabelsChanged?: () => void;
  showZero?: boolean;
  labelPluginEnabled?: boolean | null;
  definedLabels?: string[];
  className?: string;
}) {
  const [newLabel, setNewLabel] = useState("");
  // Live Deluge injects every state at 0. Paint the catalog; FilterButton drops zeros.
  const stateCatalog = completeStateFilters(filters?.state);
  const torrentCount = stateAllCount(stateCatalog);
  const trackers = sidebarGroupRows(filters?.tracker_host ?? EMPTY_TUPLES, {
    showZero,
    fallbackAllCount: torrentCount,
    allValue: "",
    emptyLabel: "(empty)",
    namedAllLabel: "All (tracker)",
  });
  const labels = sidebarGroupRows(filters?.label ?? EMPTY_TUPLES, {
    showZero,
    fallbackAllCount: torrentCount,
    allValue: "__all__",
    emptyLabel: "(no label)",
    namedAllLabel: "All (label)",
    emptyValue: "__none__",
    knownNames: definedLabels,
  });

  async function addLabel() {
    const name = normalizeLabelId(newLabel);
    const invalid = invalidLabelIdMessage(name);
    if (invalid) {
      if (name) toast.error(invalid);
      return;
    }
    try {
      await rpc(LABEL_RPC.add, [name]);
      setNewLabel("");
      onLabelsChanged?.();
      toast.success(`Label “${name}” added`);
    } catch (err) {
      toast.error(labelRpcErrorMessage(err, "Could not add label"));
    }
  }

  async function removeLabel(name: string) {
    try {
      await rpc(LABEL_RPC.remove, [name]);
      if (selected.label === name) onSelect({ ...selected, label: "__all__" });
      onLabelsChanged?.();
    } catch (err) {
      toast.error(labelRpcErrorMessage(err, "Could not remove label"));
    }
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-5 p-3">
        <FilterGroup title="State">
          {stateCatalog.map(([name, count]) => (
            <FilterButton
              key={name}
              label={name}
              count={count}
              active={selected.state === name}
              icon={stateIcon(name)}
              showZero={showZero}
              alwaysShow={name === FILTER_ALL}
              onClick={() => onSelect({ ...selected, state: name })}
            />
          ))}
        </FilterGroup>
        <FilterGroup title="Trackers">
          {trackers.map((row) => (
            <FilterButton
              key={row.isAll ? "__all__" : row.value || "(empty)"}
              label={row.label}
              count={row.count}
              active={selected.tracker === row.value}
              icon={row.isAll ? allTrackersIcon() : <TrackerFavicon host={row.value} />}
              showZero={showZero}
              alwaysShow={row.isAll}
              onClick={() => onSelect({ ...selected, tracker: row.value })}
            />
          ))}
        </FilterGroup>
        <FilterGroup title="Labels">
          {labels.map((row) => {
            const item = (
              <FilterButton
                label={row.label}
                count={row.count}
                active={selected.label === row.value}
                showZero={showZero}
                alwaysShow={row.isAll || Boolean(row.keepZero)}
                onClick={() => onSelect({ ...selected, label: row.value })}
              />
            );
            if (row.isAll || row.value === "__none__" || !labelPluginEnabled) {
              return <div key={row.isAll ? "__all__" : row.value || "none"}>{item}</div>;
            }
            return (
              <ContextMenu key={row.value}>
                <ContextMenuTrigger className="block">{item}</ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem variant="destructive" onClick={() => void removeLabel(row.value)}>
                    <Trash2 />
                    Remove label
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
          {labelPluginEnabled ? (
            <>
              <form
                className="mt-1 flex gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addLabel();
                }}
              >
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="New label"
                  className="h-7 text-xs"
                />
                <Button type="submit" size="icon-sm" variant="outline" aria-label="Add label">
                  <Plus />
                </Button>
              </form>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Tag className="size-3" />
                Right-click a label to remove it
              </p>
            </>
          ) : labelPluginEnabled === false ? (
            <p className="px-1 text-[11px] text-muted-foreground">{LABEL_PLUGIN_ENABLE_HINT}</p>
          ) : null}
        </FilterGroup>
      </div>
    </ScrollArea>
  );
}

function stateIcon(name: string) {
  const entry = STATE_ICONS[name];
  if (!entry) return null;
  const { Icon, className } = entry;
  return <Icon aria-hidden className={cn("size-3.5 shrink-0", className)} />;
}

function allTrackersIcon() {
  return (
    <span className="inline-flex size-4 shrink-0 items-center justify-center" aria-hidden>
      <ListFilter className="size-3.5 text-muted-foreground" />
    </span>
  );
}

function TrackerFavicon({ host }: { host: string }) {
  const sources = trackerFaviconSources(host);
  const letter = trackerFaviconLetter(host);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [workingSrc, setWorkingSrc] = useState<string | null>(null);

  useEffect(() => {
    setSourceIndex(0);
    setWorkingSrc(null);
  }, [host]);

  const src = workingSrc ?? sources[sourceIndex] ?? null;

  function advanceSource() {
    setWorkingSrc(null);
    setSourceIndex((index) => index + 1);
  }

  const fallback = letter ? (
    <LetterAvatar letter={letter} />
  ) : (
    <Globe className="size-3.5 text-muted-foreground" />
  );

  return (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center overflow-hidden" aria-hidden>
      {workingSrc ? null : fallback}
      {src ? (
        // External CDN thumbnails; next/image is the wrong fit for arbitrary tracker hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          decoding="async"
          className={workingSrc ? "size-4" : "absolute size-4 opacity-0"}
          onError={advanceSource}
          onLoad={(event) => {
            const img = event.currentTarget;
            if (
              isUnusableTrackerFavicon({
                src: img.currentSrc || img.src,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
              })
            ) {
              advanceSource();
              return;
            }
            setWorkingSrc(src);
          }}
        />
      ) : null}
    </span>
  );
}

function LetterAvatar({ letter }: { letter: string }) {
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[9px] font-medium leading-none text-muted-foreground">
      {letter}
    </span>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
  icon,
  showZero = false,
  alwaysShow,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  showZero?: boolean;
  alwaysShow?: boolean;
}) {
  if (!isVisibleFilterRow(label, count, showZero, alwaysShow ?? label === FILTER_ALL)) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition-colors",
        active
          ? "bg-black/8 font-medium text-sidebar-foreground dark:bg-sidebar-primary/25"
          : "hover:bg-sidebar-accent/60"
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular text-xs text-muted-foreground">{count}</span>
    </button>
  );
}
