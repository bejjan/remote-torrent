import assert from "node:assert/strict";
import {
  formatCompactDate,
  formatCompactRate,
  formatTorrentEta,
  formatTorrentRate,
  formatSwarmCount,
  isUnusableTrackerFavicon,
  normalizeTorrentTrackers,
  trackerFaviconHost,
  trackerFaviconHostCandidates,
  trackerFaviconLetter,
  trackerFaviconSources,
  trackerFaviconUrl,
} from "./format";

assert.equal(formatCompactRate(0), "");
assert.equal(formatCompactRate(-1), "");
assert.equal(formatCompactRate(Number.NaN), "");
assert.equal(formatCompactRate(512), "512B");
assert.equal(formatCompactRate(1024), "1K");
assert.equal(formatCompactRate(340 * 1024), "340K");
assert.equal(formatCompactRate(1.2 * 1024 ** 2), "1.2M");
assert.equal(formatCompactRate(12.5 * 1024 ** 3), "12.5G");

{
  const now = new Date(2026, 7, 31, 15, 0, 0);
  const sec = (date: Date) => date.getTime() / 1000;
  const opts = (locale: string) => ({ now, locale });

  assert.equal(formatCompactDate(0), "—");
  assert.equal(formatCompactDate(sec(new Date(2026, 7, 31, 9, 5)), opts("en-US")), "Today 9:05 AM");
  assert.equal(formatCompactDate(sec(new Date(2026, 7, 30, 21, 0)), opts("en-US")), "Yesterday 9:00 PM");
  assert.equal(formatCompactDate(sec(new Date(2026, 0, 15, 14, 30)), opts("en-US")), "Jan 15, 2:30 PM");
  assert.equal(
    formatCompactDate(sec(new Date(2025, 11, 25, 8, 0)), opts("en-US")),
    "Dec 25, 2025, 8:00 AM"
  );

  assert.equal(formatCompactDate(sec(new Date(2026, 7, 31, 9, 5)), opts("sv-SE")), "I dag 09:05");
  assert.equal(formatCompactDate(sec(new Date(2026, 7, 30, 21, 0)), opts("sv-SE")), "I går 21:00");
  assert.equal(formatCompactDate(sec(new Date(2026, 0, 15, 14, 30)), opts("sv-SE")), "15 jan. 14:30");
  assert.equal(formatCompactDate(sec(new Date(2025, 11, 25, 8, 0)), opts("en-GB")), "25 Dec 2025, 08:00");
}

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

assert.deepEqual(normalizeTorrentTrackers(undefined), []);
assert.deepEqual(normalizeTorrentTrackers(null), []);
assert.deepEqual(normalizeTorrentTrackers("udp://tracker.example/announce"), []);
assert.deepEqual(
  normalizeTorrentTrackers([
    { url: "udp://tracker.example:6969/announce", tier: 1 },
    { announce: "http://backup.example/announce", tier: "2" },
    { url: "** [DHT] **" },
    { url: "  " },
    { tier: 0 },
    null,
  ]),
  [
    { url: "udp://tracker.example:6969/announce", tier: 1 },
    { url: "http://backup.example/announce", tier: 2 },
  ]
);

console.log("format tests passed");
