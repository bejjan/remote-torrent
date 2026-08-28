"use client";

import { useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
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
import { STATE_FILTERS } from "@/lib/deluge/keys";
import { rpc } from "@/lib/deluge/client";
import type { FilterTuple } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

export interface SidebarFilters {
  state: string;
  tracker: string;
  label: string;
}

export function FilterSidebar({
  filters,
  selected,
  onSelect,
  onLabelsChanged,
  className,
}: {
  filters: Record<string, FilterTuple[]> | null;
  selected: SidebarFilters;
  onSelect: (next: SidebarFilters) => void;
  onLabelsChanged?: () => void;
  className?: string;
}) {
  const [newLabel, setNewLabel] = useState("");
  const states = filters?.state ?? STATE_FILTERS.map((s) => [s, 0] as FilterTuple);
  const trackers = filters?.tracker_host ?? [];
  const labels = filters?.label ?? [];

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
      if (selected.label === name) onSelect({ ...selected, label: "" });
      onLabelsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove label");
    }
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-5 p-3">
        <FilterGroup title="State">
          {states.map(([name, count]) => (
            <FilterButton
              key={name}
              label={name}
              count={count}
              active={selected.state === name}
              onClick={() => onSelect({ ...selected, state: name })}
            />
          ))}
        </FilterGroup>
        <FilterGroup title="Trackers">
          <FilterButton
            label="All"
            count={trackers.reduce((n, [, c]) => n + c, 0)}
            active={selected.tracker === ""}
            onClick={() => onSelect({ ...selected, tracker: "" })}
          />
          {trackers.map(([name, count]) => (
            <FilterButton
              key={name}
              label={name || "(empty)"}
              count={count}
              active={selected.tracker === name}
              onClick={() => onSelect({ ...selected, tracker: name })}
            />
          ))}
        </FilterGroup>
        <FilterGroup title="Labels">
          <FilterButton
            label="All"
            count={labels.reduce((n, [, c]) => n + c, 0)}
            active={selected.label === "__all__"}
            onClick={() => onSelect({ ...selected, label: "__all__" })}
          />
          {labels.map(([name, count]) => {
            const key = name || "__none__";
            const item = (
              <FilterButton
                label={name || "(no label)"}
                count={count}
                active={selected.label === key}
                onClick={() => onSelect({ ...selected, label: key })}
              />
            );
            if (!name) return <div key="none">{item}</div>;
            return (
              <ContextMenu key={name}>
                <ContextMenuTrigger className="block">{item}</ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem variant="destructive" onClick={() => void removeLabel(name)}>
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
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
      )}
    >
      <span className="truncate">{label}</span>
      <span className="tabular text-xs text-muted-foreground">{count}</span>
    </button>
  );
}
