import assert from "node:assert/strict";
import {
  beginNotifyAdd,
  extractAddedTorrentIds,
  isDownloadFinished,
  notifyPermissionHint,
  parseNotifyOnComplete,
  parseNotifyTorrentIds,
  processDownloadFinishedNotifications,
  registerNotifyTorrentIds,
  resetNotifyCompleteMemory,
  shouldNotifyDownloadFinished,
  torrentIdsFromAddForm,
  NOTIFY_ON_COMPLETE_STORAGE_KEY,
  NOTIFY_TORRENT_IDS_STORAGE_KEY,
} from "./notify-complete";
import { storageKey, legacyStorageKey } from "./storage";

assert.equal(NOTIFY_ON_COMPLETE_STORAGE_KEY, storageKey("notify-on-complete"));
assert.equal(NOTIFY_TORRENT_IDS_STORAGE_KEY, storageKey("notify-torrent-ids"));
assert.equal(legacyStorageKey("notify-on-complete"), "deluge-nova:notify-on-complete");
assert.equal(legacyStorageKey("notify-torrent-ids"), "deluge-nova:notify-torrent-ids");

assert.equal(parseNotifyOnComplete(null), false);
assert.equal(parseNotifyOnComplete(""), false);
assert.equal(parseNotifyOnComplete("0"), false);
assert.equal(parseNotifyOnComplete("1"), true);
assert.equal(parseNotifyOnComplete("true"), true);
assert.equal(parseNotifyOnComplete("on"), true);

assert.deepEqual(parseNotifyTorrentIds(null), []);
assert.deepEqual(parseNotifyTorrentIds("not-json"), []);
assert.deepEqual(parseNotifyTorrentIds('["abc","abc",12]'), ["abc", "12"]);
assert.deepEqual(
  parseNotifyTorrentIds('["ABCDEF0123456789ABCDEF0123456789ABCDEF01"]'),
  ["abcdef0123456789abcdef0123456789abcdef01"]
);

assert.deepEqual(extractAddedTorrentIds(true), []);
assert.deepEqual(extractAddedTorrentIds(null), []);
assert.deepEqual(extractAddedTorrentIds("deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"), [
  "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
]);
assert.deepEqual(extractAddedTorrentIds(42), ["42"]);
assert.deepEqual(extractAddedTorrentIds([true, "abc123"]), ["abc123"]);
assert.deepEqual(extractAddedTorrentIds([[true, "hash-one"], [false, null]]), ["hash-one"]);
assert.deepEqual(extractAddedTorrentIds({ torrent_id: "deluge-id" }), ["deluge-id"]);
assert.deepEqual(
  extractAddedTorrentIds({
    "torrent-added": { id: 7, hashString: "ABCDEF0123456789ABCDEF0123456789ABCDEF01" },
  }),
  ["abcdef0123456789abcdef0123456789abcdef01", "7"]
);

assert.deepEqual(
  torrentIdsFromAddForm({
    infoHash: "ABCDEF0123456789ABCDEF0123456789ABCDEF01",
    magnetText: "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Demo\nnot-a-magnet",
  }),
  ["abcdef0123456789abcdef0123456789abcdef01", "0123456789abcdef0123456789abcdef01234567"]
);

assert.equal(isDownloadFinished({ state: "Downloading", progress: 40 }), false);
assert.equal(isDownloadFinished({ state: "Queued", progress: 0 }), false);
assert.equal(isDownloadFinished({ state: "Seeding", progress: 100 }), true);
assert.equal(isDownloadFinished({ state: "Paused", progress: 100 }), true);
assert.equal(isDownloadFinished({ state: "Paused", progress: 10 }), false);
assert.equal(isDownloadFinished({ state: "Checking", progress: 100 }), false);
assert.equal(isDownloadFinished({ state: "Moving", progress: 100 }), false);
assert.equal(isDownloadFinished({ is_finished: true, state: "Paused", progress: 100 }), true);
assert.equal(isDownloadFinished({ state: "Downloading", progress: 99.9 }), false);

assert.equal(
  shouldNotifyDownloadFinished({ state: "Downloading", progress: 40 }, { state: "Seeding", progress: 100 }),
  true
);
assert.equal(
  shouldNotifyDownloadFinished({ state: "Queued", progress: 0 }, { state: "Paused", progress: 100 }),
  true
);
assert.equal(
  shouldNotifyDownloadFinished({ state: "Downloading", progress: 80 }, { state: "Seeding", is_finished: true }),
  true
);
assert.equal(
  shouldNotifyDownloadFinished(undefined, { state: "Seeding", progress: 100 }),
  false,
  "already complete on first sight"
);
assert.equal(
  shouldNotifyDownloadFinished({ state: "Seeding", progress: 100 }, { state: "Seeding", progress: 100 }),
  false
);
assert.equal(
  shouldNotifyDownloadFinished({ state: "Paused", progress: 100 }, { state: "Seeding", progress: 100 }),
  false
);
assert.equal(
  shouldNotifyDownloadFinished({ state: "Checking", progress: 99 }, { state: "Seeding", progress: 100 }),
  false,
  "recheck of a complete torrent"
);
assert.equal(
  shouldNotifyDownloadFinished({ state: "Moving", progress: 100 }, { state: "Seeding", progress: 100 }),
  false,
  "move of a complete torrent"
);
assert.equal(
  shouldNotifyDownloadFinished({ state: "Checking", progress: 40 }, { state: "Seeding", progress: 100 }),
  true,
  "incomplete torrent that finishes after recheck"
);
assert.equal(
  shouldNotifyDownloadFinished({ state: "Downloading", progress: 40 }, { state: "Downloading", progress: 80 }),
  false
);

assert.equal(notifyPermissionHint("denied", true), "Notifications are blocked in the browser. Allow them in site settings.");
assert.equal(notifyPermissionHint("denied", false), "Notifications are blocked in the browser. Allow them in site settings.");
assert.equal(
  notifyPermissionHint("default", true),
  "Your browser will ask for permission to show notifications."
);
assert.equal(notifyPermissionHint("default", false), null);
assert.equal(notifyPermissionHint("granted", true), null);
assert.equal(notifyPermissionHint("unsupported", true), "Notifications are not available in this browser.");

{
  const store = new Map<string, string>();
  const memory = globalThis as typeof globalThis & { window: typeof globalThis; localStorage: Storage };
  (memory as { window: typeof globalThis }).window = memory;
  memory.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };

  resetNotifyCompleteMemory();
  store.clear();

  const first = processDownloadFinishedNotifications({
    a: { name: "Already Done", state: "Seeding", progress: 100 },
    b: { name: "Downloading", state: "Downloading", progress: 20 },
  });
  assert.deepEqual(first, [], "login must not notify the existing catalog");

  registerNotifyTorrentIds(["b"], { seedIncomplete: true });
  const later = processDownloadFinishedNotifications({
    a: { name: "Already Done", state: "Seeding", progress: 100 },
    b: { name: "Downloading", state: "Seeding", progress: 100 },
  });
  assert.equal(later.length, 1);
  assert.equal(later[0].id, "b");
  assert.equal(later[0].name, "Downloading");

  const again = processDownloadFinishedNotifications({
    a: { name: "Already Done", state: "Seeding", progress: 100 },
    b: { name: "Downloading", state: "Seeding", progress: 100 },
  });
  assert.deepEqual(again, [], "do not notify twice");

  resetNotifyCompleteMemory();
  store.set(NOTIFY_TORRENT_IDS_STORAGE_KEY, "[]");
  processDownloadFinishedNotifications({
    old: { name: "Old", state: "Downloading", progress: 10 },
  });
  beginNotifyAdd();
  const pending = processDownloadFinishedNotifications({
    old: { name: "Old", state: "Downloading", progress: 10 },
    magnet: { name: "Magnet &amp; Friends", state: "Downloading", progress: 5 },
  });
  assert.deepEqual(pending, []);
  const finished = processDownloadFinishedNotifications({
    old: { name: "Old", state: "Downloading", progress: 10 },
    magnet: { name: "Magnet & Friends", state: "Seeding", progress: 100 },
  });
  assert.equal(finished.length, 1);
  assert.equal(finished[0].id, "magnet");

  const pruned = processDownloadFinishedNotifications({
    old: { name: "Old", state: "Downloading", progress: 10 },
  });
  assert.deepEqual(pruned, []);
  assert.ok(!parseNotifyTorrentIds(store.get(NOTIFY_TORRENT_IDS_STORAGE_KEY)).includes("magnet"));
}

console.log("notify-complete tests passed");
