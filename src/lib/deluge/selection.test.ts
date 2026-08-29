import assert from "node:assert/strict";
import {
  applyVisibleSelection,
  isCurrentGeneration,
  pruneActiveId,
  pruneSelectedIds,
  visibleSelectionState,
} from "./selection";

{
  const ids = ["a", "b"];
  const selected = new Set(["a", "b", "hidden"]);
  assert.deepEqual(visibleSelectionState(ids, selected), { checked: true, indeterminate: false });
  assert.deepEqual(visibleSelectionState(["a", "b", "c"], selected), {
    checked: false,
    indeterminate: true,
  });
  assert.deepEqual(visibleSelectionState(ids, new Set(["hidden"])), {
    checked: false,
    indeterminate: false,
  });
}

{
  const prev = new Set(["hidden"]);
  const added = applyVisibleSelection(prev, ["a", "b"], true);
  assert.deepEqual([...added].sort(), ["a", "b", "hidden"]);
  const removed = applyVisibleSelection(added, ["a", "b"], false);
  assert.deepEqual([...removed], ["hidden"]);
}

{
  const selected = new Set(["a", "gone"]);
  const kept = pruneSelectedIds(selected, { a: {}, b: {} });
  assert.deepEqual([...kept], ["a"]);
  assert.equal(pruneSelectedIds(selected, null), selected);
  const same = new Set(["a"]);
  assert.equal(pruneSelectedIds(same, { a: {} }), same);
}

{
  assert.equal(pruneActiveId("a", { a: {} }), "a");
  assert.equal(pruneActiveId("gone", { a: {} }), null);
  assert.equal(pruneActiveId("a", null), "a");
  assert.equal(pruneActiveId(null, { a: {} }), null);
}

assert.equal(isCurrentGeneration(3, 3), true);
assert.equal(isCurrentGeneration(4, 3), false);

console.log("selection tests passed");
