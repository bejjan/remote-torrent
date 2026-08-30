import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "pref-nav-icon.tsx"), "utf8");
const dialog = readFileSync(join(dir, "preferences-dialog.tsx"), "utf8");
const transmission = readFileSync(join(dir, "transmission-preferences.tsx"), "utf8");
const qbittorrent = readFileSync(join(dir, "qbittorrent-preferences.tsx"), "utf8");

assert.match(source, /downloads/);
assert.match(source, /proxy/);
assert.match(source, /ltconfig/);
assert.match(source, /FolderDown/);
assert.match(source, /rounded-\[5px\]/);
assert.match(dialog, /PrefNavIcon/);
assert.match(transmission, /PrefNavIcon/);
assert.match(qbittorrent, /PrefNavIcon/);

console.log("pref-nav-icon tests passed");
