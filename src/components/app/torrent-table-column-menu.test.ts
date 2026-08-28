import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Menu } from "@base-ui/react/menu";

/**
 * Header column picker uses shadcn ContextMenuLabel, which is Base UI Menu.GroupLabel.
 * Right-clicking a column header mounts the menu and used to white-screen with:
 *   Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group>
 */
assert.throws(
  () => {
    renderToString(createElement(Menu.GroupLabel, null, "Columns"));
  },
  (err: unknown) =>
    err instanceof Error && err.message.includes("MenuGroupContext is missing")
);

assert.doesNotThrow(() => {
  renderToString(
    createElement(Menu.Group, null, createElement(Menu.GroupLabel, null, "Columns"))
  );
});

const tableSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "torrent-table.tsx"),
  "utf8"
);

assert.match(tableSource, /ContextMenuGroup/);
assert.match(
  tableSource,
  /<ContextMenuGroup>[\s\S]*<ContextMenuLabel>[\s\S]*<\/ContextMenuGroup>/
);

console.log("torrent-table column menu tests passed");
