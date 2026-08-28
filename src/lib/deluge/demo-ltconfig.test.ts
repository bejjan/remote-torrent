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

const available = call(PLUGIN_RPC.webGetPlugins).result as {
  available_plugins: string[];
  enabled_plugins: string[];
};
assert.ok(available.available_plugins.includes("ltConfig"));
assert.equal(available.enabled_plugins.some((p) => p.toLowerCase() === "ltconfig"), false);

const disabledRpc = call("ltconfig.get_settings");
assert.match(String(disabledRpc.error?.message), /unknown method/i);

const enabled = call(PLUGIN_RPC.enable, ["ltConfig"]);
assert.equal(enabled.error, null, enabled.error?.message);
assert.ok(
  (call(PLUGIN_RPC.getEnabled).result as string[]).includes("ltConfig")
);

const settings = call("ltconfig.get_settings");
assert.equal(settings.error, null, settings.error?.message);
const dict = settings.result as Record<string, unknown>;
assert.equal(dict.connections_limit, 200);
assert.equal(dict.anonymous_mode, false);
assert.equal(typeof dict.cache_size, "number");

const prefs = call("ltconfig.get_preferences");
assert.equal(prefs.error, null, prefs.error?.message);
const prefDict = prefs.result as { apply_on_start: boolean; settings: Record<string, unknown> };
assert.equal(prefDict.apply_on_start, false);
assert.deepEqual(prefDict.settings, {});

const saved = call("ltconfig.set_preferences", [
  { apply_on_start: true, settings: { ...dict, connections_limit: 400, anonymous_mode: true } },
]);
assert.equal(saved.error, null, saved.error?.message);

const after = call("ltconfig.get_settings").result as Record<string, unknown>;
assert.equal(after.connections_limit, 400);
assert.equal(after.anonymous_mode, true);

const prefsAfter = call("ltconfig.get_preferences").result as {
  apply_on_start: boolean;
  settings: Record<string, unknown>;
};
assert.equal(prefsAfter.apply_on_start, true);
assert.equal(prefsAfter.settings.connections_limit, 400);

const alias = call("ltconfig.get_config");
assert.equal(alias.error, null, alias.error?.message);
assert.equal((alias.result as Record<string, unknown>).connections_limit, 400);

call(PLUGIN_RPC.disable, ["ltConfig"]);
assert.equal((call(PLUGIN_RPC.getEnabled).result as string[]).includes("ltConfig"), false);

const asItConfig = call(PLUGIN_RPC.enable, ["ItConfig"]);
assert.equal(asItConfig.error, null, asItConfig.error?.message);
assert.ok((call(PLUGIN_RPC.getEnabled).result as string[]).includes("ItConfig"));
const itSettings = call("itconfig.get_settings");
assert.equal(itSettings.error, null, itSettings.error?.message);
assert.equal((itSettings.result as Record<string, unknown>).connections_limit, 400);
const ltWhileIt = call("ltconfig.get_settings");
assert.equal(ltWhileIt.error, null, ltWhileIt.error?.message);

call(PLUGIN_RPC.enable, ["ltConfig"]);
assert.equal(
  (call(PLUGIN_RPC.getEnabled).result as string[]).filter((p) => /config/i.test(p)).length,
  1,
  "ItConfig and ltConfig must not both be enabled"
);

call(PLUGIN_RPC.disable, ["ItConfig"]);
assert.equal(call("ltconfig.get_settings").error?.message, "Unknown method");

console.log("demo-ltconfig tests passed");
