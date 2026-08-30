import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ABOUT_APP_NAME,
  ABOUT_DAEMON_UNAVAILABLE,
  ABOUT_LICENSE,
  ABOUT_PROJECT_LABEL,
  ABOUT_RPC,
  ABOUT_TAGLINE,
  UI_VERSION,
  loadAboutInfo,
} from "./about";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };

assert.equal(ABOUT_APP_NAME, "torro");
assert.equal(ABOUT_TAGLINE, "modern Web UI for Deluge, Transmission, and qBittorrent");
assert.equal(ABOUT_LICENSE, "GPL-3.0");
assert.equal(ABOUT_PROJECT_LABEL, "Deluge project");
assert.equal(ABOUT_RPC.daemonVersion, "core.get_version");
assert.equal(ABOUT_RPC.libtorrentVersion, "core.get_libtorrent_version");
assert.equal(UI_VERSION, pkg.version);
assert.match(ABOUT_DAEMON_UNAVAILABLE, /unavailable/i);

type RpcMap = Record<string, unknown | Error>;

function mockRpc(map: RpcMap) {
  return async <T = unknown>(method: string): Promise<T> => {
    if (!(method in map)) throw new Error(`Unknown method: ${method}`);
    const value = map[method];
    if (value instanceof Error) throw value;
    return value as T;
  };
}

async function run() {
  {
    const info = await loadAboutInfo(
      mockRpc({
        "web.connected": true,
        "core.get_version": "2.1.1",
        "core.get_libtorrent_version": "2.0.9.0",
      })
    );
    assert.equal(info.uiVersion, pkg.version);
    assert.equal(info.connected, true);
    assert.equal(info.daemonVersion, "2.1.1");
    assert.equal(info.libtorrentVersion, "2.0.9.0");
  }

  {
    const info = await loadAboutInfo(mockRpc({ "web.connected": false }));
    assert.equal(info.uiVersion, pkg.version);
    assert.equal(info.connected, false);
    assert.equal(info.daemonVersion, null);
    assert.equal(info.libtorrentVersion, null);
  }

  {
    const info = await loadAboutInfo(
      mockRpc({
        "web.connected": true,
        "core.get_version": "2.1.1",
        "core.get_libtorrent_version": new Error("Unknown method"),
      })
    );
    assert.equal(info.connected, true);
    assert.equal(info.daemonVersion, "2.1.1");
    assert.equal(info.libtorrentVersion, null);
  }

  {
    const info = await loadAboutInfo(mockRpc({ "web.connected": new Error("offline") }));
    assert.equal(info.connected, false);
    assert.equal(info.daemonVersion, null);
    assert.equal(info.uiVersion, pkg.version);
  }
}

run()
  .then(() => {
    console.log("about tests passed");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
