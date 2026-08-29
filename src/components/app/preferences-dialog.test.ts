import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "preferences-dialog.tsx"), "utf8");

assert.match(source, /CORE_NAV_GROUPS/);
assert.match(source, /dirtyConfig/);
assert.match(source, /core\.set_config/);
assert.match(source, /web\.set_config/);
assert.match(source, /max-w-3xl/);
assert.match(source, /sm:grid-cols-2/);
assert.match(source, /max-w-28/);
assert.match(source, /ENC_POLICY_SELECT_ITEMS/);
assert.match(source, /ENC_LEVEL_SELECT_ITEMS/);
assert.match(source, /checked=\{checked === true\}/);
assert.match(source, /compact_allocation/);
assert.match(source, /outgoing_ports/);
assert.match(source, /enc_in_policy/);
assert.match(source, /enc_out_policy/);
assert.match(source, /enc_level/);
assert.match(source, /peer_tos/);
assert.match(source, /max_connections_per_second/);
assert.match(source, /share_ratio_limit/);
assert.match(source, /proxy_hostnames/);
assert.match(source, /anonymous_mode/);
assert.match(source, /announce_ip/);
assert.match(source, /WEB_LANGUAGE_METHODS/);
assert.match(source, /LabelPrefPage/);
assert.match(source, /LtConfigPage/);
assert.match(source, /PluginStubPage/);
assert.match(source, /show_session_speed/);
assert.match(source, /show_sidebar/);
assert.match(source, /TransmissionPreferences/);
assert.doesNotMatch(source, /lorem ipsum/i);

console.log("preferences-dialog tests passed");
