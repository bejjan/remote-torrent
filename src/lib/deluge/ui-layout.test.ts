import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COLUMN_MAX_WIDTH,
  DETAILS_ABS_MAX,
  DETAILS_DEFAULT_HEIGHT,
  DETAILS_HEIGHT_STORAGE_KEY,
  DETAILS_MAX_VH,
  DETAILS_MIN_HEIGHT,
  MAIN_MIN_WIDTH,
  SELECT_COLUMN_ID,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  TABLE_MIN_HEIGHT,
  clampColumnWidth,
  clampDetailsHeight,
  clampSidebarWidth,
  columnWidthFor,
  defaultColumnWidth,
  minColumnWidth,
  parseStoredColumnWidths,
  parseStoredDetailsHeight,
  parseStoredSidebarWidth,
} from "./ui-layout";

assert.equal(clampSidebarWidth(Number.NaN), SIDEBAR_DEFAULT_WIDTH);
assert.equal(clampSidebarWidth(80), SIDEBAR_MIN_WIDTH);
assert.equal(clampSidebarWidth(900), SIDEBAR_MAX_WIDTH);
assert.equal(clampSidebarWidth(200), 200);

{
  const container = SIDEBAR_MIN_WIDTH + MAIN_MIN_WIDTH + 40;
  assert.equal(clampSidebarWidth(480, container), container - MAIN_MIN_WIDTH);
}

assert.equal(parseStoredSidebarWidth(null), SIDEBAR_DEFAULT_WIDTH);
assert.equal(parseStoredSidebarWidth(""), SIDEBAR_DEFAULT_WIDTH);
assert.equal(parseStoredSidebarWidth("not-a-number"), SIDEBAR_DEFAULT_WIDTH);
assert.equal(parseStoredSidebarWidth("240"), 240);
assert.equal(parseStoredSidebarWidth("12"), SIDEBAR_MIN_WIDTH);

assert.equal(clampColumnWidth(Number.NaN, "size"), defaultColumnWidth("size"));
assert.equal(clampColumnWidth(10, "size"), minColumnWidth("size"));
assert.equal(clampColumnWidth(2000, "name"), COLUMN_MAX_WIDTH);
assert.equal(clampColumnWidth(20, SELECT_COLUMN_ID), minColumnWidth(SELECT_COLUMN_ID));
assert.equal(clampColumnWidth(20, "name"), minColumnWidth("name"));
assert.equal(clampColumnWidth(20, "queue"), minColumnWidth("queue"));

assert.deepEqual(parseStoredColumnWidths(null), {});
assert.deepEqual(parseStoredColumnWidths(""), {});
assert.deepEqual(parseStoredColumnWidths("[]"), {});
assert.deepEqual(parseStoredColumnWidths("not-json"), {});
assert.deepEqual(parseStoredColumnWidths(JSON.stringify({ name: 320, size: 10 })), {
  name: 320,
  size: minColumnWidth("size"),
});
assert.deepEqual(parseStoredColumnWidths(JSON.stringify({ name: "wide" })), {});

assert.equal(columnWidthFor("name", {}), defaultColumnWidth("name"));
assert.equal(columnWidthFor("name", { name: 400 }), 400);
assert.equal(defaultColumnWidth("unknown-col"), 100);

assert.equal(DETAILS_HEIGHT_STORAGE_KEY, "deluge-nova:details-height");
assert.equal(clampDetailsHeight(Number.NaN), DETAILS_DEFAULT_HEIGHT);
assert.equal(clampDetailsHeight(50), DETAILS_MIN_HEIGHT);
assert.equal(clampDetailsHeight(9000), DETAILS_ABS_MAX);
assert.equal(clampDetailsHeight(200), 200);
assert.equal(clampDetailsHeight(900, 1000), Math.round(1000 * DETAILS_MAX_VH));
assert.equal(clampDetailsHeight(400, 1000, 400), 400 - TABLE_MIN_HEIGHT);
assert.equal(clampDetailsHeight(50, 1000, 400), DETAILS_MIN_HEIGHT);

assert.equal(parseStoredDetailsHeight(null), DETAILS_DEFAULT_HEIGHT);
assert.equal(parseStoredDetailsHeight(""), DETAILS_DEFAULT_HEIGHT);
assert.equal(parseStoredDetailsHeight("not-a-number"), DETAILS_DEFAULT_HEIGHT);
assert.equal(parseStoredDetailsHeight("200"), 200);
assert.equal(parseStoredDetailsHeight("12"), DETAILS_MIN_HEIGHT);
assert.equal(parseStoredDetailsHeight("900", 1000), Math.round(1000 * DETAILS_MAX_VH));

{
  const here = dirname(fileURLToPath(import.meta.url));
  const shell = readFileSync(join(here, "../../components/app/torrent-shell.tsx"), "utf8");
  assert.match(shell, /variant="row"/);
  assert.match(shell, /Resize torrent details/);
  assert.match(shell, /loadDetailsHeight/);
  assert.match(shell, /saveDetailsHeight/);
  assert.match(shell, /resizeDetails/);
  assert.match(shell, /height - dy/);
  assert.doesNotMatch(shell, /h-\[min\(16rem,36vh\)\]/);

  const handle = readFileSync(join(here, "../../components/app/drag-resize-handle.tsx"), "utf8");
  assert.match(handle, /variant === "row"/);
  assert.match(handle, /ev\.clientY/);
  assert.match(handle, /cursor-row-resize/);
  assert.match(handle, /aria-orientation=\{vertical \? "horizontal" : "vertical"\}/);
}

console.log("ui-layout tests passed");
