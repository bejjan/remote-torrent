import assert from "node:assert/strict";
import { handleTransmissionCompat } from "./compat";
import { resetTransmissionAdminDemo } from "./demo";
import { defaultAdminDemoConfig } from "../demo/admin-catalog";

resetTransmissionAdminDemo();

const admin = defaultAdminDemoConfig({ enabled: true, count: 64, seed: 4 });

async function run() {
  const login = await handleTransmissionCompat(
    { method: "auth.login", params: ["anything"], id: 1 },
    { demo: true, cookieHeader: null, admin }
  );
  assert.equal(login.result, true, "admin mode accepts any password");
  const cookie = String(Array.isArray(login.setCookie) ? login.setCookie[0] : login.setCookie).split(
    ";"
  )[0];

  const ui = await handleTransmissionCompat(
    { method: "web.update_ui", params: [["name", "state"], {}], id: 2 },
    { demo: true, cookieHeader: cookie, admin }
  );
  assert.equal(ui.error, null, ui.error?.message);
  const result = ui.result as {
    torrents: Record<string, { name: string; state: string }>;
    filters: { tracker_host: [string, number][] };
  };
  assert.equal(Object.keys(result.torrents).length, 64);
  assert.ok(Object.values(result.torrents).some((t) => t.name.includes("&")));
  assert.ok(result.filters.tracker_host.length <= 40);

  const [hash] = Object.keys(result.torrents);
  const files = await handleTransmissionCompat(
    { method: "web.get_torrent_files", params: [hash], id: 3 },
    { demo: true, cookieHeader: cookie, admin }
  );
  assert.equal((files.result as { type: string }).type, "dir");

  const simpleLogin = await handleTransmissionCompat(
    { method: "auth.login", params: ["deluge"], id: 4 },
    { demo: true, cookieHeader: null }
  );
  assert.equal(simpleLogin.result, true);
  const simpleCookie = String(
    Array.isArray(simpleLogin.setCookie) ? simpleLogin.setCookie[0] : simpleLogin.setCookie
  ).split(";")[0];
  const simpleUi = await handleTransmissionCompat(
    { method: "web.update_ui", params: [["name"], {}], id: 5 },
    { demo: true, cookieHeader: simpleCookie }
  );
  const simpleCount = Object.keys(
    (simpleUi.result as { torrents: Record<string, unknown> }).torrents
  ).length;
  assert.ok(simpleCount > 0 && simpleCount < 20, "simple Transmission demo stays small");
}

run()
  .then(() => {
    console.log("transmission admin demo tests passed");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
