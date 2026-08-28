import assert from "node:assert/strict";
import { handleDemoRpc, handleDemoUpload } from "./demo";
import { infoFileIndexes, normalizeFilesTree, type TorrentFileInfo } from "./files-tree";

const login = handleDemoRpc({ method: "auth.login", params: ["deluge"], id: 1 }, null);
assert.equal(login.result, true);
assert.ok(login.setCookie);
const cookie = login.setCookie!.split(";")[0];

const uploaded = handleDemoUpload("Open.Source.Show.torrent", 12_000_000);
assert.equal(uploaded.success, true);
assert.ok(uploaded.files[0]);

const infoRes = handleDemoRpc(
  { method: "web.get_torrent_info", params: [uploaded.files[0]], id: 2 },
  cookie
);
assert.equal(infoRes.error, null);
const info = infoRes.result as TorrentFileInfo;
assert.equal(info.name, "Open.Source.Show");
assert.match(info.info_hash, /^[0-9a-f]{40}$/);
const tree = normalizeFilesTree(info.files_tree);
assert.ok(tree);
assert.equal(infoFileIndexes(tree).length, 3);
assert.ok(tree.contents["Open.Source.Show"]);

const added = handleDemoRpc(
  {
    method: "web.add_torrents",
    params: [
      [
        {
          path: uploaded.files[0],
          options: {
            download_location: "/tmp/downloads",
            add_paused: true,
            sequential_download: true,
            prioritize_first_last_pieces: true,
            move_completed: true,
            move_completed_path: "/tmp/done",
            file_priorities: [4, 0, 7],
          },
        },
      ],
    ],
    id: 3,
  },
  cookie
);
assert.equal(added.error, null);
assert.equal(added.result, true);

const magnet = handleDemoRpc(
  {
    method: "web.get_magnet_info",
    params: ["magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Magnet%20Demo"],
    id: 4,
  },
  cookie
);
assert.equal(magnet.error, null);
const mag = magnet.result as { name: string; info_hash: string; files_tree: string };
assert.equal(mag.info_hash, "0123456789abcdef0123456789abcdef01234567");
assert.equal(mag.name, "Magnet Demo");
assert.equal(mag.files_tree, "");

const urlDl = handleDemoRpc(
  { method: "web.download_torrent_from_url", params: ["https://example.com/remote.torrent"], id: 5 },
  cookie
);
assert.equal(urlDl.error, null);
assert.equal(typeof urlDl.result, "string");
const urlInfo = handleDemoRpc(
  { method: "web.get_torrent_info", params: [urlDl.result], id: 6 },
  cookie
);
const urlTorrent = urlInfo.result as TorrentFileInfo;
assert.equal(urlTorrent.name, "remote");
assert.ok(normalizeFilesTree(urlTorrent.files_tree));

console.log("demo add-torrent tests passed");
