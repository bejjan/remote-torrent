import assert from "node:assert/strict";
import {
  REQUIRED_TORRENT_COLUMN_ID,
  TORRENT_COLUMN_ORDER_STORAGE_KEY,
  TORRENT_COLUMNS,
  applyColumnVisibility,
  defaultTorrentColumnOrder,
  defaultVisibleTorrentColumns,
  dropIndexFromX,
  isIdentityColumnDrop,
  moveColumnBefore,
  normalizeColumnOrder,
  parseStoredColumnOrder,
  parseStoredColumnVisibility,
  serializeTorrentColumnVisibility,
  visibleTorrentColumns,
} from "./torrent-columns";

const defaults = defaultVisibleTorrentColumns();

assert.equal(defaults.has("name"), true);
assert.equal(defaults.has("queue"), true);
assert.equal(defaults.has("size"), true);
assert.equal(defaults.has("progress"), true);
assert.equal(defaults.has("status"), true);
assert.equal(defaults.has("down"), true);
assert.equal(defaults.has("up"), true);
assert.equal(defaults.has("eta"), true);
assert.equal(defaults.has("ratio"), true);
assert.equal(defaults.has("avail"), false);
assert.equal(defaults.has("save_path"), false);

{
  const shown = visibleTorrentColumns(defaults).map((column) => column.id);
  assert.deepEqual(shown.slice(0, 3), ["queue", "name", "size"]);
  assert.ok(shown.includes("name"));
  assert.ok(!shown.includes("avail"));
}

{
  const hidden = applyColumnVisibility(defaults, "ratio", false);
  assert.equal(hidden.has("ratio"), false);
  assert.equal(hidden.has("name"), true);
}

{
  const onlyName = applyColumnVisibility(new Set(["name", "queue"]), "queue", false);
  assert.deepEqual([...onlyName], ["name"]);
}

{
  const cannotHideName = applyColumnVisibility(new Set(["name", "queue"]), "name", false);
  assert.equal(cannotHideName.has("name"), true);
}

{
  const added = applyColumnVisibility(defaults, "avail", true);
  assert.equal(added.has("avail"), true);
}

{
  const parsed = parseStoredColumnVisibility(JSON.stringify(["queue", "progress"]));
  assert.equal(parsed.has("name"), true);
  assert.equal(parsed.has("queue"), true);
  assert.equal(parsed.has("progress"), true);
  assert.equal(parsed.has("size"), false);
}

{
  assert.deepEqual(
    [...parseStoredColumnVisibility(null)].sort(),
    [...defaults].sort()
  );
  assert.deepEqual(
    [...parseStoredColumnVisibility("")].sort(),
    [...defaults].sort()
  );
  assert.deepEqual(
    [...parseStoredColumnVisibility("not-json")].sort(),
    [...defaults].sort()
  );
  assert.deepEqual(
    [...parseStoredColumnVisibility("[]")].sort(),
    [...defaults].sort()
  );
  assert.deepEqual(
    [...parseStoredColumnVisibility(JSON.stringify(["nope"]))].sort(),
    [...defaults].sort()
  );
}

{
  const serialized = serializeTorrentColumnVisibility(new Set(["ratio", "name", "queue"]));
  assert.deepEqual(serialized, ["queue", "name", "ratio"]);
  assert.equal(serialized[0] === REQUIRED_TORRENT_COLUMN_ID || serialized.includes("name"), true);
}

{
  const catalog = defaultTorrentColumnOrder();
  assert.equal(TORRENT_COLUMN_ORDER_STORAGE_KEY, "nova:torrent-column-order");
  assert.deepEqual(catalog, TORRENT_COLUMNS.map((column) => column.id));
  assert.deepEqual(normalizeColumnOrder(null), catalog);
  assert.deepEqual(parseStoredColumnOrder(null), catalog);
  assert.deepEqual(parseStoredColumnOrder(""), catalog);
  assert.deepEqual(parseStoredColumnOrder("not-json"), catalog);
  assert.deepEqual(parseStoredColumnOrder("{}"), catalog);
  assert.deepEqual(parseStoredColumnOrder("[]"), catalog);
}

{
  const parsed = parseStoredColumnOrder(JSON.stringify(["name", "queue", "nope", "name", "size"]));
  assert.deepEqual(parsed.slice(0, 3), ["name", "queue", "size"]);
  assert.ok(parsed.includes("progress"));
  assert.equal(parsed.length, TORRENT_COLUMNS.length);
  assert.equal(new Set(parsed).size, parsed.length);
}

{
  const moved = moveColumnBefore(["queue", "name", "size", "progress"], "name", "progress");
  assert.deepEqual(moved.slice(0, 5), ["queue", "size", "name", "progress", "status"]);
}

{
  const moved = moveColumnBefore(["queue", "name", "size"], "name", "queue");
  assert.equal(moved[0], "name");
  assert.equal(moved[1], "queue");
}

{
  const order = normalizeColumnOrder(["queue", "name", "size"]);
  assert.deepEqual(moveColumnBefore(order, "queue", "name"), order);
  assert.deepEqual(moveColumnBefore(order, "name", "name"), order);
}

{
  const moved = moveColumnBefore(["queue", "name", "size", "progress"], "name", null);
  assert.equal(moved[moved.length - 1], "name");
  assert.ok(!moved.slice(0, 3).includes("name"));
}

{
  const order = ["size", "avail", "name", "queue"] as const;
  const hidden = visibleTorrentColumns(new Set(["name", "size", "queue"]), order);
  assert.deepEqual(
    hidden.map((column) => column.id),
    ["size", "name", "queue"]
  );
  const shownAgain = visibleTorrentColumns(new Set(["name", "size", "queue", "avail"]), order);
  assert.deepEqual(
    shownAgain.map((column) => column.id),
    ["size", "avail", "name", "queue"]
  );
}

{
  const shown = visibleTorrentColumns(new Set(["name", "queue", "size"]), [
    "name",
    "size",
    "queue",
  ]);
  assert.deepEqual(
    shown.map((column) => column.id),
    ["name", "size", "queue"]
  );
}

assert.equal(dropIndexFromX([10, 30, 50], 9), 0);
assert.equal(dropIndexFromX([10, 30, 50], 10), 1);
assert.equal(dropIndexFromX([10, 30, 50], 40), 2);
assert.equal(dropIndexFromX([10, 30, 50], 80), 3);
assert.equal(dropIndexFromX([], 0), 0);

assert.equal(isIdentityColumnDrop(2, 2), true);
assert.equal(isIdentityColumnDrop(2, 3), true);
assert.equal(isIdentityColumnDrop(2, 1), false);
assert.equal(isIdentityColumnDrop(2, 4), false);

console.log("torrent-columns tests passed");
