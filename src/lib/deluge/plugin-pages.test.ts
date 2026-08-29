import assert from "node:assert/strict";
import {
  FIRST_PARTY_PLUGIN_PAGES,
  LTCONFIG_CORE_KEYS,
  LTCONFIG_PAGE_ID,
  PLUGIN_STUB_NOTE,
  isLtConfigPlugin,
  isUnknownPluginPage,
  pluginNameKey,
  pluginNamesEqual,
  pluginPrefNavItems,
  relatedCoreConfigEntries,
  unknownPluginPageId,
} from "./plugin-pages";

assert.equal(pluginNameKey(" ltConfig "), "ltconfig");
assert.equal(pluginNamesEqual("ltConfig", "LtConfig"), true);
assert.equal(pluginNamesEqual("ltConfig", "ItConfig"), false);

assert.equal(isLtConfigPlugin("ltConfig"), true);
assert.equal(isLtConfigPlugin("ltconfig"), true);
assert.equal(isLtConfigPlugin("LTConfig"), true);
assert.equal(isLtConfigPlugin("ItConfig"), true);
assert.equal(isLtConfigPlugin("itconfig"), true);
assert.equal(isLtConfigPlugin("Scheduler"), false);
assert.equal(isLtConfigPlugin("Stats"), false);

const firstPartyNames = FIRST_PARTY_PLUGIN_PAGES.map((p) => p.plugin);
assert.deepEqual(firstPartyNames, [
  "Label",
  "Scheduler",
  "Extractor",
  "Execute",
  "Notifications",
  "Blocklist",
  "AutoAdd",
]);

const enabled = [
  "Label",
  "scheduler",
  "ltConfig",
  "Stats",
  "ltConfig",
  "",
  "ItConfig",
];
const nav = pluginPrefNavItems(enabled);
assert.deepEqual(
  nav.map((item) => [item.id, item.label, item.kind]),
  [
    ["label", "Label", "first-party"],
    ["scheduler", "Scheduler", "first-party"],
    [LTCONFIG_PAGE_ID, "ltConfig", "ltconfig"],
    [unknownPluginPageId("Stats"), "Stats", "unknown"],
  ]
);

const itNav = pluginPrefNavItems(["ItConfig"]);
assert.equal(itNav.length, 1);
assert.equal(itNav[0].id, LTCONFIG_PAGE_ID);
assert.equal(itNav[0].label, "ItConfig");
assert.equal(itNav[0].kind, "ltconfig");

assert.equal(isUnknownPluginPage("plugin:stats"), true);
assert.equal(isUnknownPluginPage("ltconfig"), false);
assert.equal(unknownPluginPageId("Stats"), "plugin:stats");

const core = {
  cache_size: 512,
  dht: true,
  stats_interval: 5,
  download_location: "/tmp",
  max_connections_global: 200,
};
const statsKeys = relatedCoreConfigEntries("Stats", core);
assert.deepEqual(
  statsKeys.map(([k]) => k),
  ["stats_interval"]
);
const ltKeys = relatedCoreConfigEntries("ltConfig", core, LTCONFIG_CORE_KEYS);
assert.ok(ltKeys.some(([k]) => k === "cache_size"));
assert.ok(ltKeys.some(([k]) => k === "dht"));
assert.ok(ltKeys.some(([k]) => k === "max_connections_global"));
assert.ok(!ltKeys.some(([k]) => k === "download_location"));

assert.match(PLUGIN_STUB_NOTE, /GTK\/ExtJS form/);

console.log("plugin-pages tests passed");
