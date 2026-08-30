import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "session-progress-favicon.tsx"), "utf8");
const shell = readFileSync(join(dir, "torrent-shell.tsx"), "utf8");
const login = readFileSync(join(dir, "login-screen.tsx"), "utf8");

assert.match(source, /"use client"/);
assert.match(source, /progress/);
assert.match(source, /drawSessionFavicon/);
assert.match(source, /toDataURL/);
assert.match(source, /restoreStaticFavicon/);
assert.match(source, /return null/);
assert.doesNotMatch(source, /downloadRate|uploadRate|sessionFaviconOverlayLines/);
assert.match(shell, /<SessionProgressFavicon progress=\{faviconProgress\}/);
assert.match(shell, /sessionFaviconDownloadProgress/);
assert.doesNotMatch(shell, /SessionSpeedFavicon/);
assert.doesNotMatch(login, /SessionProgressFavicon|SessionSpeedFavicon/);

console.log("session-progress-favicon tests passed");
