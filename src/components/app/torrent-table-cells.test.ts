import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { torrentRowClassName, torrentRowHighlightClassName } from "./torrent-table.tsx";

const dir = dirname(fileURLToPath(import.meta.url));
const table = readFileSync(join(dir, "torrent-table.tsx"), "utf8");
const badge = readFileSync(join(dir, "state-badge.tsx"), "utf8");

const unstriped = torrentRowClassName({ striped: false, selected: false });
const striped = torrentRowClassName({ striped: true, selected: false });
const selected = torrentRowHighlightClassName({ striped: true, selected: true });
const selectedMid = torrentRowHighlightClassName({
  striped: false,
  selected: true,
  selectedAbove: true,
  selectedBelow: true,
});
const selectedTop = torrentRowHighlightClassName({
  striped: false,
  selected: true,
  selectedBelow: true,
});
const selectedBottom = torrentRowHighlightClassName({
  striped: false,
  selected: true,
  selectedAbove: true,
});
const stripedHighlight = torrentRowHighlightClassName({ striped: true, selected: false });
const unstripedHighlight = torrentRowHighlightClassName({ striped: false, selected: false });

assert.match(unstriped, /relative isolate/);
assert.match(striped, /\[transform:translateZ\(0\)\]/);
assert.doesNotMatch(unstriped, /rounded-/);
assert.doesNotMatch(striped, /rounded-/);
assert.doesNotMatch(unstriped, /\[&>td:first-child\]:rounded/);
assert.doesNotMatch(striped, /\[&>td\]:bg-muted/);
assert.doesNotMatch(striped, /\[&>td\]:bg-primary/);
assert.doesNotMatch(unstriped, /border-l-|border-r-/);
assert.doesNotMatch(stripedHighlight, /border-l-|border-r-/);

assert.match(stripedHighlight, /(?:^|\s)rounded-md(?:\s|$)/);
assert.match(unstripedHighlight, /(?:^|\s)rounded-md(?:\s|$)/);
assert.match(selected, /(?:^|\s)rounded-md(?:\s|$)/);
assert.match(selected, /bg-primary\/10/);
assert.match(stripedHighlight, /bg-muted\/50/);
assert.match(unstripedHighlight, /group-hover:bg-muted\/70/);
assert.doesNotMatch(unstripedHighlight, /(?:^|\s)bg-muted\/50(?:\s|$)/);
assert.match(selectedMid, /rounded-none/);
assert.doesNotMatch(selectedMid, /rounded-(?:md|t-md|b-md)\b/);
assert.match(selectedTop, /rounded-t-md/);
assert.match(selectedBottom, /rounded-b-md/);
assert.doesNotMatch(stripedHighlight, /rounded-(?:l|r|tl|tr|bl|br)-md/);
assert.doesNotMatch(stripedHighlight, /rounded-sm|rounded-full|rounded-\[/);

assert.match(table, /table-fixed/);
assert.match(table, /TORRENT_ROW_HEIGHT = 36/);
assert.match(table, /whitespace-nowrap/);
assert.match(table, /overflow-hidden/);
assert.match(table, /text-ellipsis/);
assert.match(table, /max-w-0/);
assert.match(table, /isProgress \? "flex h-full w-full items-center" : "truncate"/);
assert.doesNotMatch(table, /flex h-full min-w-0 items-center/);
assert.match(table, /applyVisibleSelection/);
assert.match(table, /visibleSelectionState/);
assert.match(table, /border-separate border-spacing-0 text-sm/);
assert.doesNotMatch(table, /border-separate border-spacing-0 px-1\.5/);
assert.match(table, /style=\{\{ width: tableMinWidth \}\}/);
assert.doesNotMatch(table, /width: "100%"/);
assert.doesNotMatch(table, /minWidth: tableMinWidth/);
assert.match(table, /virtualRow\.index % 2 === 1/);
assert.match(table, /torrentRowClassName/);
assert.match(table, /torrentRowHighlightClassName/);
assert.match(table, /data-row-highlight/);
assert.match(table, /absolute inset-y-0 left-1\.5 right-1\.5/);
assert.match(table, /bg-muted\/50/);
assert.match(table, /bg-primary\/10 group-hover:bg-primary\/15/);
assert.doesNotMatch(table, /\[&>td\]:bg-muted\/50/);
assert.doesNotMatch(table, /\[&>td\]:bg-primary\/10/);
assert.doesNotMatch(table, /\[&>td:first-child\]:rounded/);
assert.doesNotMatch(table, /\[&>td:last-child\]:rounded/);
assert.doesNotMatch(table, /rounded-\[10px_4px\]|rounded-sm|rounded-\[4px\]/);
assert.doesNotMatch(table, /hover:\[&>td:first-child\]:rounded/);
assert.doesNotMatch(table, /border-l-\[0\.375rem\]|border-r-\[0\.375rem\]/);
assert.doesNotMatch(table, /\[&>td:first-child\]:border-l/);
assert.doesNotMatch(table, /\[&>td:last-child\]:border-r/);
assert.doesNotMatch(table, /\[&>td:nth-last-child/);
assert.doesNotMatch(table, /bg-clip-padding/);
assert.match(table, /overflow-hidden py-1\.5 pr-2 pl-3\.5 whitespace-nowrap/);
assert.match(table, /last && "pr-3\.5"/);
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
assert.doesNotMatch(table, /numeric=\{column\.numeric\}/);
assert.doesNotMatch(table, /numeric && "font-mono tabular"/);
assert.doesNotMatch(table, /numeric && "font-mono text-xs tabular"/);
assert.match(table, /column\.numeric && "font-mono text-xs"/);
assert.match(table, /px-2 py-1\.5 tabular/);
assert.match(table, /case "name":\s*return <td className="px-2 py-1\.5 font-medium">/);
assert.match(table, /case "status":\s*return \(\s*<td className="px-2 py-1\.5">/);
assert.match(table, /case "label":\s*return <td className="px-2 py-1\.5 text-muted-foreground">/);
assert.match(table, /case "tracker":\s*return \(\s*<td className="px-2 py-1\.5 text-muted-foreground">/);
assert.match(table, /case "auto_managed":\s*return \(\s*<td className="px-2 py-1\.5 text-muted-foreground">/);
assert.doesNotMatch(table, /<StateBadge[^/\n]*font-mono/);

assert.match(
  table,
  /className: cn\(\s*typed\.props\.className,[\s\S]*max-w-0 min-w-0 overflow-hidden align-middle/
);
assert.match(table, /const isProgress = column\.id === "progress"/);
assert.match(table, /!isProgress && "text-ellipsis whitespace-nowrap"/);
assert.match(table, /isProgress \? "flex h-full w-full items-center" : "truncate"/);

assert.match(table, /flex min-w-0 w-full flex-1 items-center gap-2/);
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
