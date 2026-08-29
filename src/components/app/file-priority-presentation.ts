import {
  ChevronsDown,
  ChevronsUp,
  CircleSlash,
  Equal,
  Minus,
  type LucideIcon,
} from "lucide-react";
import {
  canonicalizeFilePriority,
  type CanonicalFilePriority,
} from "@/lib/deluge/files-tree";

export const FILE_PRIORITY_ICONS = {
  0: CircleSlash,
  1: ChevronsDown,
  4: Minus,
  7: ChevronsUp,
} as const satisfies Record<CanonicalFilePriority, LucideIcon>;

/** Compact control labels (Skip / Low / Normal / High). */
export const FILE_PRIORITY_NAMES = {
  0: "Skip",
  1: "Low",
  4: "Normal",
  7: "High",
} as const satisfies Record<CanonicalFilePriority, string>;

export function filePriorityPresentation(value: string | number, mixed = false) {
  if (mixed) {
    return { key: "mixed", label: "Mixed", Icon: Equal };
  }
  const priority = canonicalizeFilePriority(Number(value));
  return {
    key: String(priority),
    label: FILE_PRIORITY_NAMES[priority],
    Icon: FILE_PRIORITY_ICONS[priority],
  };
}
