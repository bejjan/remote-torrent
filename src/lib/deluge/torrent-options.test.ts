import assert from "node:assert/strict";
import { buildTorrentOptionsPayload, optionNumber } from "./torrent-options";

const payload = buildTorrentOptionsPayload({
  maxDownloadSpeed: "512",
  maxUploadSpeed: "-1",
  maxConnections: "80",
  maxUploadSlots: "4",
  isAutoManaged: true,
  stopAtRatio: true,
  stopRatio: "1.5",
  removeAtRatio: false,
  moveCompleted: true,
  moveCompletedPath: "/data/done",
  superSeeding: false,
  prioritizeFirstLast: true,
});

assert.deepEqual(payload, {
  max_download_speed: 512,
  max_upload_speed: -1,
  max_connections: 80,
  max_upload_slots: 4,
  is_auto_managed: true,
  stop_at_ratio: true,
  stop_ratio: 1.5,
  remove_at_ratio: false,
  move_completed: true,
  move_completed_path: "/data/done",
  super_seeding: false,
  prioritize_first_last_pieces: true,
});

assert.equal("prioritize_first_last" in payload, false);
assert.equal("private" in payload, false);

assert.equal(optionNumber("12.5"), 12.5);
assert.equal(optionNumber(""), -1);
assert.equal(optionNumber("nope"), -1);
assert.equal(optionNumber("nope", 2), 2);

console.log("torrent-options tests passed");
