import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const details = readFileSync(join(dir, "torrent-details.tsx"), "utf8");
const tree = readFileSync(join(dir, "torrent-file-tree.tsx"), "utf8");

assert.match(details, /from "@\/components\/app\/torrent-file-tree"/);
assert.match(details, /key=\{torrentId\}/);
assert.match(details, /<FileTree/);
assert.doesNotMatch(details, /function FileTree/);

assert.match(tree, /from "lucide-react"/);
assert.match(tree, /Captions/);
assert.match(tree, /ChevronDown/);
assert.match(tree, /ChevronRight/);
assert.match(tree, /Disc3/);
assert.match(tree, /FileArchive/);
assert.match(tree, /FileImage/);
assert.match(tree, /FileMusic/);
assert.match(tree, /Film/);
assert.match(tree, /FolderOpen/);
assert.match(tree, /\bFolder\b/);
assert.match(tree, /size-3\.5 shrink-0 text-muted-foreground/);
assert.match(tree, /defaultFolderExpanded\(depth, huge\)/);
assert.match(tree, /isHugeFileTree\(node\)/);
assert.match(tree, /fileIconKind\(name\)/);
assert.match(tree, /aria-expanded=\{open\}/);
assert.match(tree, /open \? "ml-3 border-l pl-3" : "hidden"/);
assert.match(tree, /FilePrioritySelect/);
assert.match(tree, /core\.set_torrent_file_priorities/);
assert.match(tree, /canonicalizeFilePriority/);
assert.doesNotMatch(tree, /core\.set_file_priorities/);
assert.match(tree, /video: Film/);
assert.match(tree, /audio: FileMusic/);
assert.match(tree, /image: FileImage/);
assert.match(tree, /archive: FileArchive/);
assert.match(tree, /subtitle: Captions/);
assert.match(tree, /disk: Disc3/);
assert.match(tree, /file: File/);

console.log("torrent-details files tree tests passed");
