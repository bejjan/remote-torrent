import assert from "node:assert/strict";
import {
  PROXY_CONNECT_TIMEOUT_MS,
  PROXY_REQUEST_TIMEOUT_MS,
  describeProxyError,
} from "./proxy";

assert.equal(PROXY_CONNECT_TIMEOUT_MS, 15_000);
assert.equal(PROXY_REQUEST_TIMEOUT_MS, 60_000);

{
  const message = describeProxyError(
    { code: "UND_ERR_CONNECT_TIMEOUT", message: "Connect Timeout Error" },
    "http://192.168.1.175:8112"
  );
  assert.match(message, /Timed out after 15s connecting to Deluge Web/);
  assert.match(message, /192\.168\.1\.175:8112/);
  assert.match(message, /daemon is running/);
}

{
  const abort = new Error("The operation was aborted due to timeout");
  abort.name = "TimeoutError";
  const message = describeProxyError(abort, "http://192.168.1.175:8112");
  assert.match(message, /Timed out after 60s waiting for Deluge Web to respond/);
  assert.match(message, /192\.168\.1\.175:8112/);
  assert.doesNotMatch(message, /connecting/);
  assert.doesNotMatch(message, /daemon is running/);
}

{
  const message = describeProxyError(
    { code: "UND_ERR_HEADERS_TIMEOUT", message: "Headers Timeout Error" },
    "http://192.168.1.175:8112"
  );
  assert.match(message, /waiting for Deluge Web to respond/);
  assert.doesNotMatch(message, /connecting/);
}

{
  const message = describeProxyError(
    { code: "UND_ERR_BODY_TIMEOUT", message: "Body Timeout Error" },
    "http://192.168.1.175:8112"
  );
  assert.match(message, /waiting for Deluge Web to respond/);
}

console.log("deluge proxy timeout tests passed");
