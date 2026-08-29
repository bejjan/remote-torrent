import assert from "node:assert/strict";
import { handleDemoRpc } from "./demo";
import { ABOUT_RPC } from "./about";

const login = handleDemoRpc({ method: "auth.login", params: ["deluge"], id: 1 }, null);
assert.equal(login.result, true);
assert.ok(login.setCookie);
const cookie = login.setCookie!.split(";")[0];

function call(method: string, params: unknown[] = [], id = 10) {
  return handleDemoRpc({ method, params, id }, cookie);
}

assert.equal(call("web.connected").result, true);

const daemon = call(ABOUT_RPC.daemonVersion);
assert.equal(daemon.error, null, daemon.error?.message);
assert.equal(daemon.result, "2.1.1");

const lt = call(ABOUT_RPC.libtorrentVersion);
assert.equal(lt.error, null, lt.error?.message);
assert.equal(lt.result, "2.0.9.0");

assert.equal(call("web.disconnect").error, null);
assert.equal(call("web.connected").result, false);
assert.equal(call(ABOUT_RPC.daemonVersion).error?.message, "Not connected");
assert.equal(call(ABOUT_RPC.libtorrentVersion).error?.message, "Not connected");

assert.equal(call("web.connect", ["x"]).error, null);
assert.equal(call(ABOUT_RPC.daemonVersion).result, "2.1.1");

console.log("demo-about tests passed");
