import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(join(dir, "torrent-shell.tsx"), "utf8");
const table = readFileSync(join(dir, "torrent-table.tsx"), "utf8");
const brand = readFileSync(join(dir, "brand.tsx"), "utf8");
const login = readFileSync(join(dir, "login-screen.tsx"), "utf8");

const header = shell.slice(
  shell.indexOf("<header"),
  shell.indexOf("{error ?")
);
const footer = shell.slice(
  shell.indexOf("<footer"),
  shell.indexOf("<Sheet open={sidebarOpen}")
);
const addBtn = shell.slice(
  shell.indexOf("function AddTorrentButton"),
  shell.indexOf("function AddTorrentButton") + 500
);

assert.doesNotMatch(shell, /const toolbar =/);
assert.doesNotMatch(header, /flex-wrap/);
assert.match(header, /flex min-h-10 min-w-0 shrink-0 items-center/);
assert.match(header, /wordmarkClassName="hidden sm:inline"/);
assert.match(header, /min-w-0 max-w-xs flex-1 max-sm:hidden/);
assert.match(header, /aria-label="Search torrents"/);
assert.match(header, /sm:hidden/);
assert.match(header, /Close search/);
assert.match(header, /<AddTorrentButton/);
assert.ok(
  header.lastIndexOf("<SearchField") < header.lastIndexOf("<AddTorrentButton"),
  "Add torrent sits after search"
);
assert.ok(
  header.lastIndexOf('aria-label="Search torrents"') < header.lastIndexOf("<AddTorrentButton"),
  "Add torrent sits after the mobile search icon"
);

assert.match(addBtn, /<Button className="h-8 min-w-0 shrink"/);
assert.match(addBtn, /<Plus \/>/);
assert.match(addBtn, /\{label\}/);
assert.match(addBtn, />Add</);
assert.match(addBtn, /title=\{label\}/);
assert.doesNotMatch(addBtn, /Add torrent…/);
assert.doesNotMatch(addBtn, /variant=/);
assert.doesNotMatch(addBtn, /size=/);
assert.doesNotMatch(addBtn, /disabled/);
assert.match(shell, /className="h-8 min-w-0 pl-7"/);
assert.ok(
  shell.includes('className="h-8 min-w-0 pl-7"') && shell.includes('className="h-8 min-w-0 shrink"'),
  "Search input and Add torrent share h-8"
);

assert.doesNotMatch(header, /Queue top/);
assert.doesNotMatch(header, /Queue up/);
assert.doesNotMatch(header, /Queue down/);
assert.doesNotMatch(header, /Queue bottom/);
assert.doesNotMatch(header, /Move storage/);
assert.doesNotMatch(header, /Force recheck/);
assert.doesNotMatch(header, /label="Pause"/);
assert.doesNotMatch(header, /label="Resume"/);
assert.doesNotMatch(header, /label="Remove"/);
assert.doesNotMatch(header, /className="md:hidden"/);
assert.doesNotMatch(header, /className="lg:hidden"/);
assert.doesNotMatch(header, /hidden md:inline-flex/);
assert.doesNotMatch(header, /hidden lg:inline-flex/);

assert.match(header, /Preferences…/);
assert.match(header, /Connection Manager…/);
assert.match(header, /Open hosts page/);
assert.doesNotMatch(header, /Open hosts page…/);
assert.match(header, /aria-label="Menu"/);
assert.ok(
  header.indexOf('aria-label="Menu"') < header.indexOf("<Brand"),
  "hamburger sits left of the logo"
);
assert.match(header, /ThemeMenuSub/);
assert.match(header, /About Nova/);
assert.doesNotMatch(header, /About Nova…/);
assert.ok(
  header.indexOf("About Nova") < header.indexOf("Preferences…"),
  "About Nova sits above Preferences in the hamburger"
);
assert.doesNotMatch(header, /More actions/);
assert.doesNotMatch(header, /ThemeToggle/);

assert.match(table, /<Pause \/> Pause/);
assert.match(table, /<Play \/> Resume/);
assert.match(table, /<Trash2 \/> Remove/);
assert.match(table, /<ChevronsUp \/> Queue top/);
assert.match(table, /<ArrowUp \/> Queue up/);
assert.match(table, /<ArrowDown \/> Queue down/);
assert.match(table, /<ChevronsDown \/> Queue bottom/);
assert.match(table, /<FolderInput \/> Move storage…/);
assert.match(table, /<RefreshCw \/> Force recheck/);

assert.match(footer, /overflow-x-auto/);
assert.match(footer, /flex-wrap/);
assert.match(footer, /showSessionSpeed/);
assert.match(footer, /sm:ml-auto/);

assert.match(shell, /show_session_speed|isWebSessionSpeedVisible|showSessionSpeed/);
assert.match(shell, /w-\[min\(18rem,100%\)\]/);
assert.match(shell, /data-torrent-search/);
assert.match(shell, /decideTorrentSearchFindAction/);
assert.match(shell, /decideAddTorrentShortcutAction/);
assert.match(shell, /isMacPlatform\(navigator\.userAgent\)/);
assert.match(shell, /setSearchExpanded\(true\)/);
assert.match(shell, /torrentSearchShortcutTitle/);
assert.match(shell, /torrentSearchPlaceholder/);
assert.match(shell, /addTorrentShortcutTitle/);
assert.match(shell, /DEFAULT_TORRENT_SEARCH_PLACEHOLDER/);
assert.match(shell, /DEFAULT_ADD_TORRENT_LABEL/);
assert.match(shell, /setSearchPlaceholder\(torrentSearchPlaceholder/);
assert.match(shell, /setAddTorrentLabel\(addTorrentShortcutTitle/);
assert.match(shell, /placeholder=\{placeholder\}/);
assert.match(shell, /focusVisibleTorrentSearch/);
assert.match(shell, /setAddOpen\(true\)/);
assert.doesNotMatch(shell, /placeholder="Search torrents"/);
assert.doesNotMatch(shell, /⌥⌘N|Ctrl\+Alt\+N|⌘⇧N|Ctrl\+Shift\+N/);
assert.match(
  table,
  /if \(loading && !hasUi\)/,
  "table first-paint is loading with no UI yet"
);
assert.match(
  shell,
  /const sidebarLoading = loading && !ui/,
  "sidebar loading matches the table first-paint window"
);
assert.equal(
  [...shell.matchAll(/loading=\{sidebarLoading\}/g)].length,
  2,
  "desktop sidebar and mobile filter sheet share the same loading flag"
);

assert.match(brand, /wordmarkClassName/);
assert.match(brand, /min-w-0 truncate font-heading/);
assert.match(brand, /shrink-0/);
assert.match(brand, /\/logo\.png/);
assert.doesNotMatch(brand, /bg-primary text-primary-foreground/);

assert.match(login, /minmax\(0,1fr\)/);
assert.match(login, /min-w-0 max-w-md/);
assert.match(login, /px-3 py-8 sm:px-4/);
assert.match(login, /aria-label="Client"/);
assert.match(login, /role="radiogroup"/);
assert.match(login, /"deluge" \? "Deluge" : "Transmission"/);
assert.match(login, /Transmission RPC URL/);

console.log("torrent-shell toolbar breakpoint tests passed");
