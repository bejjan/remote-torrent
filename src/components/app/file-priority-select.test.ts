import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FilePrioritySelect,
  filePriorityPresentation,
} from "../../components/app/file-priority-select";

assert.equal(filePriorityPresentation(0).label, "Skip");
assert.equal(filePriorityPresentation(1).label, "Low");
assert.equal(filePriorityPresentation(4).label, "Normal");
assert.equal(filePriorityPresentation(5).label, "High");
assert.equal(filePriorityPresentation(7).label, "High");
assert.equal(filePriorityPresentation("mixed", true).label, "Mixed");

function html(value: string | number, mixed = false) {
  return renderToStaticMarkup(
    createElement(FilePrioritySelect, { value, mixed, onChange() {} })
  );
}

function triggerLabel(markup: string) {
  const title = markup.match(/title="([^"]+)"/);
  const aria = markup.match(/aria-label="Priority: ([^"]+)"/);
  assert.ok(title, "icon button should expose a title");
  assert.ok(aria, "icon button should expose an aria-label");
  assert.equal(title[1], aria[1]);
  return title[1].replace(/&#x27;/g, "'").replace(/&apos;/g, "'");
}

assert.equal(triggerLabel(html(1)), "Low");
assert.equal(triggerLabel(html(4)), "Normal");
assert.equal(triggerLabel(html(5)), "High");
assert.equal(triggerLabel(html(7)), "High");
assert.equal(triggerLabel(html(0)), "Skip");
assert.equal(triggerLabel(html("mixed", true)), "Mixed");

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "file-priority-select.tsx"), "utf8");
assert.match(source, /DropdownMenu/);
assert.match(source, /DropdownMenuRadioGroup/);
assert.match(source, /CircleSlash/);
assert.match(source, /ChevronsDown/);
assert.match(source, /Minus/);
assert.match(source, /ChevronsUp/);
assert.match(source, /size="icon-sm"/);
assert.doesNotMatch(source, /SelectTrigger/);

console.log("file-priority-select tests passed");
