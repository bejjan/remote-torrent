import assert from "node:assert/strict";
import {
  DEFAULT_DOCUMENT_TITLE,
  isWebSessionSpeedVisible,
  isWebSidebarVisible,
  sessionSpeedDocumentTitle,
  holdLastSessionRates,
  sessionRatesFromStats,
  writeDocumentTitleIfChanged,
  ZERO_SESSION_RATES,
} from "./web-config";

assert.equal(isWebSidebarVisible(undefined), true);
assert.equal(isWebSidebarVisible({}), true);
assert.equal(isWebSidebarVisible({ show_sidebar: false }), false);
assert.equal(isWebSidebarVisible({ sidebar: false }), false);
assert.equal(isWebSidebarVisible({ show_sidebar: true, sidebar: false }), true);

assert.equal(isWebSessionSpeedVisible(undefined), true);
assert.equal(isWebSessionSpeedVisible({}), true);
assert.equal(isWebSessionSpeedVisible({ show_session_speed: true }), true);
assert.equal(isWebSessionSpeedVisible({ show_session_speed: false }), false);
assert.equal(isWebSessionSpeedVisible({ show_session_speed: 0 }), false);
assert.equal(isWebSessionSpeedVisible({ show_session_speed: 1 }), true);

assert.equal(DEFAULT_DOCUMENT_TITLE, "Nova");
assert.equal(sessionSpeedDocumentTitle(0, 0, false), "Nova");
assert.equal(
  sessionSpeedDocumentTitle(1.2 * 1024 ** 2, 200 * 1024, true),
  "↓1.2 MiB/s ↑200 KiB/s — Nova"
);
assert.equal(sessionSpeedDocumentTitle(0, 0, true), "↓0 B/s ↑0 B/s — Nova");
assert.equal(
  sessionSpeedDocumentTitle(512, 1024, false, "Other"),
  "Other"
);

assert.equal(sessionRatesFromStats(null), null);
assert.equal(sessionRatesFromStats(undefined), null);
assert.equal(sessionRatesFromStats({}), null);
assert.equal(sessionRatesFromStats({ download_rate: 100 }), null);
assert.equal(sessionRatesFromStats({ download_rate: Number.NaN, upload_rate: 1 }), null);
assert.deepEqual(sessionRatesFromStats({ download_rate: 0, upload_rate: 0 }), { download: 0, upload: 0 });
assert.deepEqual(sessionRatesFromStats({ download_rate: 10, upload_rate: 20 }), {
  download: 10,
  upload: 20,
});

const last = { download: 1200, upload: 340 };
assert.deepEqual(holdLastSessionRates(last, null), last);
assert.deepEqual(holdLastSessionRates(last, undefined), last);
assert.deepEqual(holdLastSessionRates(last, { download_rate: 50 }), last);
assert.deepEqual(holdLastSessionRates(null, null), ZERO_SESSION_RATES);
assert.deepEqual(holdLastSessionRates(last, { download_rate: 0, upload_rate: 0 }), {
  download: 0,
  upload: 0,
});
assert.deepEqual(holdLastSessionRates(last, { download_rate: 80, upload_rate: 90 }), {
  download: 80,
  upload: 90,
});
assert.equal(
  holdLastSessionRates(last, { download_rate: last.download, upload_rate: last.upload }),
  last
);

{
  const target = { title: "Nova" };
  assert.equal(writeDocumentTitleIfChanged(target, "Nova"), false);
  assert.equal(target.title, "Nova");
  const withSpeeds = sessionSpeedDocumentTitle(1024, 2048, true);
  assert.equal(writeDocumentTitleIfChanged(target, withSpeeds), true);
  assert.equal(target.title, withSpeeds);
  assert.equal(writeDocumentTitleIfChanged(target, withSpeeds), false);
  assert.equal(writeDocumentTitleIfChanged(target, sessionSpeedDocumentTitle(1, 2, false)), true);
  assert.equal(target.title, "Nova");
}

console.log("web-config tests passed");
