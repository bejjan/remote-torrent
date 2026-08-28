import assert from "node:assert/strict";
import {
  HUGE_FILE_TREE_NODE_COUNT,
  countFileTreeNodes,
  defaultFolderExpanded,
  fileExtension,
  fileIconKind,
  isHugeFileTree,
} from "./file-tree-view";
import type { FileNode } from "./types";

{
  assert.equal(fileExtension("bbb_sunflower_1080p.mp4"), "mp4");
  assert.equal(fileExtension("Show/episode.MKV"), "mkv");
  assert.equal(fileExtension("README"), "");
  assert.equal(fileExtension(".gitignore"), "");
  assert.equal(fileExtension("archive.tar.gz"), "gz");
}

{
  assert.equal(fileIconKind("movie.mkv"), "video");
  assert.equal(fileIconKind("clip.MP4"), "video");
  assert.equal(fileIconKind("track.flac"), "audio");
  assert.equal(fileIconKind("theme.mp3"), "audio");
  assert.equal(fileIconKind("poster.jpg"), "image");
  assert.equal(fileIconKind("stills.PNG"), "image");
  assert.equal(fileIconKind("extras.zip"), "archive");
  assert.equal(fileIconKind("backup.tar.gz"), "archive");
  assert.equal(fileIconKind("bbb.en.srt"), "subtitle");
  assert.equal(fileIconKind("show.ass"), "subtitle");
  assert.equal(fileIconKind("ubuntu-24.04.iso"), "disk");
  assert.equal(fileIconKind("disk.img"), "disk");
  assert.equal(fileIconKind("README.txt"), "file");
  assert.equal(fileIconKind("notes.nfo"), "file");
  assert.equal(fileIconKind("no-extension"), "file");
}

{
  const leaf: FileNode = { type: "file", index: 0, size: 1, progress: 0, priority: 4, offset: 0 };
  assert.equal(countFileTreeNodes(leaf), 1);

  const small: FileNode = {
    type: "dir",
    contents: {
      Show: {
        type: "dir",
        contents: {
          "episode.mkv": leaf,
          extras: {
            type: "dir",
            contents: { "notes.txt": { ...leaf, index: 1 } },
          },
        },
      },
    },
  };
  assert.equal(countFileTreeNodes(small), 5);
  assert.equal(isHugeFileTree(small), false);
  assert.equal(defaultFolderExpanded(1, false), true);
  assert.equal(defaultFolderExpanded(4, false), true);
  assert.equal(defaultFolderExpanded(1, true), true);
  assert.equal(defaultFolderExpanded(2, true), false);
}

{
  const contents: Record<string, FileNode> = {};
  for (let i = 0; i < HUGE_FILE_TREE_NODE_COUNT; i++) {
    contents[`f${i}.txt`] = { type: "file", index: i, size: 1, progress: 0, priority: 4, offset: 0 };
  }
  const huge: FileNode = { type: "dir", contents };
  assert.equal(isHugeFileTree(huge), true);
  assert.equal(defaultFolderExpanded(0, true), true);
  assert.equal(defaultFolderExpanded(1, true), true);
  assert.equal(defaultFolderExpanded(2, true), false);
}

console.log("file-tree-view tests passed");
