import assert from "node:assert/strict";
import { handleDemoRpc } from "./demo";
import { normalizeTorrentName } from "./torrent-name";

const DUNE = "Dune.Part.Two.2024.REPACK.2160p.UPSCALE.WEB.HEVC.10Bit.AAC.2.0-R&H.mkv";

const login = handleDemoRpc({ method: "auth.login", params: ["deluge"], id: 1 }, null);
assert.equal(login.result, true);
assert.ok(login.setCookie);
const cookie = login.setCookie!.split(";")[0];

function call(method: string, params: unknown[] = [], id = 10) {
  return handleDemoRpc({ method, params, id }, cookie);
}

const ui = call("web.update_ui", [["name"], {}]);
assert.equal(ui.error, null, ui.error?.message);
const torrents = (ui.result as { torrents: Record<string, { name: string }> }).torrents;
const dune = Object.entries(torrents).find(([, t]) => t.name.includes("Dune"));
assert.ok(dune, "demo should include the Dune torrent with an ampersand in the name");
const [duneId, duneRow] = dune;
assert.equal(duneRow.name.includes("&amp;"), true, "web.update_ui HTML-escapes name");
assert.equal(duneRow.name.includes("R&H"), false);
assert.equal(normalizeTorrentName(duneRow.name), DUNE);

const status = call("web.get_torrent_status", [duneId, ["name"]]);
assert.equal(status.error, null, status.error?.message);
assert.equal((status.result as { name: string }).name, DUNE);

const core = call("core.get_torrent_status", [duneId, ["name"]]);
assert.equal((core.result as { name: string }).name, DUNE);

console.log("demo torrent-name tests passed");
