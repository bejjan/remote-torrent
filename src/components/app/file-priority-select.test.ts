import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FilePrioritySelect } from "../../components/app/file-priority-select";

function html(value: string | number, mixed = false) {
  return renderToStaticMarkup(
    createElement(FilePrioritySelect, { value, mixed, onChange() {} })
  );
}

function selectedLabel(markup: string) {
  const match = markup.match(/data-slot="select-value"[^>]*>([^<]*)/);
  assert.ok(match, "SelectValue should render");
  return match[1].replace(/&#x27;/g, "'").replace(/&apos;/g, "'");
}

assert.equal(selectedLabel(html(1)), "Low");
assert.equal(selectedLabel(html(4)), "Normal");
assert.equal(selectedLabel(html(5)), "High");
assert.equal(selectedLabel(html(7)), "High");
assert.equal(selectedLabel(html(0)), "Don't download");
assert.equal(selectedLabel(html("mixed", true)), "Mixed");

console.log("file-priority-select tests passed");
