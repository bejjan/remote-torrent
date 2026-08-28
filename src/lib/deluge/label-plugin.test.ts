import assert from "node:assert/strict";
import {
  LABEL_PLUGIN_ENABLE_HINT,
  LABEL_RPC,
  enabledPluginNames,
  invalidLabelIdMessage,
  isLabelPluginEnabled,
  isUnknownMethodMessage,
  labelRpcErrorMessage,
  normalizeLabelId,
} from "./label-plugin";

assert.equal(LABEL_RPC.add, "label.add");
assert.equal(LABEL_RPC.remove, "label.remove");
assert.equal(LABEL_RPC.setTorrent, "label.set_torrent");
assert.equal(LABEL_RPC.getLabels, "label.get_labels");

assert.deepEqual(enabledPluginNames(["Label", "Scheduler"]), ["Label", "Scheduler"]);
assert.deepEqual(enabledPluginNames({ enabled_plugins: ["Label"] }), ["Label"]);
assert.deepEqual(enabledPluginNames({ enabledPlugins: ["Blocklist"] }), ["Blocklist"]);
assert.deepEqual(enabledPluginNames(null), []);

assert.equal(isLabelPluginEnabled(["Label"]), true);
assert.equal(isLabelPluginEnabled(["label"]), true);
assert.equal(isLabelPluginEnabled(["Scheduler"]), false);
assert.equal(isLabelPluginEnabled({ enabled_plugins: ["Extractor"] }), false);

assert.equal(isUnknownMethodMessage("Unknown method"), true);
assert.equal(isUnknownMethodMessage("Unknown method: label.add"), true);
assert.equal(isUnknownMethodMessage("Invalid label"), false);

assert.equal(labelRpcErrorMessage(new Error("Unknown method")), LABEL_PLUGIN_ENABLE_HINT);
assert.equal(labelRpcErrorMessage(new Error("Plugin not enabled")), LABEL_PLUGIN_ENABLE_HINT);
assert.equal(labelRpcErrorMessage(new Error("Label already exists")), "Label already exists");

assert.equal(normalizeLabelId("  Movies "), "movies");
assert.equal(invalidLabelIdMessage("linux"), null);
assert.equal(invalidLabelIdMessage("tv.shows"), null);
assert.ok(invalidLabelIdMessage("my label"));
assert.ok(invalidLabelIdMessage(""));

console.log("label-plugin tests passed");
