import assert from "node:assert/strict";
import {
  asBool,
  asNumber,
  asPortPair,
  asString,
  cloneConfig,
  dirtyConfig,
  hasConfigKey,
  isEmptyConfig,
  proxyRecord,
} from "./pref-config";

assert.equal(hasConfigKey({ compact_allocation: false }, "compact_allocation"), true);
assert.equal(hasConfigKey({ compact_allocation: false }, "missing"), false);
assert.equal(hasConfigKey({}, "utp"), false);

assert.equal(asBool(true), true);
assert.equal(asBool(1), true);
assert.equal(asBool(false), false);
assert.equal(asBool(0), false);
assert.equal(asBool(undefined), false);
assert.equal(asBool("true"), false);

assert.equal(asNumber(12.5), 12.5);
assert.equal(asNumber("-1"), -1);
assert.equal(asNumber("nope", 7), 7);
assert.equal(asString(null, "x"), "x");
assert.equal(asString(80), "80");

assert.deepEqual(asPortPair([6881, 6891]), [6881, 6891]);
assert.deepEqual(asPortPair(6881, [1, 2]), [6881, 6881]);
assert.deepEqual(asPortPair(undefined, [0, 0]), [0, 0]);

const original = {
  download_location: "/a",
  max_upload_speed: -1,
  proxy: { type: 0, hostname: "" },
  dht: true,
};
const current = {
  ...original,
  max_upload_speed: 100,
  proxy: { type: 2, hostname: "127.0.0.1" },
};
const dirty = dirtyConfig(original, current);
assert.deepEqual(Object.keys(dirty).sort(), ["max_upload_speed", "proxy"]);
assert.equal(dirty.max_upload_speed, 100);
assert.deepEqual(dirty.proxy, { type: 2, hostname: "127.0.0.1" });
assert.equal(isEmptyConfig(dirtyConfig(original, cloneConfig(original))), true);

const sameRefProxy = { ...original, dht: true };
assert.equal(isEmptyConfig(dirtyConfig(original, sameRefProxy)), true);

assert.deepEqual(proxyRecord({ proxy: { type: 4 } }).type, 4);
assert.deepEqual(proxyRecord({}), {});

console.log("pref-config tests passed");
