import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyVisibleSelection,
  idsBetween,
  isCurrentGeneration,
  moveListSelection,
  pruneActiveId,
  pruneSelectedIds,
  resolveRangeAnchor,
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

{
  const ids = ["a", "b", "c", "d", "e"];
  assert.deepEqual(idsBetween(ids, "c", "a"), ["a", "b", "c"]);
  assert.deepEqual(idsBetween(ids, "a", "c"), ["a", "b", "c"]);
  assert.deepEqual(idsBetween(ids, "c", "c"), ["c"]);
  assert.deepEqual(idsBetween(ids, "gone", "c"), ["c"]);
  assert.deepEqual(idsBetween(ids, "gone", "missing"), []);
}

{
  const ids = ["a", "b", "c"];
  assert.equal(resolveRangeAnchor(ids, "a", "c"), "a");
  assert.equal(resolveRangeAnchor(ids, "gone", "c"), "c");
  assert.equal(resolveRangeAnchor(ids, null, "c"), "c");
  assert.equal(resolveRangeAnchor(ids, "gone", "missing"), null);
}

{
  const ids = ["a", "b", "c", "d", "e"];
  const plain = moveListSelection({
    ids,
    activeId: "c",
    anchorId: "c",
    nextIndex: 1,
    shift: false,
  });
  assert.deepEqual(plain, { selected: ["b"], activeId: "b", anchorId: "b" });
}

{
  const ids = ["a", "b", "c", "d", "e"];
  let anchorId: string | null = "c";
  let activeId: string | null = "c";
  const step = (nextIndex: number) => {
    const moved = moveListSelection({ ids, activeId, anchorId, nextIndex, shift: true });
    assert.ok(moved);
    activeId = moved.activeId;
    anchorId = moved.anchorId;
    return moved.selected;
  };

  assert.deepEqual(step(3), ["c", "d"]);
  assert.deepEqual(step(4), ["c", "d", "e"]);
  assert.deepEqual(step(4), ["c", "d", "e"]);
  assert.deepEqual(step(3), ["c", "d"]);
  assert.equal(anchorId, "c");
}

{
  const ids = ["a", "b", "c", "d", "e"];
  let anchorId: string | null = "c";
  let activeId: string | null = "c";
  const step = (nextIndex: number) => {
    const moved = moveListSelection({ ids, activeId, anchorId, nextIndex, shift: true });
    assert.ok(moved);
    activeId = moved.activeId;
    anchorId = moved.anchorId;
    return moved.selected;
  };

  assert.deepEqual(step(1), ["b", "c"]);
  assert.deepEqual(step(0), ["a", "b", "c"]);
  assert.deepEqual(step(0), ["a", "b", "c"]);
  assert.deepEqual(step(1), ["b", "c"]);
  assert.equal(anchorId, "c");
}

{
  const first = moveListSelection({
    ids: ["a", "b", "c"],
    activeId: null,
    anchorId: null,
    nextIndex: 1,
    shift: true,
  });
  assert.deepEqual(first, { selected: ["b"], activeId: "b", anchorId: "b" });
}

{
  const ids = ["a", "b", "c", "d"];
  const first = moveListSelection({
    ids,
    activeId: "c",
    anchorId: null,
    nextIndex: 1,
    shift: true,
  });
  assert.deepEqual(first, { selected: ["b", "c"], activeId: "b", anchorId: "c" });
  const second = moveListSelection({
    ids,
    activeId: first!.activeId,
    anchorId: first!.anchorId,
    nextIndex: 0,
    shift: true,
  });
  assert.deepEqual(second, { selected: ["a", "b", "c"], activeId: "a", anchorId: "c" });
}

assert.equal(moveListSelection({ ids: [], activeId: null, anchorId: null, nextIndex: 0, shift: true }), null);

{
  const here = dirname(fileURLToPath(import.meta.url));
  const table = readFileSync(join(here, "../../components/app/torrent-table.tsx"), "utf8");
  assert.match(table, /moveListSelection/);
  assert.match(table, /rangeAnchorIdRef/);
  assert.match(table, /resolveRangeAnchor/);
  assert.match(table, /idsBetween/);
  assert.doesNotMatch(table, /const anchor = current/);
}

console.log("selection tests passed");
