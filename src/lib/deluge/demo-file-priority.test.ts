import assert from "node:assert/strict";
import { handleDemoRpc } from "./demo";
import type { FileNode } from "./types";

const login = handleDemoRpc({ method: "auth.login", params: ["deluge"], id: 1 }, null);
assert.equal(login.result, true);
assert.ok(login.setCookie);
const cookie = login.setCookie!.split(";")[0];

function call(method: string, params: unknown[] = [], id = 10) {
  return handleDemoRpc({ method, params, id }, cookie);
}

function walkFiles(node: FileNode, visit: (f: Extract<FileNode, { type: "file" }>) => void) {
  if (node.type === "file") visit(node);
  else Object.values(node.contents).forEach((c) => walkFiles(c, visit));
}

const ui = call("web.update_ui", [["name"], {}]);
assert.equal(ui.error, null, ui.error?.message);
const torrents = (ui.result as { torrents: Record<string, { name: string }> }).torrents;
const bunnyId = Object.entries(torrents).find(([, t]) => t.name.includes("Big Buck Bunny"))?.[0];
assert.ok(bunnyId, "demo should include Big Buck Bunny");

const before = call("web.get_torrent_files", [bunnyId]);
assert.equal(before.error, null, before.error?.message);
const beforeTree = before.result as FileNode;
const files: Extract<FileNode, { type: "file" }>[] = [];
walkFiles(beforeTree, (f) => files.push(f));
assert.ok(files.length >= 2);
const original = files.map((f) => f.priority);

const prios = original.slice();
prios[files[0].index] = 7;
prios[files[1].index] = 0;
const set = call("core.set_torrent_file_priorities", [bunnyId, prios]);
assert.equal(set.error, null, set.error?.message);

const after = call("web.get_torrent_files", [bunnyId]);
assert.equal(after.error, null);
const afterFiles: Extract<FileNode, { type: "file" }>[] = [];
walkFiles(after.result as FileNode, (f) => afterFiles.push(f));
const byIndex = new Map(afterFiles.map((f) => [f.index, f.priority]));
assert.equal(byIndex.get(files[0].index), 7);
assert.equal(byIndex.get(files[1].index), 0);

const unknown = call("core.set_file_priorities", [bunnyId, prios]);
assert.equal(unknown.error?.message.includes("Unknown method"), true);

const viaOptions = call("core.set_torrent_options", [bunnyId, { file_priorities: prios }]);
assert.equal(viaOptions.error, null, viaOptions.error?.message);
const afterOpts: Extract<FileNode, { type: "file" }>[] = [];
walkFiles(call("web.get_torrent_files", [bunnyId]).result as FileNode, (f) => afterOpts.push(f));
const byIndexOpts = new Map(afterOpts.map((f) => [f.index, f.priority]));
assert.equal(byIndexOpts.get(files[0].index), 7);
assert.equal(byIndexOpts.get(files[1].index), 0);

const firstLast = call("core.set_torrent_options", [
  bunnyId,
  { prioritize_first_last_pieces: true },
]);
assert.equal(firstLast.error, null, firstLast.error?.message);
const status = call("web.get_torrent_status", [bunnyId, ["prioritize_first_last"]]);
assert.equal((status.result as { prioritize_first_last: boolean }).prioritize_first_last, true);

call("core.set_torrent_file_priorities", [bunnyId, original]);

console.log("demo file-priority tests passed");
