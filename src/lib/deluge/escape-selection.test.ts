import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DISMISSIBLE_OVERLAY_SELECTOR,
  decideEscapeSelectionAction,
  hasOpenDismissibleOverlay,
  type EscapeSelectionInput,
} from "./escape-selection";

const here = dirname(fileURLToPath(import.meta.url));

function decide(partial: Partial<EscapeSelectionInput> & Pick<EscapeSelectionInput, "targetKind">) {
  return decideEscapeSelectionAction({
    key: "Escape",
    overlayOpen: false,
    search: "",
    selectedCount: 2,
    hasActiveId: true,
    ...partial,
  });
}

assert.equal(
  decide({ key: "a", targetKind: "other" }),
  "none",
  "non-Escape keys are ignored"
);
assert.equal(
  decide({ targetKind: "other", defaultPrevented: true }),
  "none",
  "already-handled Escape is ignored"
);
assert.equal(
  decide({ targetKind: "other", overlayOpen: true }),
  "none",
  "open dialog/menu keeps selection"
);
assert.equal(
  decide({ targetKind: "search", search: "ubuntu", overlayOpen: true }),
  "none",
  "overlay wins over search clear"
);

assert.equal(
  decide({ targetKind: "search", search: "ubuntu" }),
  "clear-search",
  "focused non-empty search clears the query first"
);
assert.equal(
  decide({ targetKind: "search", search: "", selectedCount: 3, hasActiveId: true }),
  "clear-selection",
  "empty search still clears torrent selection"
);
assert.equal(
  decide({ targetKind: "input", search: "", selectedCount: 3 }),
  "none",
  "other text fields keep Escape"
);

assert.equal(
  decide({ targetKind: "other", selectedCount: 1, hasActiveId: false }),
  "clear-selection"
);
assert.equal(
  decide({ targetKind: "other", selectedCount: 0, hasActiveId: true }),
  "clear-selection",
  "details activeId clears even with an empty Set"
);
assert.equal(
  decide({ targetKind: "other", selectedCount: 0, hasActiveId: false }),
  "none"
);

assert.equal(
  hasOpenDismissibleOverlay({
    querySelector(selector: string) {
      assert.equal(selector, DISMISSIBLE_OVERLAY_SELECTOR);
      return { slot: "dialog-content" };
    },
  } as unknown as ParentNode),
  true
);
assert.equal(
  hasOpenDismissibleOverlay({
    querySelector() {
      return null;
    },
  } as unknown as ParentNode),
  false
);

assert.match(DISMISSIBLE_OVERLAY_SELECTOR, /data-slot="dialog-content"\]\[data-open\]/);
assert.match(DISMISSIBLE_OVERLAY_SELECTOR, /data-slot="select-content"\]\[data-open\]/);
assert.match(DISMISSIBLE_OVERLAY_SELECTOR, /data-slot="dropdown-menu-content"/);
assert.match(DISMISSIBLE_OVERLAY_SELECTOR, /data-slot="context-menu-content"/);
assert.match(DISMISSIBLE_OVERLAY_SELECTOR, /data-slot="sheet-content"/);

const shellSource = readFileSync(join(here, "../../components/app/torrent-shell.tsx"), "utf8");
assert.match(shellSource, /decideEscapeSelectionAction/);
assert.match(shellSource, /hasOpenDismissibleOverlay/);
assert.match(shellSource, /window\.addEventListener\("keydown"/);
assert.match(shellSource, /capture:\s*true/);
assert.match(shellSource, /setSelected\(new Set\(\)\)/);
assert.match(shellSource, /setActiveId\(null\)/);
assert.match(shellSource, /data-torrent-search/);

console.log("escape-selection tests passed");
