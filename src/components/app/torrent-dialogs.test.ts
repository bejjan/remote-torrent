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

assert.match(addDialog, /<TorrentPreviewCard/);
assert.doesNotMatch(addDialog, /preview \? <TorrentPreviewCard/);
assert.match(addDialog, /className="min-h-28"/);
assert.match(addDialog, /TabsContent value="file" className="grid min-h-28 min-w-0 gap-3 pt-3"/);
assert.match(addDialog, /TabsContent value="magnet" className="grid min-h-28 gap-3 pt-3"/);
assert.match(addDialog, /TabsContent value="url" className="grid min-h-28 min-w-0 gap-3 pt-3"/);
assert.match(addDialog, /loadGen/);

assert.match(preview, /min-w-0 truncate overflow-hidden font-medium/);
assert.match(preview, /truncate overflow-hidden break-all font-mono/);
assert.match(preview, /min-h-56 max-h-56 min-w-0 overflow-auto/);
assert.match(preview, /File list will appear here/);

assert.match(tree, /flex min-w-0 items-center/);
assert.match(tree, /min-w-0 flex-1 truncate overflow-hidden break-all/);
assert.match(tree, /FileKindIcon/);
assert.match(tree, /FolderTreeIcon/);
assert.match(tree, /FilePrioritySelect/);

assert.match(source, /if \(open\) setRemoveData\(false\)/);
assert.match(source, /if \(open\) setPath\(currentPath\)/);

console.log("add-torrent dialog width and truncation tests passed");
