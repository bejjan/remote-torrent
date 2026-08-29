import assert from "node:assert/strict";
import { handleDemoRpc, resetDelugeAdminDemo } from "./demo";
import { defaultAdminDemoConfig } from "../demo/admin-catalog";

resetDelugeAdminDemo();

const admin = defaultAdminDemoConfig({ enabled: true, count: 64, seed: 4 });

const login = handleDemoRpc({ method: "auth.login", params: ["not-deluge"], id: 1 }, null, admin);
assert.equal(login.result, true, "admin mode accepts any password");
assert.ok(login.setCookie);
const cookie = login.setCookie!.split(";")[0];

function call(method: string, params: unknown[] = [], id = 10) {
  return handleDemoRpc({ method, params, id }, cookie, admin);
}

const ui = call("web.update_ui", [["name", "state", "tracker_host"], {}]);
assert.equal(ui.error, null, ui.error?.message);
const result = ui.result as {
  torrents: Record<string, { name: string; state: string; tracker_host: string }>;
  filters: { state: [string, number][]; tracker_host: [string, number][] };
};
assert.equal(Object.keys(result.torrents).length, 64);
assert.ok(Object.values(result.torrents).some((t) => t.name.includes("&amp;") || t.name.includes("&")));
assert.ok(result.filters.tracker_host.length <= 40, "tracker filter list stays modest");
assert.ok(result.filters.state.some(([name, count]) => name === "Downloading" && count > 0));

const [tid] = Object.keys(result.torrents);
const status = call("web.get_torrent_status", [tid, ["name", "peers"]]);
assert.equal(status.error, null);
assert.ok((status.result as { name: string }).name);

const simpleLogin = handleDemoRpc({ method: "auth.login", params: ["deluge"], id: 2 }, null);
assert.equal(simpleLogin.result, true);
const simpleCookie = simpleLogin.setCookie!.split(";")[0];
const simpleUi = handleDemoRpc(
  { method: "web.update_ui", params: [["name"], {}], id: 3 },
  simpleCookie
);
assert.equal(simpleUi.error, null);
const simpleTorrents = (simpleUi.result as { torrents: Record<string, unknown> }).torrents;
assert.ok(Object.keys(simpleTorrents).length > 64, "simple demo catalog is separate and still large");
assert.ok(
  Object.values(simpleTorrents).some((t) => String((t as { name?: string }).name).includes("ubuntu")),
  "simple named demo torrents remain"
);

const again = handleDemoRpc({ method: "web.update_ui", params: [["name"], {}], id: 4 }, cookie, admin);
const againIds = Object.keys((again.result as { torrents: Record<string, unknown> }).torrents);
assert.deepEqual(againIds.sort(), Object.keys(result.torrents).sort());

console.log("deluge admin demo tests passed");
