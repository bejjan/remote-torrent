import assert from "node:assert/strict";
import { filterAndSortTorrents, reuseTorrentRows, type TorrentRowEntry } from "./torrent-list";
import type { TorrentStatus } from "./types";

function torrent(name: string, extra: Partial<TorrentStatus> = {}): TorrentStatus {
  return {
    queue: extra.queue ?? 0,
    name,
    total_wanted: extra.total_wanted ?? 1,
    state: extra.state ?? "Paused",
    progress: extra.progress ?? 0,
    num_seeds: 0,
    total_seeds: 0,
    num_peers: 0,
    total_peers: 0,
    download_payload_rate: 0,
    upload_payload_rate: 0,
    eta: -1,
    ratio: 0,
    distributed_copies: 0,
    is_auto_managed: true,
    time_added: extra.time_added ?? 1,
    tracker_host: "t",
    download_location: "/tmp",
    last_seen_complete: 0,
    total_done: 0,
    total_uploaded: 0,
    max_download_speed: -1,
    max_upload_speed: -1,
    seeds_peers_ratio: 0,
    total_remaining: 1,
    completed_time: 0,
    time_since_transfer: 0,
    total_payload_download: 0,
    total_payload_upload: 0,
    next_announce: 0,
    tracker_status: "",
    num_pieces: 1,
    piece_length: 16,
    active_time: 0,
    seeding_time: 0,
    seed_rank: 0,
    owner: "",
    public: true,
    shared: false,
    total_size: 1,
    num_files: 1,
    message: extra.message ?? "",
    comment: "",
    creator: "",
    max_connections: -1,
    max_upload_slots: -1,
    stop_at_ratio: false,
    stop_ratio: 2,
    remove_at_ratio: false,
    private: false,
    prioritize_first_last: false,
    move_completed: false,
    move_completed_path: "",
    super_seeding: false,
    sequential_download: false,
    label: extra.label,
  };
}

const ubuntu = torrent("ubuntu-24.04.iso", { queue: 0, progress: 40 });
const debian = torrent("debian.iso", { queue: -1, state: "Seeding", progress: 100 });
const mint = torrent("linuxmint.iso", { queue: 1, progress: 10 });

const map = { u: ubuntu, d: debian, m: mint };

{
  const rows = filterAndSortTorrents(map, "", "queue", "asc");
  assert.deepEqual(
    rows.map(([id]) => id),
    ["u", "m", "d"]
  );
}

{
  const rows = filterAndSortTorrents(map, "mint", "name", "asc");
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], "m");
}

{
  const rows = filterAndSortTorrents(map, "ISO", "name", "asc");
  assert.equal(rows.length, 3);
}

{
  const dotted = {
    got: torrent("Game.of.Thrones.S01"),
    spaced: torrent("game of thrones"),
    other: torrent("debian.iso"),
  };
  const bySpaced = filterAndSortTorrents(dotted, "game of thrones", "name", "asc");
  assert.deepEqual(
    bySpaced.map(([id]) => id).sort(),
    ["got", "spaced"]
  );
  const byDotted = filterAndSortTorrents(dotted, "game.of.thrones", "name", "asc");
  assert.deepEqual(
    byDotted.map(([id]) => id).sort(),
    ["got", "spaced"]
  );
  const byDotsOnly = filterAndSortTorrents(dotted, "...", "name", "asc");
  assert.equal(byDotsOnly.length, 3);
}

{
  const prev: TorrentRowEntry[] = [
    ["u", ubuntu],
    ["m", mint],
  ];
  const next: TorrentRowEntry[] = [
    ["u", ubuntu],
    ["m", mint],
  ];
  assert.equal(reuseTorrentRows(prev, next), prev);
}

{
  const prev: TorrentRowEntry[] = [
    ["u", ubuntu],
    ["m", mint],
  ];
  const next: TorrentRowEntry[] = [
    ["u", ubuntu],
    ["m", { ...mint, progress: 11 }],
  ];
  assert.notEqual(reuseTorrentRows(prev, next), prev);
}

console.log("torrent-list tests passed");
