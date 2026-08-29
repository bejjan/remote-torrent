import assert from "node:assert/strict";
import { handleDemoRpc } from "./demo";

const login = handleDemoRpc({ method: "auth.login", params: ["deluge"], id: 1 }, null);
assert.equal(login.result, true);
assert.ok(login.setCookie);
const cookie = login.setCookie!.split(";")[0];

function call(method: string, params: unknown[] = [], id = 10) {
  return handleDemoRpc({ method, params, id }, cookie);
}

const before = call("web.get_config");
assert.equal(before.error, null, before.error?.message);
const initial = before.result as Record<string, unknown>;
assert.equal(typeof initial.show_session_speed, "boolean");

const saved = Boolean(initial.show_session_speed);
const flipped = !saved;

const setOff = call("web.set_config", [{ show_session_speed: flipped }]);
assert.equal(setOff.error, null, setOff.error?.message);

const after = call("web.get_config");
assert.equal(after.error, null, after.error?.message);
assert.equal((after.result as Record<string, unknown>).show_session_speed, flipped);

const restore = call("web.set_config", [{ show_session_speed: saved }]);
assert.equal(restore.error, null, restore.error?.message);
assert.equal(
  (call("web.get_config").result as Record<string, unknown>).show_session_speed,
  saved
);

console.log("demo-web-config tests passed");
