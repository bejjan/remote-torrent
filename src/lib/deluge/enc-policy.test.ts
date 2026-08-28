import assert from "node:assert/strict";
import {
  DEFAULT_ENC_LEVEL,
  DEFAULT_ENC_POLICY,
  ENC_LEVEL_OPTIONS,
  ENC_LEVEL_SELECT_ITEMS,
  ENC_POLICY_OPTIONS,
  ENC_POLICY_SELECT_ITEMS,
  canonicalizeEncLevel,
  canonicalizeEncPolicy,
  encLevelLabel,
  encPolicyLabel,
} from "./enc-policy";

assert.deepEqual(ENC_POLICY_SELECT_ITEMS, {
  "0": "Forced",
  "1": "Enabled",
  "2": "Disabled",
});
assert.deepEqual(ENC_LEVEL_SELECT_ITEMS, {
  "0": "Handshake",
  "1": "Full stream",
  "2": "Either",
});

for (const opt of ENC_POLICY_OPTIONS) {
  assert.equal(encPolicyLabel(opt.value), opt.label);
  assert.notEqual(opt.label, String(opt.value));
}
for (const opt of ENC_LEVEL_OPTIONS) {
  assert.equal(encLevelLabel(opt.value), opt.label);
  assert.notEqual(opt.label, String(opt.value));
}

assert.equal(canonicalizeEncPolicy(0), 0);
assert.equal(canonicalizeEncPolicy(1), 1);
assert.equal(canonicalizeEncPolicy(2), 2);
assert.equal(canonicalizeEncPolicy(2.9), 2);
assert.equal(canonicalizeEncPolicy(-1), DEFAULT_ENC_POLICY);
assert.equal(canonicalizeEncPolicy(9), DEFAULT_ENC_POLICY);
assert.equal(canonicalizeEncPolicy(Number.NaN), DEFAULT_ENC_POLICY);

assert.equal(canonicalizeEncLevel(0), 0);
assert.equal(canonicalizeEncLevel(1), 1);
assert.equal(canonicalizeEncLevel(2), 2);
assert.equal(canonicalizeEncLevel(4), DEFAULT_ENC_LEVEL);

assert.equal(encPolicyLabel(0), "Forced");
assert.equal(encPolicyLabel(1), "Enabled");
assert.equal(encPolicyLabel(2), "Disabled");
assert.equal(encLevelLabel(0), "Handshake");
assert.equal(encLevelLabel(1), "Full stream");
assert.equal(encLevelLabel(2), "Either");

console.log("enc-policy tests passed");
