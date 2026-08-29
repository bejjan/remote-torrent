/** Overlay popups that should consume Escape before torrent selection clears. */
export const DISMISSIBLE_OVERLAY_SELECTOR = [
  '[data-slot="dialog-content"][data-open]',
  '[data-slot="alert-dialog-content"][data-open]',
  '[data-slot="sheet-content"][data-open]',
  '[data-slot="dropdown-menu-content"][data-open]',
  '[data-slot="context-menu-content"][data-open]',
  '[data-slot="select-content"][data-open]',
  '[data-slot="popover-content"][data-open]',
].join(",");

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "radio",
  "file",
  "reset",
  "submit",
  "range",
  "color",
  "hidden",
  "image",
]);

export type EscapeTargetKind = "search" | "input" | "other";

export type EscapeSelectionAction = "none" | "clear-search" | "clear-selection";

export type EscapeSelectionInput = {
  key: string;
  defaultPrevented?: boolean;
  overlayOpen: boolean;
  targetKind: EscapeTargetKind;
  search: string;
  selectedCount: number;
  hasActiveId: boolean;
};

export function hasOpenDismissibleOverlay(root: ParentNode): boolean {
  return Boolean(root.querySelector(DISMISSIBLE_OVERLAY_SELECTOR));
}

export function isEditableField(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest("input, textarea, select, [contenteditable=true], [contenteditable='']");
  if (!el) return false;
  if (el instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has((el.type || "text").toLowerCase());
  }
  return true;
}

export function classifyEscapeTarget(
  target: EventTarget | null,
  searchSelector = "[data-torrent-search]"
): EscapeTargetKind {
  if (!(target instanceof Element)) return "other";
  if (target.closest(searchSelector)) return "search";
  if (isEditableField(target)) return "input";
  return "other";
}

/**
 * Escape closes dialogs/menus first (caller skips when overlayOpen).
 * Search: non-empty query clears search; otherwise clear torrent selection.
 * Other text fields keep Escape. Otherwise clear selection + details id.
 */
export function decideEscapeSelectionAction(input: EscapeSelectionInput): EscapeSelectionAction {
  if (input.key !== "Escape") return "none";
  if (input.defaultPrevented) return "none";
  if (input.overlayOpen) return "none";
  if (input.targetKind === "search" && input.search.length > 0) return "clear-search";
  if (input.targetKind === "input") return "none";
  if (input.selectedCount > 0 || input.hasActiveId) return "clear-selection";
  return "none";
}
