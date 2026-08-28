import assert from "node:assert/strict";
import {
  REQUIRED_TORRENT_COLUMN_ID,
  applyColumnVisibility,
  defaultVisibleTorrentColumns,
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

console.log("torrent-columns tests passed");
