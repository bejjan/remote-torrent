import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { torrentIsPaused } from "./torrent-pause-resume";
import type { TorrentState } from "./types";

const paused: TorrentState[] = ["Paused"];
const active: TorrentState[] = [
  "Downloading",
  "Seeding",
  "Checking",
  "Queued",
  "Error",
  "Allocating",
  "Moving",
];

for (const state of paused) {
  assert.equal(torrentIsPaused(state), true, `${state} should offer Resume`);
}
for (const state of active) {
  assert.equal(torrentIsPaused(state), false, `${state} should offer Pause`);
}
assert.equal(torrentIsPaused(null), false);
assert.equal(torrentIsPaused(undefined), false);

{
  const here = dirname(fileURLToPath(import.meta.url));
  const table = readFileSync(join(here, "../../components/app/torrent-table.tsx"), "utf8");
  const details = readFileSync(join(here, "../../components/app/torrent-details.tsx"), "utf8");
  assert.match(table, /torrentIsPaused\(torrent\.state\)/);
  assert.match(details, /torrentIsPaused\(detail\?\.state\)/);
  assert.match(table, /torrentIsPaused\(torrent\.state\) \?/);
  assert.match(details, /paused \?/);
}

console.log("torrent-pause-resume tests passed");
