import assert from "node:assert/strict";
import { extractExplicitPort, stripExplicitPort } from "./web-url";

assert.equal(extractExplicitPort("http://127.0.0.1:8080"), "8080");
assert.equal(extractExplicitPort("http://127.0.0.1"), null);
assert.equal(extractExplicitPort(""), null);
assert.equal(stripExplicitPort("http://127.0.0.1:8080"), "http://127.0.0.1");
assert.equal(stripExplicitPort("http://192.168.1.10:8112"), "http://192.168.1.10");
assert.equal(stripExplicitPort("http://host:9091/transmission/rpc"), "http://host/transmission/rpc");
assert.equal(stripExplicitPort("127.0.0.1:8080"), "127.0.0.1");
assert.equal(stripExplicitPort("https://nas.local:443/qb"), "https://nas.local/qb");
assert.equal(stripExplicitPort("http://127.0.0.1"), "http://127.0.0.1");
assert.equal(stripExplicitPort("  "), "");

console.log("web-url port display tests passed");
