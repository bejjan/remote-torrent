import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const table = readFileSync(join(dir, "torrent-table.tsx"), "utf8");
const badge = readFileSync(join(dir, "state-badge.tsx"), "utf8");

assert.match(table, /table-fixed/);
assert.match(table, /TORRENT_ROW_HEIGHT = 36/);
assert.match(table, /whitespace-nowrap/);
assert.match(table, /overflow-hidden/);
assert.match(table, /text-ellipsis/);
assert.match(table, /max-w-0/);
assert.match(table, /min-w-0 truncate/);
assert.match(table, /TorrentColumnCell/);

assert.match(
  table,
  /className: cn\(\s*typed\.props\.className,[\s\S]*max-w-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap/
);
assert.match(table, /children: <div className="min-w-0 truncate">\{typed\.props\.children\}<\/div>/);

assert.match(table, /flex min-w-0 items-center gap-2/);
assert.match(table, /h-1\.5 min-w-0 flex-1 overflow-hidden rounded-full/);
assert.doesNotMatch(table, /min-w-8/);

assert.match(badge, /inline-block max-w-full min-w-0 font-medium truncate/);
assert.match(badge, /inline-flex max-w-full min-w-0 cursor-help/);

console.log("torrent-table cell truncation tests passed");
