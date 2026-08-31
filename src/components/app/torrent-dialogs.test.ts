import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "torrent-dialogs.tsx"), "utf8");
const details = readFileSync(join(dir, "torrent-details.tsx"), "utf8");

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

assert.match(addDialog, /ADD_POPOVER_CLASS/);
assert.match(addDialog, /min-w-0/);
assert.match(addDialog, /overflow-x-hidden/);
assert.match(addDialog, /grid-cols-1/);
assert.doesNotMatch(addDialog, /90vh/);
assert.doesNotMatch(addDialog, /sm:max-w-2xl/);
assert.doesNotMatch(addDialog, /sm:max-w-3xl/);
assert.match(source, /export const ADD_POPOVER_CLASS/);
assert.match(source, /w-\[min\(32rem,calc\(100vw-1\.5rem\)\)\]/);
assert.doesNotMatch(source, /w-\[min\(36rem/);
assert.match(source, /100svh/);
assert.match(addDialog, /<Popover/);
assert.match(addDialog, /PopoverTrigger/);
assert.match(addDialog, /PopoverContent/);
assert.match(addDialog, /align="end"/);
assert.match(addDialog, /collisionPadding=\{8\}/);
assert.match(addDialog, /<PopoverTitle className="sr-only">Add torrent<\/PopoverTitle>/);
assert.doesNotMatch(addDialog, /<DialogTitle>Add torrent<\/DialogTitle>/);
assert.doesNotMatch(addDialog, /DialogHeader/);
assert.doesNotMatch(addDialog, /DialogFooter/);
assert.match(addDialog, /ADD_PILL_TAB_CLASS/);
assert.match(addDialog, /h-8 w-max items-center justify-start gap-0\.5 rounded-none bg-transparent p-0/);
assert.match(addDialog, /flex min-w-0 shrink-0 items-center border-b p-1\.5/);
assert.ok(
  addDialog.indexOf("ADD_PILL_TAB_CLASS") < addDialog.indexOf("border-b p-1.5") ||
    addDialog.indexOf("border-b p-1.5") < addDialog.indexOf("overflow-y-auto"),
  "pill tabs sit above the divider and body"
);
assert.ok(
  addDialog.indexOf("border-b p-1.5") < addDialog.indexOf("overflow-y-auto"),
  "tab row divider sits above the scrolling body"
);
assert.match(source, /h-7 flex-none rounded-lg border-0/);
assert.match(source, /text-\[13px\] font-normal text-muted-foreground/);
assert.match(source, /after:hidden/);
assert.match(source, /data-active:bg-muted data-active:font-normal/);
assert.match(details, /QUICK_INSPECT_TAB_CLASS/);
assert.match(details, /h-7 flex-none rounded-lg border-0/);
assert.match(addDialog, /<Plus \/>/);
assert.match(addDialog, /hidden xl:inline/);
assert.match(addDialog, /title=\{label\}/);
assert.match(addDialog, /aria-label=\{label\}/);
assert.match(addDialog, /h-8 min-w-0 shrink-0 px-2 xl:shrink xl:px-2.5/);
assert.doesNotMatch(addDialog, /Add torrent…/);

assert.match(addDialog, /id="add-torrent-file-name"/);
assert.match(addDialog, /id="add-torrent-choose-file"/);
assert.match(addDialog, /chooseFileRef/);
assert.match(addDialog, /initialFocus=\{chooseFileRef\}/);
assert.match(addDialog, /ref=\{chooseFileRef\}/);
assert.match(addDialog, /if \(!open\) \{[\s\S]*?setTab\("file"\)/);
assert.match(addDialog, /min-w-0 flex-1 truncate overflow-hidden/);
assert.match(addDialog, /flex-col gap-x-3 gap-y-1.5 sm:flex-row sm:items-center/);
assert.match(addDialog, /w-full shrink-0 sm:w-auto/);
assert.match(addDialog, /Choose torrent file/);
assert.match(addDialog, /Advanced settings/);
assert.match(addDialog, /Notify when this download finishes/);
assert.match(addDialog, /add-notify-hint/);
assert.match(addDialog, /loadNotifyOnComplete/);
assert.match(addDialog, /requestNotifyPermissionFromGesture/);
assert.match(addDialog, /beginNotifyAdd/);
assert.match(addDialog, /registerNotifyTorrentIds/);
assert.match(addDialog, /notifyPermissionHint/);
assert.match(source, /rememberRemovedTorrentIds/);

const fileInput = addDialog.slice(addDialog.indexOf("<input"), addDialog.indexOf('id="add-torrent-choose-file"'));
assert.match(fileInput, /type="file"/);
assert.match(fileInput, /tabIndex=\{-1\}/);
assert.doesNotMatch(fileInput, /autoFocus/);

const chooseStart = addDialog.lastIndexOf("<Button", addDialog.indexOf('id="add-torrent-choose-file"'));
const chooseBtn = addDialog.slice(chooseStart, addDialog.indexOf("Choose torrent file"));
assert.match(chooseBtn, /autoFocus/);
assert.match(chooseBtn, /ref=\{chooseFileRef\}/);
assert.match(chooseBtn, /id="add-torrent-choose-file"/);

const magnetTab = addDialog.slice(
  addDialog.indexOf('TabsContent value="magnet"'),
  addDialog.indexOf('TabsContent value="url"')
);
const urlTab = addDialog.slice(addDialog.indexOf('TabsContent value="url"'), addDialog.indexOf("TorrentPreviewCard"));
assert.doesNotMatch(magnetTab, /autoFocus/);
assert.doesNotMatch(urlTab, /autoFocus/);

assert.match(addDialog, /<TorrentPreviewCard/);
assert.doesNotMatch(addDialog, /preview \? <TorrentPreviewCard/);
assert.match(addDialog, /className="min-h-16"/);
assert.match(addDialog, /useState<AddTab>\("file"\)/);
assert.doesNotMatch(addDialog, /useState<AddTab>\("(magnet|url)"\)/);
assert.match(addDialog, /setTab\("file"\)/);
assert.match(addDialog, /TabsContent value="file" className="grid min-h-16 min-w-0 gap-3"/);
assert.match(addDialog, /TabsContent value="magnet" className="grid min-h-16 gap-3"/);
assert.match(addDialog, /TabsContent value="url" className="grid min-h-16 min-w-0 gap-3"/);
assert.doesNotMatch(addDialog, /TabsList className="w-full"/);
assert.doesNotMatch(addDialog, /<Dialog /);
assert.match(addDialog, /min-h-16 min-w-0 content-center/);
assert.match(addDialog, /h-16 min-h-16 field-sizing-fixed/);
assert.doesNotMatch(addDialog, /min-h-28/);
assert.doesNotMatch(addDialog, /min-h-24/);
assert.match(addDialog, /loadGen/);
assert.match(addDialog, /onAdded\?: \(\) => void/);
assert.match(
  addDialog,
  /toast\.success\("Torrent added"\);\s*onAdded\?\.\(\);\s*onOpenChange\(false\);/
);
assert.equal(
  [...addDialog.matchAll(/onAdded\?\.\(\)/g)].length,
  1,
  "onAdded runs only on add success, not cancel or error"
);

assert.match(preview, /min-w-0 truncate overflow-hidden font-medium/);
assert.match(preview, /truncate overflow-hidden break-all font-mono/);
assert.match(preview, /min-h-40 max-h-56 min-w-0 overflow-auto/);
assert.match(preview, /sm:min-h-56/);
assert.match(preview, /File list will appear here/);
assert.match(preview, /showFileGutter=\{fileCount > 1\}/);

assert.match(tree, /flex min-w-0 items-center/);
assert.match(tree, /min-w-0 flex-1 truncate/);
assert.match(tree, /showFileGutter \? <span className="inline-block size-6 shrink-0"/);
assert.match(tree, /FileKindIcon/);
assert.match(tree, /FolderTreeIcon/);
assert.match(tree, /FilePrioritySelect/);

assert.match(source, /if \(open\) setRemoveData\(false\)/);
assert.match(source, /if \(open\) setPath\(currentPath\)/);

assert.match(addDialog, /<form/);
assert.match(addDialog, /event\.currentTarget\.requestSubmit\(\)/);
assert.match(addDialog, /event\.target instanceof HTMLInputElement/);
assert.match(addDialog, /type="submit"/);
assert.match(addDialog, /type="button"/);
assert.match(addDialog, /id="add-download-location"/);
assert.doesNotMatch(
  addDialog,
  /<Button disabled=\{!canAdd\} onClick=\{\(\) => void submit\(\)\}>/
);

assert.match(addDialog, /details\.reason === "focus-out"/);

console.log("add-torrent dialog width and truncation tests passed");
