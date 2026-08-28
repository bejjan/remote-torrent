import assert from "node:assert/strict";
import { errorStatusTooltip } from "./error-status";

assert.equal(errorStatusTooltip("No space left on device"), "No space left on device");
assert.equal(errorStatusTooltip("  Tracker error  "), "Tracker error");
assert.equal(errorStatusTooltip(""), "No error details");
assert.equal(errorStatusTooltip("   "), "No error details");
assert.equal(errorStatusTooltip(null), "No error details");
assert.equal(errorStatusTooltip(undefined), "No error details");

console.log("error-status tests passed");
