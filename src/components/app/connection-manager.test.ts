import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "connection-manager.tsx"), "utf8");

assert.match(source, /TooltipTrigger/);
assert.match(source, /TooltipContent/);
assert.match(source, /label="Connect"/);
assert.match(source, /label="Start"/);
assert.match(source, /label="Stop"/);
assert.match(source, /label="Remove"/);
assert.match(source, /aria-label=\{label\}/);
assert.doesNotMatch(source, /<Button size="icon-sm"/);

console.log("connection-manager tests passed");
