import assert from "node:assert/strict";
import {
  DEFAULT_DOCUMENT_TITLE,
  isWebSessionSpeedVisible,
  isWebSidebarVisible,
  sessionSpeedDocumentTitle,
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

assert.equal(DEFAULT_DOCUMENT_TITLE, "Deluge Nova");
assert.equal(sessionSpeedDocumentTitle(0, 0, false), "Deluge Nova");
assert.equal(
  sessionSpeedDocumentTitle(1.2 * 1024 ** 2, 200 * 1024, true),
  "↓1.2 MiB/s ↑200 KiB/s — Deluge Nova"
);
assert.equal(sessionSpeedDocumentTitle(0, 0, true), "↓0 B/s ↑0 B/s — Deluge Nova");
assert.equal(
  sessionSpeedDocumentTitle(512, 1024, false, "Other"),
  "Other"
);

console.log("web-config tests passed");
