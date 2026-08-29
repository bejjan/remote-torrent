import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

const brand = readFileSync(join(dir, "brand.tsx"), "utf8");
assert.match(brand, /<button/);
assert.match(brand, /min-w-0 truncate font-heading/);
assert.match(brand, /wordmarkClassName/);
assert.match(brand, /type="button"/);
assert.match(brand, /cursor-pointer/);
assert.match(brand, /About Nova/);
assert.match(brand, /onClick/);

const shell = readFileSync(join(dir, "torrent-shell.tsx"), "utf8");
assert.match(shell, /AboutDialog/);
assert.match(shell, /setAboutOpen\(true\)/);
assert.match(shell, /disabled:opacity-40/);
assert.match(shell, /core\.get_enabled_plugins/);

const dialog = readFileSync(join(dir, "about-dialog.tsx"), "utf8");
assert.match(dialog, /This UI/);
assert.match(dialog, /ABOUT_TAGLINE/);
assert.match(dialog, /core\.get_version|ABOUT_RPC|loadAboutInfo/);
assert.match(dialog, /GPL-3\.0|ABOUT_LICENSE/);
assert.match(dialog, /Deluge project|ABOUT_PROJECT_LABEL/);
assert.match(dialog, /ABOUT_TRANSMISSION_LABEL|Transmission project/);
assert.match(dialog, /DialogFooter/);
assert.match(dialog, /showCloseButton/);
assert.doesNotMatch(dialog, /lorem/i);

console.log("about-dialog tests passed");
