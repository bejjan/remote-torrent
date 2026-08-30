import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "session-speed-favicon.tsx"), "utf8");
const shell = readFileSync(join(dir, "torrent-shell.tsx"), "utf8");
const login = readFileSync(join(dir, "login-screen.tsx"), "utf8");

assert.match(source, /"use client"/);
assert.match(source, /holdLastSessionRates|downloadRate|uploadRate/);
assert.match(source, /drawSessionFavicon/);
assert.match(source, /toDataURL/);
assert.match(source, /restoreStaticFavicon/);
assert.match(source, /return null/);
assert.match(shell, /<SessionSpeedFavicon downloadRate=\{downloadRate\} uploadRate=\{uploadRate\}/);
assert.doesNotMatch(login, /SessionSpeedFavicon/);

console.log("session-speed-favicon tests passed");
