import assert from "node:assert/strict";
import {
  beginNotifyAdd,
  extractAddedTorrentIds,
  isDownloadFinished,
  isNotifySecureContext,
  NOTIFY_INSECURE_CONTEXT_MESSAGE,
  NOTIFY_TEST_TORRENT_ID,
  NOTIFY_TEST_TORRENT_NAME,
  notifyPermissionHint,
  parseNotifyOnComplete,
  parseNotifyTorrentIds,
  processDownloadFinishedNotifications,
  pruneNotifyTorrentIds,
  registerNotifyTorrentIds,
  requestNotifyPermissionFromGesture,
  resetNotifyCompleteMemory,
  shouldNotifyDownloadFinished,
  showDownloadFinishedNotification,
  simulateFinishedDownloadNotification,
  testDownloadFinishedNotificationFromGesture,
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
assert.equal(isDownloadFinished({ state: "Finished", progress: 100 }), true);
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

  resetNotifyCompleteMemory();
  store.set(NOTIFY_TORRENT_IDS_STORAGE_KEY, "[]");
  processDownloadFinishedNotifications({
    old: { name: "Old", state: "Downloading", progress: 10 },
  });
  beginNotifyAdd();
  const instant = processDownloadFinishedNotifications({
    old: { name: "Old", state: "Downloading", progress: 10 },
    fast: { name: "Already done", state: "Seeding", progress: 100 },
  });
  assert.equal(instant.length, 1, "new torrent that first appears finished must still notify");
  assert.equal(instant[0].id, "fast");

  const pruned = processDownloadFinishedNotifications({
    old: { name: "Old", state: "Downloading", progress: 10 },
  });
  assert.deepEqual(pruned, []);
  assert.ok(!parseNotifyTorrentIds(store.get(NOTIFY_TORRENT_IDS_STORAGE_KEY)).includes("magnet"));
}

{
  resetNotifyCompleteMemory();
  const store = new Map<string, string>();
  const memory = globalThis as typeof globalThis & { localStorage: Storage };
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
  const hash = "ABCDEF0123456789ABCDEF0123456789ABCDEF01";
  registerNotifyTorrentIds([hash], { seedIncomplete: true });
  pruneNotifyTorrentIds(["already-visible"], ["already-visible"]);
  assert.ok(
    parseNotifyTorrentIds(store.get(NOTIFY_TORRENT_IDS_STORAGE_KEY)).includes(
      "abcdef0123456789abcdef0123456789abcdef01"
    ),
    "IDs that have not appeared in the session yet must not be pruned"
  );
  processDownloadFinishedNotifications({
    [hash]: { name: "Case", state: "Downloading", progress: 10 },
  });
  const finished = processDownloadFinishedNotifications({
    [hash]: { name: "Case", state: "Seeding", progress: 100 },
  });
  assert.equal(finished.length, 1, "notify IDs match after hash case normalization");
  assert.equal(finished[0].id, "abcdef0123456789abcdef0123456789abcdef01");
}

assert.equal(isNotifySecureContext({ isSecureContext: true, hostname: "192.168.1.10" }), true);
assert.equal(isNotifySecureContext({ isSecureContext: false, hostname: "localhost" }), true);
assert.equal(isNotifySecureContext({ isSecureContext: false, hostname: "127.0.0.1" }), true);
assert.equal(isNotifySecureContext({ isSecureContext: false, hostname: "192.168.1.10" }), false);
assert.match(NOTIFY_INSECURE_CONTEXT_MESSAGE, /localhost/);

void (async () => {
  const g = globalThis as typeof globalThis & {
    Notification?: {
      permission: NotificationPermission;
      requestPermission: () => Promise<NotificationPermission>;
      new (title: string, options?: NotificationOptions): { title: string; body?: string; onclick: (() => void) | null; close: () => void };
    };
    window?: { isSecureContext?: boolean; location?: { hostname?: string } };
    localStorage?: Storage;
  };
  const previousWindow = g.window;
  const previousNotification = g.Notification;
  const shown: { title: string; body?: string }[] = [];
  let requested = false;
  let throwOnConstruct = false;

  function MockNotification(this: { title: string; body?: string; onclick: (() => void) | null; close: () => void }, title: string, options?: NotificationOptions) {
    if (throwOnConstruct) throw new Error("Notification construct failed");
    this.title = title;
    this.body = options?.body;
    this.onclick = null;
    this.close = () => undefined;
    shown.push({ title, body: options?.body });
  }
  MockNotification.permission = "default" as NotificationPermission;
  MockNotification.requestPermission = () => {
    requested = true;
    MockNotification.permission = "granted";
    return Promise.resolve("granted" as NotificationPermission);
  };

  g.window = { isSecureContext: true, location: { hostname: "localhost" } };
  g.Notification = MockNotification as unknown as typeof g.Notification;

  const pending = requestNotifyPermissionFromGesture();
  assert.equal(requested, true, "requestPermission must run in the same turn as the gesture");
  assert.equal(await pending, "granted");

  requested = false;
  g.window = { isSecureContext: false, location: { hostname: "192.168.1.50" } };
  MockNotification.permission = "default";
  const insecure = await requestNotifyPermissionFromGesture();
  assert.equal(insecure, "unsupported");
  assert.equal(requested, false, "insecure LAN origins must not call requestPermission");

  const insecureTest = await testDownloadFinishedNotificationFromGesture();
  assert.equal(insecureTest.ok, false);
  assert.equal(insecureTest.ok === false && insecureTest.reason, "insecure");
  assert.match(insecureTest.ok === false ? insecureTest.message : "", /localhost/);

  g.window = { isSecureContext: true, location: { hostname: "localhost" } };
  MockNotification.permission = "granted";
  const store = new Map<string, string>();
  g.localStorage = {
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
  store.set(NOTIFY_TORRENT_IDS_STORAGE_KEY, JSON.stringify(["keep-me"]));
  shown.length = 0;
  const first = simulateFinishedDownloadNotification();
  assert.equal(first.events.length, 1);
  assert.equal(first.events[0].id, NOTIFY_TEST_TORRENT_ID);
  assert.equal(first.delivery.ok, true);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].title, "Download finished");
  assert.equal(shown[0].body, NOTIFY_TEST_TORRENT_NAME);
  assert.ok(
    parseNotifyTorrentIds(store.get(NOTIFY_TORRENT_IDS_STORAGE_KEY)).includes("keep-me"),
    "test finish must not prune other watched IDs"
  );
  assert.ok(!parseNotifyTorrentIds(store.get(NOTIFY_TORRENT_IDS_STORAGE_KEY)).includes(NOTIFY_TEST_TORRENT_ID));

  shown.length = 0;
  const again = simulateFinishedDownloadNotification("Second pass");
  assert.equal(again.events.length, 1, "test trigger must re-seed so it can fire more than once");
  assert.equal(shown[0].body, "Second pass");

  throwOnConstruct = true;
  const threw = showDownloadFinishedNotification("Broken");
  assert.equal(threw.ok, false);
  assert.equal(threw.ok === false && threw.reason, "error");
  assert.match(threw.ok === false ? threw.message : "", /construct failed/);

  g.window = previousWindow;
  g.Notification = previousNotification;
  console.log("notify-complete tests passed");
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
