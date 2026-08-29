import assert from "node:assert/strict";
import { legacyStorageKey, storageKey } from "./storage";
import { parseClientKind } from "./backend/client-kind";

assert.equal(storageKey("sidebar-width"), "nova:sidebar-width");
assert.equal(legacyStorageKey("sidebar-width"), "deluge-nova:sidebar-width");
assert.equal(parseClientKind("transmission"), "transmission");
assert.equal(parseClientKind("deluge"), "deluge");
assert.equal(parseClientKind(null), "deluge");
assert.equal(parseClientKind("nope"), "deluge");

console.log("storage / client-kind tests passed");
