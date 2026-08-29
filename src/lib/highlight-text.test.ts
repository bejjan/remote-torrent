import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeHtmlEntities } from "./html-entities";
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

{
  const decoded = decodeHtmlEntities(
    "Dune.Part.Two.2024.REPACK.2160p.UPSCALE.WEB.HEVC.10Bit.AAC.2.0-R&amp;H.mkv"
  );
  assert.equal(decoded.includes("&amp;"), false);
  assert.equal(decoded.includes("R&H"), true);
  const parts = splitHighlightParts(decoded, "R&H");
  assert.equal(parts.some((part) => part.match && part.text === "R&H"), true);
}

{
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/app/highlight-text.tsx"), "utf8");
  assert.match(source, /<mark key=\{index\} className="search-hit">/);
  assert.match(source, /\{part\.text\}/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
}

console.log("highlight-text tests passed");
