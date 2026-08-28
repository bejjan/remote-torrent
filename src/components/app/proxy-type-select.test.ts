import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProxyTypeSelect } from "../../components/app/proxy-type-select";

function html(value: string | number) {
  return renderToStaticMarkup(createElement(ProxyTypeSelect, { value, onChange() {} }));
}

function selectedLabel(markup: string) {
  const match = markup.match(/data-slot="select-value"[^>]*>([^<]*)/);
  assert.ok(match, "SelectValue should render");
  return match[1].replace(/&#x27;/g, "'").replace(/&apos;/g, "'");
}

assert.equal(selectedLabel(html(0)), "None");
assert.equal(selectedLabel(html(1)), "Socksv4");
assert.equal(selectedLabel(html(2)), "Socksv5");
assert.equal(selectedLabel(html(3)), "Socksv5 with Auth");
assert.equal(selectedLabel(html(4)), "HTTP");
assert.equal(selectedLabel(html(5)), "HTTP with Auth");
assert.equal(selectedLabel(html("3")), "Socksv5 with Auth");

for (const n of [0, 1, 2, 3, 4, 5]) {
  assert.notEqual(selectedLabel(html(n)), String(n));
}

const dir = dirname(fileURLToPath(import.meta.url));
const dialog = readFileSync(join(dir, "preferences-dialog.tsx"), "utf8");
assert.match(dialog, /ProxyTypeSelect/);
assert.match(dialog, /proxy\.type/);

console.log("proxy-type-select tests passed");
