import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "connection-manager.tsx"), "utf8");

assert.match(source, /TooltipTrigger/);
assert.match(source, /TooltipContent/);
assert.match(source, /aria-label="Connect"/);
assert.doesNotMatch(source, /HostActionBtn\s*\n\s*label="Connect"/);
assert.match(source, /label="Start"/);
assert.match(source, /label="Stop"/);
assert.match(source, /label="Edit"/);
assert.match(source, /label="Remove"/);
assert.match(source, /aria-label=\{label\}/);
assert.doesNotMatch(source, /<Button size="icon-sm"/);

assert.match(source, /const \[loaded, setLoaded\]/);
assert.match(source, /HostTableSkeleton/);
assert.match(source, /animate-pulse/);
assert.match(source, /Loading hosts/);
assert.match(source, /aria-busy=\{!loaded\}/);
assert.match(source, /No daemons yet\. Add a host to connect\./);
assert.match(source, /!loaded \? \(/);

assert.match(source, /web.edit_host/);
assert.match(source, /Edit daemon/);
assert.match(source, /openEdit/);
assert.match(source, /<Pencil \/>/);

assert.match(source, /--seeding/);
assert.match(source, /isHostConnected/);
assert.match(source, /\{!connected \? \(/);
assert.match(source, /variant="destructive"/);
assert.match(source, /status\.toLowerCase\(\) === "connected"/);
assert.match(source, /onConnecting\?\.\(\)/);
assert.match(source, /web.disconnect/);
assert.match(source, /onConnectFailed\?\.\(\)/);

console.log("connection-manager tests passed");
