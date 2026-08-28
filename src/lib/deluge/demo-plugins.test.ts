import assert from "node:assert/strict";
import { handleDemoRpc } from "./demo";
import { PLUGIN_RPC } from "./plugins";

const login = handleDemoRpc({ method: "auth.login", params: ["deluge"], id: 1 }, null);
assert.equal(login.result, true);
assert.ok(login.setCookie);
const cookie = login.setCookie!.split(";")[0];

function call(method: string, params: unknown[] = [], id = 10) {
  return handleDemoRpc({ method, params, id }, cookie);
}

const webList = call(PLUGIN_RPC.webGetPlugins);
assert.equal(webList.error, null, webList.error?.message);
const webPlugins = webList.result as { available_plugins: string[]; enabled_plugins: string[] };
assert.ok(webPlugins.available_plugins.includes("Stats"));
assert.ok(webPlugins.available_plugins.includes("ltConfig"));
assert.ok(webPlugins.enabled_plugins.includes("Label"));
assert.equal(webPlugins.enabled_plugins.includes("Stats"), false);
assert.equal(webPlugins.enabled_plugins.includes("ltConfig"), false);

const available = call(PLUGIN_RPC.getAvailable);
assert.equal(available.error, null);
assert.ok((available.result as string[]).includes("Stats"));

const enabledBefore = call(PLUGIN_RPC.getEnabled);
assert.equal(enabledBefore.error, null);
assert.equal((enabledBefore.result as string[]).includes("Stats"), false);

const enabled = call(PLUGIN_RPC.enable, ["Stats"]);
assert.equal(enabled.error, null, enabled.error?.message);
assert.equal(enabled.result, true);
assert.ok((call(PLUGIN_RPC.getEnabled).result as string[]).includes("Stats"));
assert.ok(
  (
    call(PLUGIN_RPC.webGetPlugins).result as {
      enabled_plugins: string[];
    }
  ).enabled_plugins.includes("Stats")
);

const disabled = call(PLUGIN_RPC.disable, ["Stats"]);
assert.equal(disabled.error, null, disabled.error?.message);
assert.equal((call(PLUGIN_RPC.getEnabled).result as string[]).includes("Stats"), false);

assert.equal(call("scheduler.get_config").error, null);
const schedulerOff = call(PLUGIN_RPC.disable, ["Scheduler"]);
assert.equal(schedulerOff.error, null);
assert.equal(call("scheduler.get_config").error?.message, "Unknown method");
assert.equal(call(PLUGIN_RPC.enable, ["Scheduler"]).error, null);

for (const wrong of ["plugin.enable", "web.enable_plugin_typo", "core.enablePlugin"]) {
  const res = call(wrong, ["Stats"]);
  assert.equal(res.error?.message, `Unknown method: ${wrong}`, wrong);
}

console.log("demo-plugins tests passed");
