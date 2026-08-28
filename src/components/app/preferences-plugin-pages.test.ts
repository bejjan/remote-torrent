import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PLUGIN_STUB_NOTE } from "../../lib/deluge/plugin-pages";
import { PluginStubPage } from "./plugin-pref-pages";

const dir = dirname(fileURLToPath(import.meta.url));
const dialog = readFileSync(join(dir, "preferences-dialog.tsx"), "utf8");

assert.match(dialog, /pluginPrefNavItems/);
assert.match(dialog, /fetchPluginLists/);
assert.match(dialog, /web\.get_plugins|PLUGIN_RPC\.webGetPlugins/);
assert.match(dialog, /core\.get_enabled_plugins|PLUGIN_RPC\.getEnabled/);
assert.match(dialog, /LtConfigPage/);
assert.match(dialog, /PluginStubPage/);
assert.match(dialog, /LabelPrefPage/);
assert.match(dialog, /SchedulerPage/);
assert.match(dialog, /ExtractorPage/);
assert.match(dialog, /ExecutePage/);
assert.match(dialog, /NotificationsPage/);
assert.match(dialog, /BlocklistPage/);
assert.match(dialog, /AutoAddPage/);
assert.match(dialog, /LTCONFIG_PAGE_ID/);
assert.match(dialog, /isUnknownPluginPage/);
assert.doesNotMatch(dialog, /PLUGIN_PAGES\.filter/);

const stub = renderToStaticMarkup(
  createElement(PluginStubPage, {
    name: "ItConfig",
    core: { cache_size: 512, dht: true, download_location: "/tmp" },
    setCore() {},
    extraCoreKeys: ["cache_size", "dht"],
  })
);
assert.match(stub, /ItConfig/);
assert.match(stub, /Enabled/);
assert.match(stub, /GTK/);
assert.match(stub, /cache_size/);
assert.match(stub, /dht/);
assert.doesNotMatch(stub, /download_location/);
assert.match(PLUGIN_STUB_NOTE, /GTK\/ExtJS form/);

console.log("preferences-plugin-pages tests passed");
