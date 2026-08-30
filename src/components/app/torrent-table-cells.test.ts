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
assert.match(table, /flex h-full min-w-0 items-center truncate/);
assert.match(table, /applyVisibleSelection/);
assert.match(table, /visibleSelectionState/);
assert.match(table, /border-separate border-spacing-0 text-sm/);
assert.doesNotMatch(table, /border-separate border-spacing-0 px-1\.5/);
assert.match(table, /width: "100%", minWidth: tableMinWidth/);
assert.match(table, /virtualRow\.index % 2 === 1/);
assert.match(table, /torrentRowClassName/);
assert.match(table, /\[&>td\]:bg-muted\/50/);
assert.match(table, /\[&>td\]:bg-primary\/10/);
assert.match(table, /rounded-tl-md/);
assert.match(table, /rounded-bl-md/);
assert.match(table, /\[&>td:first-child\]:border-l-\[0\.375rem\]/);
assert.match(table, /\[&>td:last-child\]:border-r-\[0\.375rem\]/);
assert.match(table, /bg-clip-padding/);
assert.match(table, /relative py-2 pr-2 pl-3\.5/);
assert.match(table, /last \? "pr-3\.5 pl-2" : "px-2"/);
assert.match(table, /ChevronUp/);
assert.match(table, /ChevronDown/);
assert.doesNotMatch(table, /▲/);
assert.doesNotMatch(table, /▼/);
assert.doesNotMatch(table, /cursor-pointer border-b hover:bg-muted\/50/);
assert.match(table, /TorrentColumnCell/);
assert.match(table, /case "name":/);
assert.match(table, /hit\(t\.name\)/);
assert.match(table, /HighlightText/);
assert.doesNotMatch(table, /dangerouslySetInnerHTML/);

assert.match(
  table,
  /className: cn\(\s*typed\.props\.className,[\s\S]*max-w-0 min-w-0 overflow-hidden align-middle text-ellipsis whitespace-nowrap/
);
assert.match(table, /children: <div className="flex h-full min-w-0 items-center truncate">\{typed\.props\.children\}<\/div>/);

assert.match(table, /flex min-w-0 items-center gap-2/);
assert.match(table, /h-1\.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black\/10 dark:bg-white\/15/);
assert.doesNotMatch(table, /min-w-8/);

assert.match(badge, /inline-flex max-w-full min-w-0 font-medium leading-none truncate/);
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
