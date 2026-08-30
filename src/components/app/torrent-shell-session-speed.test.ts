import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(join(dir, "torrent-shell.tsx"), "utf8");

assert.match(shell, /holdLastSessionRates/);
assert.match(shell, /writeDocumentTitleIfChanged/);
assert.match(shell, /lastRatesRef/);
assert.doesNotMatch(shell, /stats\?\.download_rate \?\? 0/);
assert.doesNotMatch(shell, /stats\?\.upload_rate \?\? 0/);
assert.doesNotMatch(
  shell,
  /document\.title = sessionSpeedDocumentTitle/,
  "title writes go through writeDocumentTitleIfChanged"
);
assert.doesNotMatch(
  shell,
  /setShowSessionSpeed\(true\)/,
  "a failed web.get_config must not flip session speed back on"
);

const titleEffect = shell.slice(
  shell.indexOf("const speedTitle"),
  shell.indexOf("const toggleSort")
);
assert.match(titleEffect, /writeDocumentTitleIfChanged\(document, speedTitle\)/);
assert.match(titleEffect, /document\.title = DEFAULT_DOCUMENT_TITLE/);
assert.match(titleEffect, /}, \[\]\)/);
assert.doesNotMatch(titleEffect, /\[downloadRate, uploadRate, showSessionSpeed\]/);

const footer = shell.slice(
  shell.indexOf("<footer"),
  shell.indexOf("<Sheet open={sidebarOpen}")
);
assert.match(footer, /showSessionSpeed/);
assert.match(footer, /formatRate\(downloadRate\)/);
assert.match(footer, /formatRate\(uploadRate\)/);
assert.doesNotMatch(footer, /stats\s*&&\s*\(/);

assert.match(shell, /SessionSpeedFavicon/);
assert.match(
  shell,
  /<SessionSpeedFavicon downloadRate=\{downloadRate\} uploadRate=\{uploadRate\}/
);

console.log("torrent-shell session speed tests passed");
