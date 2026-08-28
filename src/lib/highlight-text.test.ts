import assert from "node:assert/strict";
import {
  matchesSearchQuery,
  normalizeSearchText,
  searchHighlightRegExp,
  splitHighlightParts,
} from "./highlight-text";

assert.equal(normalizeSearchText("Game.of.Thrones.S01"), "game of thrones s01");
assert.equal(normalizeSearchText("game  of  thrones"), "game of thrones");
assert.equal(normalizeSearchText("  .game.of.thrones.  "), "game of thrones");
assert.equal(normalizeSearchText("..."), "");

assert.equal(matchesSearchQuery("Game.of.Thrones.S01", "game of thrones"), true);
assert.equal(matchesSearchQuery("game.of.thrones", "game of thrones"), true);
assert.equal(matchesSearchQuery("game  of  thrones", "game of thrones"), true);
assert.equal(matchesSearchQuery("game of thrones", "game.of.thrones"), true);
assert.equal(matchesSearchQuery("Game.of.Thrones.S01", "GAME.OF.THRONES"), true);
assert.equal(matchesSearchQuery("ubuntu-24.04.iso", "24 04"), true);
assert.equal(matchesSearchQuery("ubuntu-24.04.iso", "ubuntu"), true);
assert.equal(matchesSearchQuery("debian.iso", "game of thrones"), false);
assert.equal(matchesSearchQuery("game_of_thrones", "game of thrones"), false);
assert.equal(matchesSearchQuery("foo-bar", "foo.bar"), false);
assert.equal(matchesSearchQuery("anything", ""), true);
assert.equal(matchesSearchQuery("anything", "   "), true);
assert.equal(matchesSearchQuery("anything", "..."), true);

{
  const parts = splitHighlightParts("Game.of.Thrones.S01", "game of thrones");
  assert.deepEqual(parts, [
    { text: "Game.of.Thrones", match: true },
    { text: ".S01", match: false },
  ]);
}

{
  const parts = splitHighlightParts("game of thrones", "game.of.thrones");
  assert.deepEqual(parts, [{ text: "game of thrones", match: true }]);
}

{
  const parts = splitHighlightParts("game  of  thrones", "game.of.thrones");
  assert.deepEqual(parts, [{ text: "game  of  thrones", match: true }]);
}

{
  const parts = splitHighlightParts("ubuntu-24.04.iso", "24.04");
  assert.deepEqual(parts, [
    { text: "ubuntu-", match: false },
    { text: "24.04", match: true },
    { text: ".iso", match: false },
  ]);
}

{
  const parts = splitHighlightParts("ubuntu-24.04.iso", "ISO");
  assert.deepEqual(parts, [
    { text: "ubuntu-24.04.", match: false },
    { text: "iso", match: true },
  ]);
}

{
  const parts = splitHighlightParts("Game.of.Thrones", "");
  assert.deepEqual(parts, [{ text: "Game.of.Thrones", match: false }]);
}

{
  const parts = splitHighlightParts("foo (bar)", "foo (bar)");
  assert.deepEqual(parts, [{ text: "foo (bar)", match: true }]);
}

assert.equal(searchHighlightRegExp("   "), null);
assert.equal(searchHighlightRegExp("..."), null);

{
  const re = searchHighlightRegExp("game of thrones");
  assert.ok(re);
  assert.match("Game.of.Thrones.S01", re);
}

console.log("highlight-text tests passed");
