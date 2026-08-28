import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ENC_LEVEL_OPTIONS,
  ENC_LEVEL_SELECT_ITEMS,
  ENC_POLICY_OPTIONS,
  ENC_POLICY_SELECT_ITEMS,
} from "../../lib/deluge/enc-policy";
import { IntSelect } from "./int-select";

function html(
  value: number,
  options: readonly { value: number; label: string }[],
  items: Record<string, string>
) {
  return renderToStaticMarkup(createElement(IntSelect, { value, onChange() {}, options, items }));
}

function selectedLabel(markup: string) {
  const match = markup.match(/data-slot="select-value"[^>]*>([^<]*)/);
  assert.ok(match, "SelectValue should render");
  return match[1].replace(/&#x27;/g, "'").replace(/&apos;/g, "'");
}

assert.equal(selectedLabel(html(0, ENC_POLICY_OPTIONS, ENC_POLICY_SELECT_ITEMS)), "Forced");
assert.equal(selectedLabel(html(1, ENC_POLICY_OPTIONS, ENC_POLICY_SELECT_ITEMS)), "Enabled");
assert.equal(selectedLabel(html(2, ENC_POLICY_OPTIONS, ENC_POLICY_SELECT_ITEMS)), "Disabled");
assert.equal(selectedLabel(html(1, ENC_LEVEL_OPTIONS, ENC_LEVEL_SELECT_ITEMS)), "Full stream");

for (const n of [0, 1, 2]) {
  assert.notEqual(selectedLabel(html(n, ENC_POLICY_OPTIONS, ENC_POLICY_SELECT_ITEMS)), String(n));
  assert.notEqual(selectedLabel(html(n, ENC_LEVEL_OPTIONS, ENC_LEVEL_SELECT_ITEMS)), String(n));
}

console.log("int-select tests passed");
