import assert from "node:assert/strict";
import { formatSwarmCount } from "./format";

assert.equal(formatSwarmCount(0, -1), "0");
assert.equal(formatSwarmCount(3, -1), "3");
assert.equal(formatSwarmCount(0, Number.NaN), "0");
assert.equal(formatSwarmCount(8, Number.NEGATIVE_INFINITY), "8");
assert.equal(formatSwarmCount(3, 42), "3 (42)");
assert.equal(formatSwarmCount(0, 0), "0 (0)");
assert.equal(formatSwarmCount(1, 1), "1 (1)");

console.log("format tests passed");
