import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PeerCountry } from "./peer-country";

function html(country: string) {
  return renderToStaticMarkup(createElement(PeerCountry, { country }));
}

const us = html("US");
assert.match(us, /🇺🇸/);
assert.match(us, />US</);
assert.match(us, /text-\[16px\]/);
assert.match(us, /h-4/);
assert.match(us, /max-h-4/);
assert.match(us, /overflow-hidden/);
assert.doesNotMatch(us, /<img/i);
assert.doesNotMatch(us, /flagcdn/);

const se = html(" se ");
assert.match(se, /🇸🇪/);
assert.match(se, />SE</);

const empty = html("");
assert.match(empty, /text-muted-foreground/);
assert.match(empty, /—/);
assert.doesNotMatch(empty, /<img/i);
assert.doesNotMatch(empty, /flagcdn/);

assert.match(html("??"), /—/);
assert.match(html("?"), /—/);
assert.match(html("unknown"), /—/);
assert.doesNotMatch(html("??"), /🇺🇸|🇸🇪|🇩🇪/);

const named = html("Germany");
assert.match(named, /Germany/);
assert.doesNotMatch(named, /<img/i);

const dir = dirname(fileURLToPath(import.meta.url));
const details = readFileSync(join(dir, "torrent-details.tsx"), "utf8");
assert.match(details, /PeerCountry/);
assert.match(details, /<PeerCountry country=\{p\.country\}/);
assert.doesNotMatch(details, /\{p\.country\}<\/td>/);

console.log("peer-country tests passed");
