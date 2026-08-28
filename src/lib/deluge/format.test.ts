import assert from "node:assert/strict";
import { formatSwarmCount, trackerFaviconHost, trackerFaviconUrl } from "./format";

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
  "https://www.google.com/s2/favicons?domain=ubuntu.com&sz=32"
);
assert.equal(
  trackerFaviconUrl("tracker.example"),
  "https://www.google.com/s2/favicons?domain=tracker.example&sz=32"
);
assert.equal(trackerFaviconUrl(""), null);
assert.equal(trackerFaviconUrl("All"), null);

console.log("format tests passed");
