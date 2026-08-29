import assert from "node:assert/strict";
import {
  DEFAULT_PROXY_TYPE,
  PROXY_TYPE_OPTIONS,
  PROXY_TYPE_SELECT_ITEMS,
  canonicalizeProxyType,
  proxyTypeLabel,
} from "./proxy-type";

assert.deepEqual(
  PROXY_TYPE_SELECT_ITEMS,
  {
    "0": "None",
    "1": "Socksv4",
    "2": "Socksv5",
    "3": "Socksv5 with Auth",
    "4": "HTTP",
    "5": "HTTP with Auth",
  }
);

assert.equal(PROXY_TYPE_OPTIONS.length, 6);
const proxyLabels: Record<string, string> = PROXY_TYPE_SELECT_ITEMS;
for (const opt of PROXY_TYPE_OPTIONS) {
  assert.equal(proxyLabels[String(opt.value)], opt.label);
}

assert.equal(canonicalizeProxyType(0), 0);
assert.equal(canonicalizeProxyType(3), 3);
assert.equal(canonicalizeProxyType(5), 5);
assert.equal(canonicalizeProxyType(2.9), 2);
assert.equal(canonicalizeProxyType(-1), DEFAULT_PROXY_TYPE);
assert.equal(canonicalizeProxyType(6), DEFAULT_PROXY_TYPE);
assert.equal(canonicalizeProxyType(Number.NaN), DEFAULT_PROXY_TYPE);

assert.equal(proxyTypeLabel(0), "None");
assert.equal(proxyTypeLabel(1), "Socksv4");
assert.equal(proxyTypeLabel(2), "Socksv5");
assert.equal(proxyTypeLabel(3), "Socksv5 with Auth");
assert.equal(proxyTypeLabel(4), "HTTP");
assert.equal(proxyTypeLabel(5), "HTTP with Auth");

console.log("proxy-type tests passed");
