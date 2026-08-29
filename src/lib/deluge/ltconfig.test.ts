import assert from "node:assert/strict";
import {
  isUnknownMethodError,
  loadLtConfig,
  ltConfigGetMethods,
  ltConfigPluginEnabled,
  ltConfigRpcPrefixes,
  ltConfigSetMethods,
  parseLtConfigPayload,
  payloadForLtConfigSet,
  saveLtConfig,
} from "./ltconfig";

assert.deepEqual(ltConfigRpcPrefixes("ltConfig"), ["ltconfig", "itconfig"]);
assert.deepEqual(ltConfigRpcPrefixes("ItConfig"), ["itconfig", "ltconfig"]);

const gets = ltConfigGetMethods("ltConfig");
assert.ok(gets.includes("ltconfig.get_settings"));
assert.ok(gets.includes("ltconfig.get_config"));
assert.ok(gets.includes("ltconfig.get_preferences"));
assert.ok(gets.includes("itconfig.get_settings"));
assert.ok(gets.indexOf("ltconfig.get_settings") < gets.indexOf("itconfig.get_settings"));

const itGets = ltConfigGetMethods("ItConfig");
assert.ok(itGets.indexOf("itconfig.get_settings") < itGets.indexOf("ltconfig.get_settings"));

assert.ok(ltConfigSetMethods("ltConfig", "ltconfig.get_settings").includes("ltconfig.set_preferences"));
assert.ok(ltConfigSetMethods("ltConfig", "ltconfig.get_settings").includes("ltconfig.set_settings"));

assert.deepEqual(parseLtConfigPayload(null), null);
assert.deepEqual(parseLtConfigPayload([1]), null);
assert.deepEqual(parseLtConfigPayload({ connections_limit: 200, anonymous_mode: false }), {
  settings: { connections_limit: 200, anonymous_mode: false },
});
assert.deepEqual(
  parseLtConfigPayload({ apply_on_start: true, settings: { cache_size: 1024 } }),
  { settings: { cache_size: 1024 }, applyOnStart: true }
);

assert.equal(isUnknownMethodError(new Error("Unknown method")), true);
assert.equal(isUnknownMethodError(new Error("Unknown method: ltconfig.get_config")), true);
assert.equal(isUnknownMethodError(new Error("Permission denied")), false);

assert.equal(ltConfigPluginEnabled(["Label", "ltConfig"]), true);
assert.equal(ltConfigPluginEnabled(["ItConfig"]), true);
assert.equal(ltConfigPluginEnabled(["Scheduler"]), false);

assert.deepEqual(payloadForLtConfigSet("ltconfig.set_preferences", { a: 1 }, true), [
  { apply_on_start: true, settings: { a: 1 } },
]);
assert.deepEqual(payloadForLtConfigSet("ltconfig.set_settings", { a: 1 }, true), [{ a: 1 }]);

const rpcStore: Record<string, unknown> = {};
async function mockCall(method: string, params?: unknown[]) {
  if (method === "ltconfig.get_settings") return { connections_limit: 50, cache_size: 128 };
  if (method === "ltconfig.get_preferences") return { apply_on_start: true, settings: { cache_size: 128 } };
  if (method.startsWith("itconfig.")) throw new Error("Unknown method");
  if (method === "ltconfig.get_config") throw new Error("Unknown method");
  if (method === "ltconfig.get_lt_settings") throw new Error("Unknown method");
  if (method === "ltconfig.set_preferences") {
    rpcStore.prefs = params?.[0];
    return null;
  }
  throw new Error(`Unknown method: ${method}`);
}

async function noneCall(method: string) {
  throw new Error(`Unknown method: ${method}`);
}

async function run() {
  const loaded = await loadLtConfig(mockCall, "ltConfig");
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  assert.equal(loaded.applyOnStart, true);
  assert.equal(loaded.settings.connections_limit, 50);
  assert.equal(loaded.settings.cache_size, 128);
  assert.equal(loaded.getMethod, "ltconfig.get_settings");
  const saved = await saveLtConfig(mockCall, loaded.setMethods, loaded.settings, loaded.applyOnStart);
  assert.equal(saved, "ltconfig.set_preferences");
  assert.deepEqual(rpcStore.prefs, {
    apply_on_start: true,
    settings: { connections_limit: 50, cache_size: 128 },
  });
  assert.deepEqual(await loadLtConfig(noneCall, "ItConfig"), { ok: false });
  console.log("ltconfig tests passed");
}

void run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
