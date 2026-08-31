import assert from "node:assert/strict";
import { isQbittorrentLoginOk, qbittorrentSessionCookieHeader } from "./proxy";

assert.equal(
  qbittorrentSessionCookieHeader("nova_qb_auth=abc; SID=session; theme=dark"),
  "SID=session"
);
assert.equal(
  qbittorrentSessionCookieHeader("QBT_SID_8080=abc; nova_qb_auth=nope"),
  "QBT_SID_8080=abc"
);
assert.equal(qbittorrentSessionCookieHeader("nova_qb_auth=abc"), undefined);
assert.equal(qbittorrentSessionCookieHeader(null), undefined);

assert.equal(isQbittorrentLoginOk("Ok."), true);
assert.equal(isQbittorrentLoginOk("Ok"), true);
assert.equal(isQbittorrentLoginOk(null), false);
assert.equal(isQbittorrentLoginOk(null, ["QBT_SID_8080=abc; Path=/"]), true);
assert.equal(isQbittorrentLoginOk(null, ["SID=abc"]), true);
assert.equal(isQbittorrentLoginOk(null, ["nova_qb_auth=nope"]), false);

console.log("qbittorrent proxy tests passed");
