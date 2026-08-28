import type { TorrentState } from "@/lib/deluge/types";
import { Badge } from "@/components/ui/badge";
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

export function StateBadge({ state }: { state: TorrentState }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[state] || STYLES.Paused)}>
      {state}
    </Badge>
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
