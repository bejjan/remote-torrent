import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(join(dir, "torrent-shell.tsx"), "utf8");
const brand = readFileSync(join(dir, "brand.tsx"), "utf8");
const login = readFileSync(join(dir, "login-screen.tsx"), "utf8");

const toolbar = shell.slice(
  shell.indexOf("const toolbar ="),
  shell.indexOf("const table =")
);
const header = shell.slice(
  shell.indexOf("<header"),
  shell.indexOf("{error ?")
);
const footer = shell.slice(
  shell.indexOf("<footer"),
  shell.indexOf("<Sheet open={sidebarOpen}")
);

assert.doesNotMatch(toolbar, /flex-wrap/, "toolbar stays on one row");
assert.match(toolbar, /flex shrink-0 items-center/);
assert.match(toolbar, /hidden md:inline-flex/);
assert.match(toolbar, /hidden lg:inline-flex/);
assert.match(toolbar, /Queue top/);
assert.match(toolbar, /Move storage/);
assert.match(toolbar, /Force recheck/);

assert.match(header, /flex min-h-10 min-w-0 shrink-0 items-center/);
assert.doesNotMatch(header, /flex-wrap/);
assert.match(header, /wordmarkClassName="hidden sm:inline"/);
assert.match(header, /min-w-0 max-w-xs flex-1 max-sm:hidden/);
assert.match(header, /aria-label="Search torrents"/);
assert.match(header, /sm:hidden/);
assert.match(header, /Close search/);
assert.match(header, /className="md:hidden"/);
assert.match(header, /className="lg:hidden"/);
assert.match(header, /Preferences/);
assert.match(header, /More actions/);
assert.match(header, /Queue top/);
assert.match(header, /Move storage/);
assert.match(header, /Force recheck/);

assert.match(footer, /overflow-x-auto/);
assert.match(footer, /flex-wrap/);
assert.match(footer, /showSessionSpeed/);
assert.match(footer, /sm:ml-auto/);

assert.match(shell, /show_session_speed|isWebSessionSpeedVisible|showSessionSpeed/);
assert.match(shell, /w-\[min\(18rem,100%\)\]/);
assert.match(shell, /data-torrent-search/);

assert.match(brand, /wordmarkClassName/);
assert.match(brand, /min-w-0 truncate font-heading/);
assert.match(brand, /shrink-0/);

assert.match(login, /minmax\(0,1fr\)/);
assert.match(login, /min-w-0 max-w-md/);
assert.match(login, /px-3 py-8 sm:px-4/);
assert.match(login, /aria-label="Client"/);
assert.match(login, /role="radiogroup"/);
assert.match(login, /"deluge" \? "Deluge" : "Transmission"/);
assert.match(login, /Transmission RPC URL/);

console.log("torrent-shell toolbar breakpoint tests passed");
