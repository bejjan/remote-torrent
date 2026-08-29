import assert from "node:assert/strict";
import {
  formatTorrentEta,
  formatTorrentRate,
  formatSwarmCount,
  isUnusableTrackerFavicon,
  trackerFaviconHost,
  trackerFaviconHostCandidates,
  trackerFaviconLetter,
  trackerFaviconSources,
  trackerFaviconUrl,
} from "./format";

assert.equal(formatTorrentRate(0), "—");
assert.equal(formatTorrentRate(-1), "—");
assert.equal(formatTorrentRate(1024), "1.0 KiB/s");
assert.equal(formatTorrentEta(90, 100), "—");
assert.equal(formatTorrentEta(90, 99.95), "—");
assert.equal(formatTorrentEta(90, 50), "1m 30s");

assert.equal(formatSwarmCount(0, -1), "0");
assert.equal(formatSwarmCount(3, -1), "3");
assert.equal(formatSwarmCount(0, Number.NaN), "0");
assert.equal(formatSwarmCount(8, Number.NEGATIVE_INFINITY), "8");
assert.equal(formatSwarmCount(3, 42), "3 (42)");
assert.equal(formatSwarmCount(0, 0), "0 (0)");
assert.equal(formatSwarmCount(1, 1), "1 (1)");

assert.equal(trackerFaviconHost("ubuntu.com"), "ubuntu.com");
assert.equal(trackerFaviconHost("  torrent.ubuntu.com  "), "torrent.ubuntu.com");
assert.equal(trackerFaviconHost("tracker.example"), "tracker.example");
assert.equal(trackerFaviconHost("1.2.3.4"), "1.2.3.4");
assert.equal(trackerFaviconHost(""), null);
assert.equal(trackerFaviconHost("   "), null);
assert.equal(trackerFaviconHost("All"), null);
assert.equal(trackerFaviconHost("localhost"), "localhost");
assert.equal(trackerFaviconHost("not a host"), null);
assert.equal(trackerFaviconHost("https://evil.example/x"), null);
assert.equal(trackerFaviconHost("999.1.1.1"), null);

assert.equal(
  trackerFaviconUrl("ubuntu.com"),
  "https://icons.duckduckgo.com/ip3/ubuntu.com.ico"
);
assert.equal(
  trackerFaviconUrl("tracker.example"),
  "https://icons.duckduckgo.com/ip3/tracker.example.ico"
);
assert.equal(trackerFaviconUrl(""), null);
assert.equal(trackerFaviconUrl("All"), null);

assert.deepEqual(trackerFaviconHostCandidates("ubuntu.com"), ["ubuntu.com"]);
assert.deepEqual(trackerFaviconHostCandidates("tracker.opentrackr.org"), [
  "tracker.opentrackr.org",
  "opentrackr.org",
]);
assert.deepEqual(trackerFaviconHostCandidates("bt.openbittorrent.com"), [
  "bt.openbittorrent.com",
  "openbittorrent.com",
]);
assert.deepEqual(trackerFaviconHostCandidates("announce.debian.org"), [
  "announce.debian.org",
  "debian.org",
]);
assert.deepEqual(
  trackerFaviconHostCandidates("tracker.example"),
  ["tracker.example"],
  "two-label hosts must not strip down to a single label"
);
assert.deepEqual(trackerFaviconHostCandidates("torrent.ubuntu.com"), ["torrent.ubuntu.com"]);
assert.deepEqual(trackerFaviconHostCandidates("1.2.3.4"), ["1.2.3.4"]);
assert.deepEqual(trackerFaviconHostCandidates(""), []);
assert.deepEqual(trackerFaviconHostCandidates("All"), []);

assert.deepEqual(trackerFaviconSources("ubuntu.com"), [
  "https://icons.duckduckgo.com/ip3/ubuntu.com.ico",
  "https://www.google.com/s2/favicons?domain=ubuntu.com&sz=32",
  "https://favicon.yandex.net/favicon/ubuntu.com",
]);
assert.deepEqual(trackerFaviconSources("tracker.opentrackr.org"), [
  "https://icons.duckduckgo.com/ip3/tracker.opentrackr.org.ico",
  "https://www.google.com/s2/favicons?domain=tracker.opentrackr.org&sz=32",
  "https://favicon.yandex.net/favicon/tracker.opentrackr.org",
  "https://icons.duckduckgo.com/ip3/opentrackr.org.ico",
  "https://www.google.com/s2/favicons?domain=opentrackr.org&sz=32",
  "https://favicon.yandex.net/favicon/opentrackr.org",
]);
assert.deepEqual(trackerFaviconSources(""), []);
assert.deepEqual(trackerFaviconSources("All"), []);

assert.equal(trackerFaviconLetter("ubuntu.com"), "U");
assert.equal(trackerFaviconLetter("tracker.opentrackr.org"), "T");
assert.equal(trackerFaviconLetter("  1.2.3.4"), "1");
assert.equal(trackerFaviconLetter(""), null);
assert.equal(trackerFaviconLetter("   "), null);

assert.equal(
  isUnusableTrackerFavicon({
    src: "https://www.google.com/s2/favicons?domain=tracker.example&sz=32",
    naturalWidth: 16,
    naturalHeight: 16,
  }),
  true,
  "Google's default 16px globe is a miss"
);
assert.equal(
  isUnusableTrackerFavicon({
    src: "https://www.google.com/s2/favicons?domain=ubuntu.com&sz=32",
    naturalWidth: 32,
    naturalHeight: 32,
  }),
  false
);
assert.equal(
  isUnusableTrackerFavicon({
    src: "https://icons.duckduckgo.com/ip3/ubuntu.com.ico",
    naturalWidth: 16,
    naturalHeight: 16,
  }),
  false,
  "a 16px DuckDuckGo ico is a real icon"
);
assert.equal(
  isUnusableTrackerFavicon({
    src: "https://icons.duckduckgo.com/ip3/missing.example.ico",
    naturalWidth: 0,
    naturalHeight: 0,
  }),
  true
);

console.log("format tests passed");
