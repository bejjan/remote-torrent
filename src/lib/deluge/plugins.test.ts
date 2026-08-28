import assert from "node:assert/strict";
import {
  PLUGIN_RPC,
  formatUnknownMethodMessage,
  pluginToggleErrorMessage,
  pluginToggleMethod,
} from "./plugins";

assert.equal(PLUGIN_RPC.enable, "core.enable_plugin");
assert.equal(PLUGIN_RPC.disable, "core.disable_plugin");
assert.equal(PLUGIN_RPC.getAvailable, "core.get_available_plugins");
assert.equal(PLUGIN_RPC.getEnabled, "core.get_enabled_plugins");
assert.equal(PLUGIN_RPC.webGetPlugins, "web.get_plugins");

assert.equal(pluginToggleMethod(true), "core.enable_plugin");
assert.equal(pluginToggleMethod(false), "core.disable_plugin");

assert.equal(
  formatUnknownMethodMessage("core.enable_plugin", "Unknown method"),
  "Unknown method: core.enable_plugin"
);
assert.equal(
  formatUnknownMethodMessage("core.disable_plugin", "Unknown method: web.enable_plugin"),
  "Unknown method: web.enable_plugin"
);
assert.equal(formatUnknownMethodMessage("core.enable_plugin", "Permission denied"), "Permission denied");

assert.equal(
  pluginToggleErrorMessage("core.enable_plugin", new Error("Unknown method")),
  "Unknown method: core.enable_plugin"
);
assert.equal(
  pluginToggleErrorMessage("core.disable_plugin", new Error("Plugin already disabled")),
  "Plugin already disabled"
);

console.log("plugins tests passed");
