import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "session-monitor.tsx"), "utf8");
const shell = readFileSync(join(dir, "torrent-shell.tsx"), "utf8");

assert.match(source, /"use client"/);
assert.match(source, /from "@\/components\/ui\/popover"/);
assert.match(source, /PopoverTrigger/);
assert.match(source, /PopoverContent/);
assert.match(source, /render=\{/);
assert.match(source, /formatConnectionCount/);
assert.doesNotMatch(source, /DropdownMenu/);
assert.doesNotMatch(source, /recharts|chart\.js|visx|nivo/i);
assert.match(source, /<polyline/);
assert.match(source, /sessionMonitorRateParts/);
assert.match(source, /sessionTransferTotals/);
assert.match(source, /data-session-monitor/);
assert.match(source, /DHT nodes/);
assert.match(source, /showDht/);
assert.match(source, /Downloaded/);
assert.match(source, /Uploaded/);
assert.match(source, /Connections/);
assert.match(source, /hidden xl:block/);
assert.match(source, /xl:hidden/);
assert.match(source, /xl:inline-flex/);
assert.doesNotMatch(source, /min-\[26rem\]:inline-flex/);
assert.match(source, /var\(--downloading\)/);
assert.match(source, /var\(--seeding\)/);
assert.match(source, /Activity monitor/);
assert.doesNotMatch(source, /Live rates from the current poll/);
assert.doesNotMatch(source, /PopoverDescription/);
assert.match(source, /onPointerMove/);
assert.match(source, /formatRate\(tick\)/);
assert.match(source, /sparklineLookbackLabel/);
assert.match(source, /sparklinePointerInPlot/);
assert.match(source, /now/);

const header = shell.slice(shell.indexOf("<header"), shell.indexOf("{error ?"));
assert.match(header, /<SessionMonitor/);
assert.match(shell, /pushRateSample|nextRateSamples/);
assert.match(shell, /isSessionMonitorChipVisible/);
assert.ok(
  header.lastIndexOf("<SearchField") < header.lastIndexOf("<SessionMonitor"),
  "centered search sits left of the stats chip"
);
assert.ok(
  header.lastIndexOf("<SessionMonitor") < header.lastIndexOf("<AddTorrentButton"),
  "stats chip sits in the right cluster with Add torrent"
);

console.log("session-monitor component tests passed");
