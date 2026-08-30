import assert from "node:assert/strict";
import { legacyStorageKey, storageKey } from "./storage";
import { parseClientKind } from "./backend/client-kind";
import { NOTIFY_ON_COMPLETE_STORAGE_KEY, NOTIFY_TORRENT_IDS_STORAGE_KEY } from "./notify-complete";

assert.equal(storageKey("sidebar-width"), "nova:sidebar-width");
assert.equal(storageKey("admin-demo"), "nova:admin-demo");
assert.equal(storageKey("notify-on-complete"), "nova:notify-on-complete");
assert.equal(storageKey("notify-torrent-ids"), "nova:notify-torrent-ids");
assert.equal(NOTIFY_ON_COMPLETE_STORAGE_KEY, "nova:notify-on-complete");
assert.equal(NOTIFY_TORRENT_IDS_STORAGE_KEY, "nova:notify-torrent-ids");
assert.equal(legacyStorageKey("sidebar-width"), "deluge-nova:sidebar-width");
assert.equal(legacyStorageKey("notify-on-complete"), "deluge-nova:notify-on-complete");
assert.equal(parseClientKind("transmission"), "transmission");
assert.equal(parseClientKind("qbittorrent"), "qbittorrent");
assert.equal(parseClientKind("deluge"), "deluge");
assert.equal(parseClientKind(null), "deluge");
assert.equal(parseClientKind("nope"), "deluge");

console.log("storage / client-kind tests passed");
