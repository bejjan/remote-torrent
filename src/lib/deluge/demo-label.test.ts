import assert from "node:assert/strict";
import { handleDemoRpc } from "./demo";
import { LABEL_RPC } from "./label-plugin";

const login = handleDemoRpc({ method: "auth.login", params: ["deluge"], id: 1 }, null);
assert.equal(login.result, true);
assert.ok(login.setCookie);
const cookie = login.setCookie!.split(";")[0];

function call(method: string, params: unknown[] = [], id = 10) {
  return handleDemoRpc({ method, params, id }, cookie);
}

const before = call(LABEL_RPC.getLabels);
assert.equal(before.error, null);
assert.ok(Array.isArray(before.result));
assert.ok((before.result as string[]).includes("linux"));

const name = `demo_label_${Date.now().toString(36)}`;
const added = call(LABEL_RPC.add, [name]);
assert.equal(added.error, null, added.error?.message);

const listed = call(LABEL_RPC.getLabels);
assert.ok((listed.result as string[]).includes(name));

const ui = call("web.update_ui", [[], {}]);
assert.equal(ui.error, null);
const filters = (ui.result as { filters: { label: [string, number][] } }).filters;
assert.ok(filters.label.some(([lab]) => lab === name));

const torrentId = Object.keys(
  (call("web.update_ui", [["name"], {}]).result as { torrents: Record<string, unknown> }).torrents
)[0];
assert.ok(torrentId);
const set = call(LABEL_RPC.setTorrent, [torrentId, name]);
assert.equal(set.error, null, set.error?.message);

const removed = call(LABEL_RPC.remove, [name]);
assert.equal(removed.error, null, removed.error?.message);
assert.ok(!(call(LABEL_RPC.getLabels).result as string[]).includes(name));

assert.equal(call("label.add_label", [name]).error?.message.includes("Unknown method"), true);
assert.equal(call("core.add_label", [name]).error?.message.includes("Unknown method"), true);

const disabled = call("core.disable_plugin", ["Label"]);
assert.equal(disabled.error, null);
const unknown = call(LABEL_RPC.add, ["shouldfail"]);
assert.equal(unknown.error?.message, "Unknown method");
const reenabled = call("core.enable_plugin", ["Label"]);
assert.equal(reenabled.error, null);
assert.equal(call(LABEL_RPC.getLabels).error, null);

console.log("demo-label tests passed");
