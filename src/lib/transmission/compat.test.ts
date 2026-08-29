import assert from "node:assert/strict";
import { handleTransmissionCompat } from "./compat";
import { handleTransmissionDemoRpc, TX_SESSION_COOKIE } from "./demo";

async function run() {
  const login = await handleTransmissionCompat(
    { method: "auth.login", params: ["deluge"], id: 1 },
    { demo: true, cookieHeader: null }
  );
  assert.equal(login.result, true);
  assert.ok(login.setCookie);
  const cookie = String(Array.isArray(login.setCookie) ? login.setCookie[0] : login.setCookie)
    .split(";")[0];
  assert.match(cookie, new RegExp(`${TX_SESSION_COOKIE}=`));

  const bad = await handleTransmissionCompat(
    { method: "auth.login", params: ["nope"], id: 2 },
    { demo: true, cookieHeader: null }
  );
  assert.equal(bad.result, false);

  const session = await handleTransmissionCompat(
    { method: "auth.check_session", id: 3 },
    { demo: true, cookieHeader: cookie }
  );
  assert.equal(session.result, true);

  const ui = await handleTransmissionCompat(
    { method: "web.update_ui", params: [["name", "state", "progress"], {}], id: 4 },
    { demo: true, cookieHeader: cookie }
  );
  assert.equal(ui.error, null);
  const result = ui.result as {
    connected: boolean;
    torrents: Record<string, { name: string; state: string }>;
    filters: { state: [string, number][] };
    stats: { download_rate: number };
  };
  assert.equal(result.connected, true);
  assert.ok(Object.keys(result.torrents).length > 0);
  assert.ok(result.filters.state.some(([name]) => name === "Downloading"));
  assert.equal(typeof result.stats.download_rate, "number");

  const paused = Object.entries(result.torrents).find(([, t]) => t.state === "Paused" || t.state === "Downloading");
  assert.ok(paused);
  const [hash] = paused;

  const stop = await handleTransmissionCompat(
    { method: "core.pause_torrent", params: [[hash]], id: 5 },
    { demo: true, cookieHeader: cookie }
  );
  assert.equal(stop.error, null);

  const start = await handleTransmissionCompat(
    { method: "core.resume_torrent", params: [[hash]], id: 6 },
    { demo: true, cookieHeader: cookie }
  );
  assert.equal(start.error, null);

  const files = await handleTransmissionCompat(
    { method: "web.get_torrent_files", params: [hash], id: 7 },
    { demo: true, cookieHeader: cookie }
  );
  assert.equal((files.result as { type: string }).type, "dir");

  const plugins = await handleTransmissionCompat(
    { method: "web.get_plugins", id: 8 },
    { demo: true, cookieHeader: cookie }
  );
  assert.deepEqual((plugins.result as { enabled_plugins: string[] }).enabled_plugins, ["Label"]);

  const raw = handleTransmissionDemoRpc({ method: "session-get", arguments: { fields: ["version"] } });
  assert.equal(raw.result, "success");
  assert.ok(String((raw.arguments as { version?: string }).version).includes("demo"));

  const unauth = await handleTransmissionCompat(
    { method: "web.update_ui", params: [[], {}], id: 9 },
    { demo: true, cookieHeader: null }
  );
  assert.ok(unauth.error);
}

run()
  .then(() => {
    console.log("transmission compat tests passed");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
