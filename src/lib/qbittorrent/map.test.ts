import assert from "node:assert/strict";
import {
  delugePriorityFromQbittorrent,
  mapQbittorrentState,
  mapQbittorrentTorrent,
  mapSessionStats,
  matchesQbittorrentFilter,
  qbittorrentPriorityFromDeluge,
  torrentKey,
  uniqueCategories,
} from "./map";
import { QBITTORRENT_ETA_INFINITE, type QbittorrentTorrent } from "./types";
import { DEFAULT_QBITTORRENT_PORT, normalizeQbittorrentWebUrl } from "./url";

assert.equal(normalizeQbittorrentWebUrl(""), "");
assert.equal(
  normalizeQbittorrentWebUrl("127.0.0.1"),
  `http://127.0.0.1:${DEFAULT_QBITTORRENT_PORT}`
);
assert.equal(normalizeQbittorrentWebUrl("http://nas:8080"), "http://nas:8080");
assert.equal(normalizeQbittorrentWebUrl("http://nas:8080/"), "http://nas:8080");
assert.equal(normalizeQbittorrentWebUrl("http://nas:8080/api/v2"), "http://nas:8080");
assert.equal(normalizeQbittorrentWebUrl("http://nas:8080/api/v2/"), "http://nas:8080");
assert.equal(normalizeQbittorrentWebUrl("http://nas:8080/qbittorrent"), "http://nas:8080/qbittorrent");
assert.equal(
  normalizeQbittorrentWebUrl("http://nas:8080/qbittorrent/api/v2"),
  "http://nas:8080/qbittorrent"
);
assert.equal(normalizeQbittorrentWebUrl("::1"), "http://[::1]:8080");

const downloading: QbittorrentTorrent = {
  hash: "ABC",
  name: "ubuntu.iso",
  state: "downloading",
  progress: 0.5,
  category: "linux",
  dlspeed: 100,
  upspeed: 10,
};
assert.equal(mapQbittorrentState("downloading"), "Downloading");
assert.equal(torrentKey(downloading), "abc");
assert.equal(mapQbittorrentTorrent(downloading).progress, 50);
assert.equal(mapQbittorrentTorrent(downloading).is_finished, false);
assert.equal(mapQbittorrentTorrent(downloading).label, "linux");
assert.equal(
  mapQbittorrentTorrent({
    ...downloading,
    state: "uploading",
    progress: 1,
    amount_left: 0,
    size: 100,
    total_size: 100,
  }).is_finished,
  true
);
assert.equal(
  mapQbittorrentTorrent({
    ...downloading,
    name: "Dune.Part.Two-R&amp;H.mkv",
  }).name,
  "Dune.Part.Two-R&H.mkv"
);
assert.equal(
  mapQbittorrentTorrent({ ...downloading, eta: QBITTORRENT_ETA_INFINITE }).eta,
  -1
);
assert.equal(mapQbittorrentTorrent({ ...downloading, eta: -1 }).eta, -1);
assert.equal(mapQbittorrentTorrent({ ...downloading, dl_limit: 2048 }).max_download_speed, 2);

assert.equal(mapQbittorrentState("error"), "Error");
assert.equal(mapQbittorrentState("missingFiles"), "Error");
assert.equal(mapQbittorrentState("checkingDL"), "Checking");
assert.equal(mapQbittorrentState("checkingUP"), "Checking");
assert.equal(mapQbittorrentState("checkingResumeData"), "Checking");
assert.equal(mapQbittorrentState("queuedDL"), "Queued");
assert.equal(mapQbittorrentState("queuedUP"), "Queued");
assert.equal(mapQbittorrentState("pausedDL"), "Paused");
assert.equal(mapQbittorrentState("stoppedDL"), "Paused");
assert.equal(mapQbittorrentState("stoppedUP"), "Paused");
assert.equal(mapQbittorrentState("allocating"), "Allocating");
assert.equal(mapQbittorrentState("moving"), "Moving");
assert.equal(mapQbittorrentState("uploading"), "Seeding");
assert.equal(mapQbittorrentState("forcedUP"), "Seeding");
assert.equal(mapQbittorrentState("stalledUP"), "Seeding");
assert.equal(mapQbittorrentState("forcedDL"), "Downloading");
assert.equal(mapQbittorrentState("metaDL"), "Downloading");
assert.equal(mapQbittorrentState("stalledDL"), "Downloading");
assert.equal(mapQbittorrentState("unknown"), "Paused");

assert.equal(qbittorrentPriorityFromDeluge(0), 0);
assert.equal(qbittorrentPriorityFromDeluge(4), 1);
assert.equal(qbittorrentPriorityFromDeluge(7), 6);
assert.equal(delugePriorityFromQbittorrent(0), 0);
assert.equal(delugePriorityFromQbittorrent(1), 4);
assert.equal(delugePriorityFromQbittorrent(6), 7);

assert.equal(matchesQbittorrentFilter(downloading, { label: ["linux"] }), true);
assert.equal(matchesQbittorrentFilter(downloading, { label: ["movies"] }), false);
assert.deepEqual(uniqueCategories([downloading, { hash: "def", name: "bad" }]), ["linux"]);

const summed = mapSessionStats(null, [
  { hash: "a", name: "a", dlspeed: 100, upspeed: 10 },
  { hash: "b", name: "b", dlspeed: 50, upspeed: 5 },
]);
assert.equal(summed.download_rate, 150);
assert.equal(summed.upload_rate, 15);
assert.equal(mapSessionStats({ dl_info_speed: 999, up_info_speed: 1 }, [
  { hash: "a", name: "a", dlspeed: 100, upspeed: 10 },
]).download_rate, 999);

console.log("qbittorrent map tests passed");
