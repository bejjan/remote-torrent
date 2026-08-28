"use client";

import type { ReactNode } from "react";
import type { TorrentState } from "@/lib/deluge/types";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { errorStatusTooltip } from "@/lib/deluge/error-status";
import { cn } from "@/lib/utils";

const STYLES: Record<TorrentState, string> = {
  Downloading: "bg-[color:var(--downloading)]/15 text-[color:var(--downloading)] border-transparent",
  Seeding: "bg-[color:var(--seeding)]/15 text-[color:var(--seeding)] border-transparent",
  Paused: "bg-muted text-muted-foreground border-transparent",
  Checking: "bg-[color:var(--checking)]/15 text-[color:var(--checking)] border-transparent",
  Queued: "bg-[color:var(--queued)]/15 text-[color:var(--queued)] border-transparent",
  Error: "bg-destructive/15 text-destructive border-transparent",
  Allocating: "bg-[color:var(--checking)]/15 text-[color:var(--checking)] border-transparent",
  Moving: "bg-[color:var(--queued)]/15 text-[color:var(--queued)] border-transparent",
};

export function StateBadge({
  state,
  children,
  message,
}: {
  state: TorrentState;
  children?: ReactNode;
  /** Deluge torrent `message`; shown when `state` is Error. */
  message?: string | null;
}) {
  const badge = (
    <Badge variant="outline" className={cn("font-medium", STYLES[state] || STYLES.Paused)}>
      {children ?? state}
    </Badge>
  );

  if (state !== "Error") return badge;

  return (
    <Tooltip>
      <TooltipTrigger delay={200} render={<span className="inline-flex cursor-help" />}>
        {badge}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm text-left whitespace-normal break-words">
        {errorStatusTooltip(message)}
      </TooltipContent>
    </Tooltip>
  );
}

export function stateBarClass(state: TorrentState): string {
  switch (state) {
    case "Downloading":
      return "bg-[color:var(--downloading)]";
    case "Seeding":
      return "bg-[color:var(--seeding)]";
    case "Error":
      return "bg-destructive";
    case "Checking":
    case "Allocating":
      return "bg-[color:var(--checking)]";
    case "Queued":
    case "Moving":
      return "bg-[color:var(--queued)]";
    default:
      return "bg-muted-foreground/50";
  }
}
