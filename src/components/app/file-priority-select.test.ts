import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "file-priority-select.tsx"), "utf8");
const presentation = readFileSync(join(dir, "file-priority-presentation.ts"), "utf8");

assert.match(source, /DropdownMenu/);
assert.match(source, /DropdownMenuRadioGroup/);
assert.match(source, /DropdownMenuRadioItem/);
assert.match(source, /filePriorityPresentation/);
assert.match(source, /size="icon-sm"/);
assert.match(source, /variant="ghost"/);
assert.match(source, /title=\{current\.label\}/);
assert.match(source, /aria-label=\{`Priority: \$\{current\.label\}`\}/);
assert.match(source, /disabled=\{disabled\}/);
assert.doesNotMatch(source, /SelectTrigger/);
assert.doesNotMatch(source, /SelectValue/);

assert.match(presentation, /CircleSlash/);
assert.match(presentation, /ChevronsDown/);
assert.match(presentation, /Minus/);
assert.match(presentation, /ChevronsUp/);
assert.match(presentation, /0: "Skip"/);
assert.match(presentation, /1: "Low"/);
assert.match(presentation, /4: "Normal"/);
assert.match(presentation, /7: "High"/);
assert.match(presentation, /label: "Mixed"/);
assert.match(presentation, /canonicalizeFilePriority/);

console.log("file-priority-select tests passed");
