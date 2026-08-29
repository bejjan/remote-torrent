import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleDemoRpc } from "./demo";

const login = handleDemoRpc({ method: "auth.login", params: ["deluge"], id: 1 }, null);
assert.equal(login.result, true);
assert.ok(login.setCookie);
const cookie = login.setCookie!.split(";")[0];

function call(method: string, params: unknown[] = [], id = 10) {
  return handleDemoRpc({ method, params, id }, cookie);
}

const cfgRes = call("core.get_config");
assert.equal(cfgRes.error, null, cfgRes.error?.message);
const cfg = cfgRes.result as Record<string, unknown>;

const required = [
  "download_location",
  "move_completed",
  "move_completed_path",
  "copy_torrent_file",
  "torrentfiles_location",
  "del_copy_torrent_file",
  "add_paused",
  "sequential_download",
  "prioritize_first_last_pieces",
  "pre_allocate_storage",
  "compact_allocation",
  "listen_ports",
  "random_port",
  "listen_interface",
  "outgoing_interface",
  "outgoing_ports",
  "random_outgoing_ports",
  "enc_in_policy",
  "enc_out_policy",
  "enc_level",
  "dht",
  "lsd",
  "utpex",
  "upnp",
  "natpmp",
  "utp",
  "peer_tos",
  "max_download_speed",
  "max_upload_speed",
  "max_connections_global",
  "max_upload_slots_global",
  "max_half_open_connections",
  "max_connections_per_second",
  "ignore_limits_on_local_network",
  "rate_limit_ip_overhead",
  "max_download_speed_per_torrent",
  "max_upload_speed_per_torrent",
  "max_connections_per_torrent",
  "max_upload_slots_per_torrent",
  "queue_new_to_top",
  "max_active_limit",
  "max_active_downloading",
  "max_active_seeding",
  "dont_count_slow_torrents",
  "share_ratio_limit",
  "seed_time_ratio_limit",
  "seed_time_limit",
  "stop_seed_at_ratio",
  "stop_seed_ratio",
  "remove_seed_at_ratio",
  "cache_size",
  "cache_expiry",
  "daemon_port",
  "allow_remote",
  "new_release_check",
  "geoip_db_location",
  "announce_ip",
  "proxy",
];

for (const key of required) {
  assert.ok(key in cfg, `demo core.get_config missing ${key}`);
}

const proxy = cfg.proxy as Record<string, unknown>;
assert.equal(typeof proxy.type, "number");
assert.equal("proxy_hostnames" in proxy, true);
assert.equal("proxy_peer_connections" in proxy, true);
assert.equal("proxy_tracker_connections" in proxy, true);
assert.equal("anonymous_mode" in proxy, true);

const dirty = call("core.set_config", [{ utp: false, max_connections_per_second: 8 }]);
assert.equal(dirty.error, null, dirty.error?.message);
const after = call("core.get_config").result as Record<string, unknown>;
assert.equal(after.utp, false);
assert.equal(after.max_connections_per_second, 8);

const langs = call("web.get_languages");
assert.equal(langs.error, null, langs.error?.message);
assert.ok(Array.isArray(langs.result));
assert.ok((langs.result as [string, string][]).some((row) => row[0] === "en"));

const dir = dirname(fileURLToPath(import.meta.url));
const demoSrc = readFileSync(join(dir, "demo.ts"), "utf8");
assert.match(demoSrc, /web\.get_languages/);
assert.match(demoSrc, /compact_allocation/);
assert.match(demoSrc, /enc_in_policy/);
assert.match(demoSrc, /max_connections_per_second/);

console.log("demo-core-config tests passed");
