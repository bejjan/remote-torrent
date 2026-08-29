import assert from "node:assert/strict";
import {
  DEFAULT_FILE_PRIORITY,
  canonicalizeFilePriority,
  commonPriority,
  compactFilePriorities,
  filePriorityLabel,
  infoFileIndexes,
  infoTreeSize,
  initialFilePriorities,
  inventDemoFilesTree,
  isMagnetUri,
  mapInfoTreeToStatusFiles,
  normalizeFilesTree,
  parseMagnetInfoHash,
  setPrioritiesForIndexes,
} from "./files-tree";

const official = {
  type: "dir",
  contents: {
    Show: {
      type: "dir",
      length: 300,
      contents: {
        "episode.mkv": { type: "file", index: 0, length: 200, download: true },
        extra: {
          type: "dir",
          contents: {
            "notes.txt": { type: "file", index: 1, length: 100, download: false },
          },
        },
      },
    },
  },
};

{
  const tree = normalizeFilesTree(official);
  assert.ok(tree);
  assert.equal(infoFileIndexes(tree).sort().join(","), "0,1");
  assert.equal(infoTreeSize(tree), 300);
  const prios = initialFilePriorities(tree);
  assert.equal(prios[0], DEFAULT_FILE_PRIORITY);
  assert.equal(prios[1], 0);
}

{
  const leafStyle = {
    type: "dir",
    contents: {
      "movie.mkv": { type: "file", index: 0, size: 50, progress: 0, priority: 1, offset: 0 },
    },
  };
  const tree = normalizeFilesTree(leafStyle);
  assert.ok(tree);
  assert.equal(tree.contents["movie.mkv"]?.type, "file");
  if (tree.contents["movie.mkv"]?.type === "file") {
    assert.equal(tree.contents["movie.mkv"].length, 50);
  }
}

{
  assert.equal(normalizeFilesTree(""), null);
  assert.equal(normalizeFilesTree(false), null);
  assert.equal(normalizeFilesTree(null), null);
}

{
  const tree = inventDemoFilesTree("Open.Source.Linux.iso", 1_000_000);
  const indexes = infoFileIndexes(tree);
  assert.equal(indexes.length, 3);
  assert.ok(tree.contents["Open.Source.Linux.iso"]);
  const files = mapInfoTreeToStatusFiles(tree, [4, 0, 7]);
  const show = files.contents["Open.Source.Linux.iso"];
  assert.equal(show?.type, "dir");
  if (show?.type === "dir") {
    const sample = show.contents.sample;
    assert.equal(sample?.type, "dir");
    if (sample?.type === "dir") {
      const sampleFile = Object.values(sample.contents)[0];
      assert.equal(sampleFile?.type, "file");
      if (sampleFile?.type === "file") assert.equal(sampleFile.priority, 0);
    }
  }
}

{
  const next = setPrioritiesForIndexes([4, 4, 4], [1, 2], 0);
  assert.deepEqual(next, [4, 0, 0]);
  assert.equal(commonPriority(next, [1, 2]), 0);
  assert.equal(commonPriority(next, [0, 1]), null);
  assert.deepEqual(compactFilePriorities([4, , 0] as number[]), [4, 4, 0]);
}

{
  assert.equal(canonicalizeFilePriority(0), 0);
  assert.equal(canonicalizeFilePriority(1), 1);
  assert.equal(canonicalizeFilePriority(2), 1);
  assert.equal(canonicalizeFilePriority(3), 1);
  assert.equal(canonicalizeFilePriority(4), 4);
  assert.equal(canonicalizeFilePriority(5), 7);
  assert.equal(canonicalizeFilePriority(6), 7);
  assert.equal(canonicalizeFilePriority(7), 7);
  assert.equal(canonicalizeFilePriority(99), 7);
  assert.equal(canonicalizeFilePriority(-1), 0);
  assert.equal(canonicalizeFilePriority(Number.NaN), DEFAULT_FILE_PRIORITY);
  assert.equal(filePriorityLabel(1), "Low");
  assert.equal(filePriorityLabel(4), "Normal");
  assert.equal(filePriorityLabel(5), "High");
  assert.equal(filePriorityLabel(0), "Don't download");
}

{
  assert.equal(isMagnetUri("magnet:?xt=urn:btih:abcdef0123456789"), true);
  assert.equal(isMagnetUri("https://example.com/file.torrent"), false);
  assert.equal(parseMagnetInfoHash("magnet:?xt=urn:btih:ABCDEF0123&dn=Demo"), "abcdef0123");
}

console.log("files-tree tests passed");
