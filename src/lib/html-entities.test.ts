import assert from "node:assert/strict";
import { decodeHtmlEntities } from "./html-entities";
import { normalizeTorrentName, normalizeTorrentStatus } from "./deluge/torrent-name";
import { splitHighlightParts } from "./highlight-text";

assert.equal(decodeHtmlEntities("plain"), "plain");
assert.equal(decodeHtmlEntities("R&H"), "R&H");
assert.equal(decodeHtmlEntities("R&amp;H"), "R&H");
assert.equal(decodeHtmlEntities("a &lt; b &gt; c"), "a < b > c");
assert.equal(decodeHtmlEntities("&quot;quoted&quot;"), '"quoted"');
assert.equal(decodeHtmlEntities("it&#39;s"), "it's");
assert.equal(decodeHtmlEntities("it&apos;s"), "it's");
assert.equal(decodeHtmlEntities("&#38;"), "&");
assert.equal(decodeHtmlEntities("&#x26;"), "&");
assert.equal(decodeHtmlEntities("&#x27;"), "'");

// Single pass: do not walk nested encodings down to `&`.
assert.equal(decodeHtmlEntities("R&amp;amp;H"), "R&amp;H");
assert.equal(decodeHtmlEntities("R&amp;H"), "R&H");
assert.equal(decodeHtmlEntities("R&H"), "R&H");

assert.equal(decodeHtmlEntities("&unknown;"), "&unknown;");
assert.equal(decodeHtmlEntities("&amp"), "&amp");

const dune =
  "Dune.Part.Two.2024.REPACK.2160p.UPSCALE.WEB.HEVC.10Bit.AAC.2.0-R&H.mkv";
const duneEncoded =
  "Dune.Part.Two.2024.REPACK.2160p.UPSCALE.WEB.HEVC.10Bit.AAC.2.0-R&amp;H.mkv";
assert.equal(normalizeTorrentName(duneEncoded), dune);
assert.equal(normalizeTorrentName(dune), dune);

{
  const encoded = { name: duneEncoded, queue: 0 };
  const normalized = normalizeTorrentStatus(encoded);
  assert.equal(normalized.name, dune);
  assert.notEqual(normalized, encoded);
  const already = { name: dune };
  assert.equal(normalizeTorrentStatus(already), already);
}

{
  const parts = splitHighlightParts(normalizeTorrentName(duneEncoded), "R&H");
  assert.deepEqual(parts, [
    { text: "Dune.Part.Two.2024.REPACK.2160p.UPSCALE.WEB.HEVC.10Bit.AAC.2.0-", match: false },
    { text: "R&H", match: true },
    { text: ".mkv", match: false },
  ]);
}

{
  const parts = splitHighlightParts(dune, "&amp;");
  assert.deepEqual(parts, [{ text: dune, match: false }]);
}

console.log("html-entities tests passed");
