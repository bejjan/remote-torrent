import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "pref-ui.tsx"), "utf8");
const dialog = readFileSync(join(dir, "preferences-dialog.tsx"), "utf8");
const transmission = readFileSync(join(dir, "transmission-preferences.tsx"), "utf8");
const plugins = readFileSync(join(dir, "plugin-pref-pages.tsx"), "utf8");

assert.match(source, /justify-between/);
assert.match(source, /checked=\{checked === true\}/);
assert.match(source, /max-w-28/);
assert.match(source, /divide-y/);
assert.match(source, /description/);
assert.match(dialog, /from "@\/components\/app\/pref-ui"/);
assert.match(transmission, /from "@\/components\/app\/pref-ui"/);
assert.match(plugins, /from "@\/components\/app\/pref-ui"/);
assert.match(dialog, /PrefSwitch|SwitchRow/);
assert.match(transmission, /PrefSwitch/);
assert.doesNotMatch(source, /flex items-center gap-2 text-sm/);

console.log("pref-ui tests passed");
