import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COLUMN_MAX_WIDTH,
  DETAILS_ABS_MAX,
  DETAILS_ABS_MAX_WIDTH,
  DETAILS_DEFAULT_DOCK,
  DETAILS_DEFAULT_HEIGHT,
  DETAILS_DEFAULT_WIDTH,
  DETAILS_DOCK_STORAGE_KEY,
  DETAILS_HEIGHT_STORAGE_KEY,
  DETAILS_MAX_RATIO,
  DETAILS_MAX_VH,
  DETAILS_MIN_HEIGHT,
  DETAILS_MIN_WIDTH,
  DETAILS_WIDTH_STORAGE_KEY,
  MAIN_MIN_WIDTH,
  SELECT_COLUMN_ID,
  SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  TABLE_MIN_HEIGHT,
  clampColumnWidth,
  clampDetailsHeight,
  clampDetailsWidth,
  clampSidebarWidth,
  columnWidthFor,
  defaultColumnWidth,
  minColumnWidth,
  emptyCollapsedGroups,
  parseStoredCollapsedGroups,
  parseStoredColumnWidths,
  parseStoredDetailsDock,
  parseStoredDetailsHeight,
  parseStoredDetailsWidth,
  parseStoredSidebarWidth,
  serializeCollapsedGroups,
  toggleCollapsedGroup,
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

assert.equal(SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY, "deluge-nova:sidebar-collapsed-groups");
assert.deepEqual([...emptyCollapsedGroups()], []);
assert.deepEqual([...parseStoredCollapsedGroups(null)], []);
assert.deepEqual([...parseStoredCollapsedGroups("")], []);
assert.deepEqual([...parseStoredCollapsedGroups("not-json")], []);
assert.deepEqual([...parseStoredCollapsedGroups("{}")], []);
assert.deepEqual([...parseStoredCollapsedGroups("[]")], []);
assert.deepEqual([...parseStoredCollapsedGroups(JSON.stringify(["state", "", 3, "labels"]))], [
  "state",
  "labels",
]);
assert.deepEqual(serializeCollapsedGroups(["labels", "state", "labels", ""]), ["labels", "state"]);
{
  const collapsed = toggleCollapsedGroup(new Set(), "trackers");
  assert.deepEqual([...collapsed], ["trackers"]);
  assert.deepEqual([...toggleCollapsedGroup(collapsed, "trackers")], []);
}

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

assert.equal(DETAILS_DOCK_STORAGE_KEY, "deluge-nova:details-dock");
assert.equal(DETAILS_WIDTH_STORAGE_KEY, "deluge-nova:details-width");
assert.equal(parseStoredDetailsDock(null), DETAILS_DEFAULT_DOCK);
assert.equal(parseStoredDetailsDock(""), "bottom");
assert.equal(parseStoredDetailsDock("bottom"), "bottom");
assert.equal(parseStoredDetailsDock("right"), "right");
assert.equal(parseStoredDetailsDock("side"), "bottom");

assert.equal(clampDetailsWidth(Number.NaN), DETAILS_DEFAULT_WIDTH);
assert.equal(clampDetailsWidth(50), DETAILS_MIN_WIDTH);
assert.equal(clampDetailsWidth(9000), DETAILS_ABS_MAX_WIDTH);
assert.equal(clampDetailsWidth(400), 400);
assert.equal(clampDetailsWidth(900, 1000), Math.round(1000 * DETAILS_MAX_RATIO));
{
  const container = DETAILS_MIN_WIDTH + MAIN_MIN_WIDTH + 40;
  assert.equal(clampDetailsWidth(900, 2000, container), container - MAIN_MIN_WIDTH);
}
assert.equal(clampDetailsWidth(800, 2000, 1000), 1000 - MAIN_MIN_WIDTH);
assert.equal(clampDetailsWidth(100, 1000, 400), DETAILS_MIN_WIDTH);

assert.equal(parseStoredDetailsWidth(null), DETAILS_DEFAULT_WIDTH);
assert.equal(parseStoredDetailsWidth(""), DETAILS_DEFAULT_WIDTH);
assert.equal(parseStoredDetailsWidth("not-a-number"), DETAILS_DEFAULT_WIDTH);
assert.equal(parseStoredDetailsWidth("400"), 400);
assert.equal(parseStoredDetailsWidth("12"), DETAILS_MIN_WIDTH);
assert.equal(parseStoredDetailsWidth("900", 1000), Math.round(1000 * DETAILS_MAX_RATIO));

{
  const here = dirname(fileURLToPath(import.meta.url));
  const shell = readFileSync(join(here, "../../components/app/torrent-shell.tsx"), "utf8");
  assert.match(shell, /variant="row"/);
  assert.match(shell, /Resize torrent details/);
  assert.match(shell, /loadDetailsHeight/);
  assert.match(shell, /saveDetailsHeight/);
  assert.match(shell, /resizeDetails/);
  assert.match(shell, /height - dy/);
  assert.match(shell, /loadDetailsWidth/);
  assert.match(shell, /saveDetailsWidth/);
  assert.match(shell, /loadDetailsDock/);
  assert.match(shell, /saveDetailsDock/);
  assert.match(shell, /resizeDetailsWidth/);
  assert.match(shell, /width - dx/);
  assert.match(shell, /edge="start"/);
  assert.match(shell, /bg-transparent/);
  assert.match(shell, /bg-sidebar-border/);
  assert.match(shell, /data-details-dock="right"/);
  assert.match(shell, /data-details-dock="bottom"/);
  assert.match(shell, /onDockChange=\{changeDetailsDock\}/);
  assert.match(shell, /!mobile && primary/);
  assert.doesNotMatch(shell, /h-\[min\(16rem,36vh\)\]/);

  const handle = readFileSync(join(here, "../../components/app/drag-resize-handle.tsx"), "utf8");
  assert.match(handle, /variant === "row"/);
  assert.match(handle, /ev\.clientY/);
  assert.match(handle, /cursor-row-resize/);
  assert.match(handle, /edge === "start"/);
  assert.match(handle, /left-0 w-2 -translate-x-1\/2/);
  assert.match(handle, /aria-orientation=\{vertical \? "horizontal" : "vertical"\}/);
}

console.log("ui-layout tests passed");
