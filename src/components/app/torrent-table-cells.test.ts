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

const emptyState = table.slice(table.indexOf("if (torrents.length === 0)"), table.indexOf("const dragFromIndex"));
assert.match(emptyState, /const query = search\.trim\(\)/);
assert.match(emptyState, /torrentSearchEmptyTitle\(search\)/);
assert.match(emptyState, /TORRENT_SEARCH_EMPTY_HINT/);
assert.match(emptyState, /TORRENT_FILTER_EMPTY_TITLE/);
assert.match(emptyState, /TORRENT_FILTER_EMPTY_HINT/);
assert.doesNotMatch(emptyState, /No torrents match this view/);
assert.match(emptyState, /query \? null : \(/);

console.log("torrent-table cell truncation tests passed");
