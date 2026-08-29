import {
  AppWindow,
  Archive,
  Ban,
  Bell,
  CalendarClock,
  Database,
  FolderDown,
  FolderPlus,
  Gauge,
  Globe,
  ListOrdered,
  Puzzle,
  Server,
  Settings2,
  Shield,
  SlidersHorizontal,
  Tag,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TINTS = {
  amber: "bg-amber-500",
  blue: "bg-sky-500",
  gray: "bg-zinc-500",
  green: "bg-emerald-500",
  indigo: "bg-indigo-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  purple: "bg-violet-500",
  red: "bg-red-500",
  teal: "bg-teal-500",
} as const;

type Tint = keyof typeof TINTS;

type Spec = { Icon: LucideIcon; tint: Tint };

const PAGE_ICONS: Record<string, Spec> = {
  downloads: { Icon: FolderDown, tint: "blue" },
  network: { Icon: Globe, tint: "teal" },
  proxy: { Icon: Shield, tint: "gray" },
  bandwidth: { Icon: Gauge, tint: "orange" },
  speed: { Icon: Gauge, tint: "orange" },
  queue: { Icon: ListOrdered, tint: "indigo" },
  cache: { Icon: Database, tint: "purple" },
  daemon: { Icon: Server, tint: "pink" },
  other: { Icon: Settings2, tint: "gray" },
  interface: { Icon: AppWindow, tint: "blue" },
  plugins: { Icon: Puzzle, tint: "purple" },
  label: { Icon: Tag, tint: "amber" },
  scheduler: { Icon: CalendarClock, tint: "indigo" },
  extractor: { Icon: Archive, tint: "orange" },
  execute: { Icon: Terminal, tint: "gray" },
  notifications: { Icon: Bell, tint: "red" },
  blocklist: { Icon: Ban, tint: "red" },
  autoadd: { Icon: FolderPlus, tint: "green" },
  ltconfig: { Icon: SlidersHorizontal, tint: "teal" },
};

function specForPage(pageId: string): Spec {
  return PAGE_ICONS[pageId] ?? { Icon: Puzzle, tint: "purple" };
}

export function PrefNavIcon({ pageId }: { pageId: string }) {
  const { Icon, tint } = specForPage(pageId);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]",
        TINTS[tint]
      )}
    >
      <Icon className="size-3" strokeWidth={2.4} />
    </span>
  );
}
