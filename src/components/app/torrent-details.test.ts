import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const details = readFileSync(join(dir, "torrent-details.tsx"), "utf8");
const tree = readFileSync(join(dir, "torrent-file-tree.tsx"), "utf8");
const icons = readFileSync(join(dir, "file-tree-icons.tsx"), "utf8");

assert.match(details, /from "@\/components\/app\/torrent-file-tree"/);
assert.match(details, /key=\{torrentId\}/);
assert.match(details, /<FileTree/);
assert.doesNotMatch(details, /function FileTree/);

assert.match(tree, /from "@\/components\/app\/file-tree-icons"/);
assert.match(tree, /FileKindIcon/);
assert.match(tree, /FolderTreeIcon/);
assert.match(tree, /from "lucide-react"/);
assert.match(tree, /ChevronDown/);
assert.match(tree, /ChevronRight/);
assert.match(tree, /defaultFolderExpanded\(depth, huge\)/);
assert.match(tree, /isHugeFileTree\(node\)/);
assert.match(tree, /aria-expanded=\{open\}/);
assert.match(tree, /open \? "ml-3 border-l pl-3" : "hidden"/);
assert.match(tree, /FilePrioritySelect/);
assert.match(tree, /core\.set_torrent_file_priorities/);
assert.match(tree, /canonicalizeFilePriority/);
assert.doesNotMatch(tree, /core\.set_file_priorities/);

assert.match(icons, /from "lucide-react"/);
assert.match(icons, /Captions/);
assert.match(icons, /Disc3/);
assert.match(icons, /FileArchive/);
assert.match(icons, /FileImage/);
assert.match(icons, /FileMusic/);
assert.match(icons, /Film/);
assert.match(icons, /FolderOpen/);
assert.match(icons, /\bFolder\b/);
assert.match(icons, /size-3\.5 shrink-0 text-muted-foreground/);
assert.match(icons, /fileIconKind\(name\)/);
assert.match(icons, /video: Film/);
assert.match(icons, /audio: FileMusic/);
assert.match(icons, /image: FileImage/);
assert.match(icons, /archive: FileArchive/);
assert.match(icons, /subtitle: Captions/);
assert.match(icons, /disk: Disc3/);
assert.match(icons, /file: File/);

console.log("torrent-details files tree tests passed");
