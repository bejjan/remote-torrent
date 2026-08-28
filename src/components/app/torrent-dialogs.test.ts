import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "torrent-dialogs.tsx"), "utf8");

const addDialog = source.slice(
  source.indexOf("export function AddTorrentDialog"),
  source.indexOf("function TorrentPreviewCard")
);
const preview = source.slice(
  source.indexOf("function TorrentPreviewCard"),
  source.indexOf("function AddFilesTree")
);
const tree = source.slice(
  source.indexOf("function AddFilesTree"),
  source.indexOf("export function RemoveTorrentDialog")
);

assert.match(addDialog, /max-w-\[calc\(100%-2rem\)\]/);
assert.match(addDialog, /sm:max-w-xl/);
assert.match(addDialog, /min-w-0/);
assert.match(addDialog, /overflow-x-hidden/);
assert.match(addDialog, /grid-cols-1/);
assert.doesNotMatch(addDialog, /sm:max-w-2xl/);
assert.doesNotMatch(addDialog, /sm:max-w-3xl/);

assert.match(addDialog, /id="add-torrent-file-name"/);
assert.match(addDialog, /min-w-0 flex-1 truncate overflow-hidden/);
assert.match(addDialog, /Choose torrent file/);
assert.match(addDialog, /Advanced settings/);

assert.match(preview, /min-w-0 truncate overflow-hidden font-medium/);
assert.match(preview, /truncate overflow-hidden break-all font-mono/);
assert.match(preview, /max-h-56 min-w-0 overflow-auto/);

assert.match(tree, /flex min-w-0 items-center/);
assert.match(tree, /min-w-0 flex-1 truncate overflow-hidden break-all/);

console.log("add-torrent dialog width and truncation tests passed");
