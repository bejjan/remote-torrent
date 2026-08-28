import assert from "node:assert/strict";
import {
  COLUMN_MAX_WIDTH,
  MAIN_MIN_WIDTH,
  SELECT_COLUMN_ID,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  clampColumnWidth,
  clampSidebarWidth,
  columnWidthFor,
  defaultColumnWidth,
  minColumnWidth,
  parseStoredColumnWidths,
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

console.log("ui-layout tests passed");
