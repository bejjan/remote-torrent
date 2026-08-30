import assert from "node:assert/strict";
import { formatRate } from "./format";
import {
  SESSION_MONITOR_SAMPLE_CAP,
  formatConnectionCount,
  isSessionMonitorChipVisible,
  nextRateSamples,
  pushRateSample,
  sessionMonitorRateParts,
  sessionTransferTotals,
  sparklineIsDrawable,
  sparklineMax,
  sparklinePolyline,
  sparklineSeriesVisible,
} from "./session-monitor";

assert.equal(SESSION_MONITOR_SAMPLE_CAP, 60);

{
  const first = pushRateSample([], { download: 10, upload: 2 });
  assert.deepEqual(first, [{ download: 10, upload: 2 }]);
  const grown = pushRateSample(first, { download: 20, upload: 0 });
  assert.deepEqual(grown, [
    { download: 10, upload: 2 },
    { download: 20, upload: 0 },
  ]);
}

{
  const filled = Array.from({ length: 60 }, (_, i) => ({ download: i, upload: 0 }));
  const next = pushRateSample(filled, { download: 99, upload: 1 });
  assert.equal(next.length, 60);
  assert.deepEqual(next[0], { download: 1, upload: 0 });
  assert.deepEqual(next[59], { download: 99, upload: 1 });
}

{
  const prev = [{ download: 5, upload: 1 }];
  assert.deepEqual(nextRateSamples(prev, { download: 0, upload: 0 }, false), []);
  assert.deepEqual(nextRateSamples([], { download: 1, upload: 0 }, false), []);
  assert.deepEqual(nextRateSamples(prev, { download: 8, upload: 2 }, true), [
    { download: 5, upload: 1 },
    { download: 8, upload: 2 },
  ]);
}

assert.equal(sparklineIsDrawable([]), false);
assert.equal(sparklineIsDrawable([{ download: 0, upload: 0 }]), false);
assert.equal(
  sparklineIsDrawable([
    { download: 0, upload: 0 },
    { download: 0, upload: 0 },
  ]),
  false,
  "a flat zero line must not be drawable"
);
assert.equal(sparklineIsDrawable([{ download: 10, upload: 0 }]), false, "need two points");
assert.equal(
  sparklineIsDrawable([
    { download: 0, upload: 0 },
    { download: 10, upload: 0 },
  ]),
  true
);

assert.equal(
  sparklineMax([
    { download: 10, upload: 30 },
    { download: 40, upload: 5 },
  ]),
  40
);
assert.equal(sparklineSeriesVisible([{ download: 0, upload: 4 }], "download"), false);
assert.equal(sparklineSeriesVisible([{ download: 0, upload: 4 }], "upload"), true);

{
  const points = sparklinePolyline([0, 10], 10, 10, 10, 0);
  assert.equal(points, "0.0,10.0 10.0,0.0");
  assert.equal(sparklinePolyline([0, 0], 10, 10, 0), "");
  assert.equal(sparklinePolyline([5], 10, 10, 5), "");
}

assert.deepEqual(sessionMonitorRateParts(0, 0), { download: null, upload: null });
assert.deepEqual(sessionMonitorRateParts(-1, Number.NaN), { download: null, upload: null });
assert.deepEqual(sessionMonitorRateParts(1.2 * 1024 ** 2, 340 * 1024), {
  download: `↓ ${formatRate(1.2 * 1024 ** 2)}`,
  upload: `↑ ${formatRate(340 * 1024)}`,
});
assert.equal(sessionMonitorRateParts(1024, 0).upload, null);
assert.equal(sessionMonitorRateParts(0, 1024).download, null);

assert.equal(isSessionMonitorChipVisible(undefined), false);
assert.equal(isSessionMonitorChipVisible(false), false);
assert.equal(isSessionMonitorChipVisible(true), true);

assert.equal(formatConnectionCount(0), "0");
assert.equal(formatConnectionCount(48), "48");
assert.equal(formatConnectionCount(9999), "9999");
assert.equal(formatConnectionCount(10000), "10K");
assert.equal(formatConnectionCount(222402), "222K");
assert.equal(formatConnectionCount(-1), "—");

assert.deepEqual(
  sessionTransferTotals({ payload_download: 100, payload_upload: 20 }, null),
  { downloaded: 100, uploaded: 20 }
);
assert.equal(sessionTransferTotals(null, null), null);
assert.deepEqual(
  sessionTransferTotals(null, {
    a: { total_done: 50, total_uploaded: 7 },
    b: { total_done: 10, total_uploaded: 3 },
  }),
  { downloaded: 60, uploaded: 10 }
);
assert.deepEqual(
  sessionTransferTotals({ payload_download: 1 }, { a: { total_done: 9, total_uploaded: 2 } }),
  { downloaded: 9, uploaded: 2 },
  "partial stats fall back to torrent sums"
);

console.log("session-monitor tests passed");
