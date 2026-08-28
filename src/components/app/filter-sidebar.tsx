"use client";

import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleAlert,
  Clock,
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
import { isVisibleFilterRow, sidebarGroupRows, stateAllCount, stateSidebarRows } from "@/lib/deluge/sidebar-filters";
import type { FilterTuple } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

export interface SidebarFilters {
  state: string;
  tracker: string;
  label: string;
}

const EMPTY_TUPLES: FilterTuple[] = [];

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
  className,
}: {
  filters: Record<string, FilterTuple[]> | null;
  selected: SidebarFilters;
  onSelect: (next: SidebarFilters) => void;
  onLabelsChanged?: () => void;
  showZero?: boolean;
  className?: string;
}) {
  const [newLabel, setNewLabel] = useState("");
  const states = stateSidebarRows(filters?.state, showZero);
  const torrentCount = stateAllCount(states);
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
  });

  async function addLabel() {
    const name = newLabel.trim().toLowerCase();
    if (!name) return;
    try {
      await rpc("label.add", [name]);
      setNewLabel("");
      onLabelsChanged?.();
      toast.success(`Label “${name}” added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add label");
    }
  }

  async function removeLabel(name: string) {
    try {
      await rpc("label.remove", [name]);
      if (selected.label === name) onSelect({ ...selected, label: "__all__" });
      onLabelsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove label");
    }
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-5 p-3">
        <FilterGroup title="State">
          {states.map(([name, count]) =>
            isVisibleFilterRow(name, count, showZero, name === "All") ? (
              <FilterButton
                key={name}
                label={name}
                count={count}
                active={selected.state === name}
                icon={stateIcon(name)}
                onClick={() => onSelect({ ...selected, state: name })}
              />
            ) : null
          )}
        </FilterGroup>
        <FilterGroup title="Trackers">
          {trackers.map((row) => (
            <FilterButton
              key={row.isAll ? "__all__" : row.value || "(empty)"}
              label={row.label}
              count={row.count}
              active={selected.tracker === row.value}
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
                onClick={() => onSelect({ ...selected, label: row.value })}
              />
            );
            if (row.isAll || row.value === "__none__") {
              return <div key={row.isAll ? "__all__" : "none"}>{item}</div>;
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
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md border-l-2 px-2 py-1 text-left text-sm transition-colors",
        active
          ? "border-l-sidebar-primary bg-sidebar-primary/15 font-medium text-sidebar-foreground"
          : "border-l-transparent hover:bg-sidebar-accent/60"
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
