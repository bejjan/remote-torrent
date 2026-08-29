commit b1a3ab6a93c58e7892fdcd2394f6b2468d4081a8
Merge: ce10b87 ca0a37a
Author: bejjan <bejjan@gmail.com>
Date:   Sat Aug 29 21:50:47 2026 +0200

    On cursor/modern-deluge-web-ui-434e: pre-split

diff --cc src/components/app/about-dialog.test.ts
index 88623a2,88623a2..0f903dc
--- a/src/components/app/about-dialog.test.ts
+++ b/src/components/app/about-dialog.test.ts
@@@ -6,20 -6,20 +6,27 @@@ import { fileURLToPath } from "node:url
  const dir = dirname(fileURLToPath(import.meta.url));
  
  const brand = readFileSync(join(dir, "brand.tsx"), "utf8");
--assert.match(brand, /<button/);
  assert.match(brand, /min-w-0 truncate font-heading/);
  assert.match(brand, /wordmarkClassName/);
  assert.match(brand, /\/logo\.png/);
  assert.doesNotMatch(brand, /from "lucide-react"/);
--assert.match(brand, /type="button"/);
--assert.match(brand, /cursor-pointer/);
--assert.match(brand, /About Nova/);
--assert.match(brand, /onClick/);
++assert.doesNotMatch(brand, /<button/);
++assert.doesNotMatch(brand, /onClick/);
++assert.doesNotMatch(brand, /About Nova/);
  
  const shell = readFileSync(join(dir, "torrent-shell.tsx"), "utf8");
  assert.match(shell, /AboutDialog/);
  assert.match(shell, /setAboutOpen\(true\)/);
--assert.match(shell, /disabled:opacity-40/);
++assert.match(shell, /<Info \/> About Nova/);
++assert.doesNotMatch(shell, /About Nova…/);
++const aboutItem = shell.indexOf("<Info /> About Nova");
++const prefsItem = shell.indexOf("<Settings /> Preferences…");
++assert.ok(aboutItem > 0 && aboutItem < prefsItem, "About Nova is the first hamburger item");
++assert.match(shell.slice(aboutItem, prefsItem), /<DropdownMenuSeparator \/>/);
++assert.match(
++  shell,
++  /<Brand\s+className="min-w-0 shrink"\s+markClassName="size-6"\s+wordmarkClassName="hidden sm:inline"\s*\/>/
++);
  assert.match(shell, /core\.get_enabled_plugins/);
  
  const dialog = readFileSync(join(dir, "about-dialog.tsx"), "utf8");
diff --cc src/components/app/brand.tsx
index 39f89f7,39f89f7..5ea2765
--- a/src/components/app/brand.tsx
+++ b/src/components/app/brand.tsx
@@@ -7,15 -7,15 +7,13 @@@ export function Brand(
    className,
    markClassName,
    wordmarkClassName,
--  onClick,
  }: {
    className?: string;
    markClassName?: string;
    wordmarkClassName?: string;
--  onClick?: () => void;
  }) {
--  const content = (
--    <>
++  return (
++    <div className={cn("flex min-w-0 items-center gap-2", className)}>
        <Image
          src="/logo.png"
          alt=""
@@@ -32,24 -32,24 +30,6 @@@
        >
          <span className="text-primary">Nova</span>
        </span>
--    </>
++    </div>
    );
--
--  if (onClick) {
--    return (
--      <button
--        type="button"
--        onClick={onClick}
--        aria-label="About Nova"
--        className={cn(
--          "flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 text-left select-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
--          className
--        )}
--      >
--        {content}
--      </button>
--    );
--  }
--
--  return <div className={cn("flex min-w-0 items-center gap-2", className)}>{content}</div>;
  }
diff --cc src/components/app/connection-manager.tsx
index b6205c9,b6205c9..8151f59
--- a/src/components/app/connection-manager.tsx
+++ b/src/components/app/connection-manager.tsx
@@@ -1,6 -1,6 +1,6 @@@
  "use client";
  
--import { useCallback, useEffect, useState } from "react";
++import { useCallback, useEffect, useState, type ReactNode } from "react";
  import { Loader2, Plus, PlugZap, Power, PowerOff, Trash2 } from "lucide-react";
  import { toast } from "sonner";
  import { Brand } from "@/components/app/brand";
@@@ -11,6 -11,6 +11,7 @@@ import { Dialog, DialogContent, DialogD
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Badge } from "@/components/ui/badge";
++import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
  import { rpc } from "@/lib/deluge/client";
  import type { HostInfo, HostStatus } from "@/lib/deluge/types";
  
@@@ -166,19 -166,19 +167,25 @@@ export function ConnectionManager(
                      <td className="px-3 py-2 text-muted-foreground">{row.version || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
--                        <Button size="sm" disabled={busy === id} onClick={() => void connect(id)}>
++                        <HostActionBtn
++                          label="Connect"
++                          size="sm"
++                          variant="default"
++                          disabled={busy === id}
++                          onClick={() => void connect(id)}
++                        >
                            {busy === id ? <Loader2 className="animate-spin" /> : <PlugZap />}
                            <span className="hidden sm:inline">Connect</span>
--                        </Button>
--                        <Button size="icon-sm" variant="outline" onClick={() => void start(id)}>
++                        </HostActionBtn>
++                        <HostActionBtn label="Start" variant="outline" onClick={() => void start(id)}>
                            <Power />
--                        </Button>
--                        <Button size="icon-sm" variant="outline" onClick={() => void stop(id)}>
++                        </HostActionBtn>
++                        <HostActionBtn label="Stop" variant="outline" onClick={() => void stop(id)}>
                            <PowerOff />
--                        </Button>
--                        <Button size="icon-sm" variant="ghost" onClick={() => void remove(id)}>
++                        </HostActionBtn>
++                        <HostActionBtn label="Remove" onClick={() => void remove(id)}>
                            <Trash2 />
--                        </Button>
++                        </HostActionBtn>
                        </div>
                      </td>
                    </tr>
@@@ -252,3 -252,3 +259,32 @@@
      </div>
    );
  }
++
++function HostActionBtn({
++  label,
++  children,
++  onClick,
++  disabled,
++  variant = "ghost",
++  size = "icon-sm",
++}: {
++  label: string;
++  children: ReactNode;
++  onClick: () => void;
++  disabled?: boolean;
++  variant?: "ghost" | "outline" | "default";
++  size?: "icon-sm" | "sm";
++}) {
++  return (
++    <Tooltip>
++      <TooltipTrigger
++        render={
++          <Button variant={variant} size={size} aria-label={label} disabled={disabled} onClick={onClick} />
++        }
++      >
++        {children}
++      </TooltipTrigger>
++      <TooltipContent>{label}</TooltipContent>
++    </Tooltip>
++  );
++}
diff --cc src/components/app/filter-sidebar.tsx
index 82fb3bb,82fb3bb..65bc2d1
--- a/src/components/app/filter-sidebar.tsx
+++ b/src/components/app/filter-sidebar.tsx
@@@ -87,6 -87,6 +87,7 @@@ export function FilterSidebar(
    labelPluginEnabled = null,
    definedLabels = EMPTY_LABELS,
    showLabelGroup = true,
++  loading = false,
    className,
  }: {
    filters: Record<string, FilterTuple[]> | null;
@@@ -97,6 -97,6 +98,7 @@@
    labelPluginEnabled?: boolean | null;
    definedLabels?: string[];
    showLabelGroup?: boolean;
++  loading?: boolean;
    className?: string;
  }) {
    const [newLabel, setNewLabel] = useState("");
@@@ -164,12 -164,12 +166,13 @@@
  
    return (
      <ScrollArea className={cn("h-full", className)}>
--      <div className="flex flex-col gap-5 p-3">
++      <div className="flex flex-col gap-5 p-3" aria-busy={loading || undefined}>
          <FilterGroup
            id="state"
            title="State"
            collapsed={collapsedGroups.has("state")}
            onToggle={() => toggleGroup("state")}
++          loading={loading}
          >
            {stateCatalog.map(([name, count]) => (
              <FilterButton
@@@ -189,6 -189,6 +192,7 @@@
            title="Trackers"
            collapsed={collapsedGroups.has("trackers")}
            onToggle={() => toggleGroup("trackers")}
++          loading={loading}
          >
            {trackers.map((row) => (
              <FilterButton
@@@ -209,6 -209,6 +213,7 @@@
            title="Labels"
            collapsed={collapsedGroups.has("labels")}
            onToggle={() => toggleGroup("labels")}
++          loading={loading}
          >
            {labels.map((row) => {
              const item = (
@@@ -358,12 -358,12 +363,14 @@@ function FilterGroup(
    title,
    collapsed,
    onToggle,
++  loading = false,
    children,
  }: {
    id: string;
    title: string;
    collapsed: boolean;
    onToggle: () => void;
++  loading?: boolean;
    children: React.ReactNode;
  }) {
    const panelId = `sidebar-group-${id}`;
@@@ -386,7 -386,7 +393,11 @@@
          </button>
        </h3>
        <div id={panelId} hidden={collapsed} className={collapsed ? "hidden" : "flex flex-col gap-0.5"}>
--        {children}
++        {loading ? (
++          <p className="px-2 py-1 text-sm text-muted-foreground">Loading…</p>
++        ) : (
++          children
++        )}
        </div>
      </section>
    );
diff --cc src/components/app/theme-toggle.tsx
index c30e9ab,c30e9ab..21740f5
--- a/src/components/app/theme-toggle.tsx
+++ b/src/components/app/theme-toggle.tsx
@@@ -9,6 -9,6 +9,9 @@@ import 
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
++  DropdownMenuSub,
++  DropdownMenuSubContent,
++  DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  
@@@ -18,18 -18,18 +21,59 @@@ const THEMES = 
    { value: "dark", label: "Dark", icon: Moon },
  ] as const;
  
--export function ThemeToggle() {
++function useThemeSelection() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
  
    const selected = mounted ? (theme ?? "system") : "system";
    const Icon =
--    !mounted || selected === "system"
--      ? Monitor
--      : selected === "light"
--        ? Sun
--        : Moon;
++    !mounted || selected === "system" ? Monitor : selected === "light" ? Sun : Moon;
++
++  return { selected, setTheme, resolvedTheme, mounted, Icon };
++}
++
++function ThemeRadioItems({
++  selected,
++  onChange,
++}: {
++  selected: string;
++  onChange: (value: string) => void;
++}) {
++  return (
++    <DropdownMenuRadioGroup
++      value={selected}
++      onValueChange={(value) => {
++        if (value) onChange(value);
++      }}
++    >
++      {THEMES.map(({ value, label, icon: ItemIcon }) => (
++        <DropdownMenuRadioItem key={value} value={value}>
++          <ItemIcon />
++          {label}
++        </DropdownMenuRadioItem>
++      ))}
++    </DropdownMenuRadioGroup>
++  );
++}
++
++export function ThemeMenuSub() {
++  const { selected, setTheme, Icon } = useThemeSelection();
++
++  return (
++    <DropdownMenuSub>
++      <DropdownMenuSubTrigger>
++        <Icon /> Theme
++      </DropdownMenuSubTrigger>
++      <DropdownMenuSubContent>
++        <ThemeRadioItems selected={selected} onChange={setTheme} />
++      </DropdownMenuSubContent>
++    </DropdownMenuSub>
++  );
++}
++
++export function ThemeToggle() {
++  const { selected, setTheme, resolvedTheme, mounted, Icon } = useThemeSelection();
  
    return (
      <DropdownMenu>
@@@ -50,19 -50,19 +94,7 @@@
          <Icon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
--        <DropdownMenuRadioGroup
--          value={selected}
--          onValueChange={(value) => {
--            if (value) setTheme(value);
--          }}
--        >
--          {THEMES.map(({ value, label, icon: ItemIcon }) => (
--            <DropdownMenuRadioItem key={value} value={value}>
--              <ItemIcon />
--              {label}
--            </DropdownMenuRadioItem>
--          ))}
--        </DropdownMenuRadioGroup>
++        <ThemeRadioItems selected={selected} onChange={setTheme} />
        </DropdownMenuContent>
      </DropdownMenu>
    );
diff --cc src/components/app/torrent-dialogs.test.ts
index dc00e42,dc00e42..a61068b
--- a/src/components/app/torrent-dialogs.test.ts
+++ b/src/components/app/torrent-dialogs.test.ts
@@@ -28,13 -28,13 +28,40 @@@ assert.doesNotMatch(addDialog, /sm:max-
  assert.doesNotMatch(addDialog, /sm:max-w-3xl/);
  
  assert.match(addDialog, /id="add-torrent-file-name"/);
++assert.match(addDialog, /id="add-torrent-choose-file"/);
++assert.match(addDialog, /chooseFileRef/);
++assert.match(addDialog, /initialFocus=\{chooseFileRef\}/);
++assert.match(addDialog, /ref=\{chooseFileRef\}/);
++assert.match(addDialog, /if \(!open\) \{[\s\S]*?setTab\("file"\)/);
  assert.match(addDialog, /min-w-0 flex-1 truncate overflow-hidden/);
  assert.match(addDialog, /Choose torrent file/);
  assert.match(addDialog, /Advanced settings/);
  
++const fileInput = addDialog.slice(addDialog.indexOf("<input"), addDialog.indexOf('id="add-torrent-choose-file"'));
++assert.match(fileInput, /type="file"/);
++assert.match(fileInput, /tabIndex=\{-1\}/);
++assert.doesNotMatch(fileInput, /autoFocus/);
++
++const chooseStart = addDialog.lastIndexOf("<Button", addDialog.indexOf('id="add-torrent-choose-file"'));
++const chooseBtn = addDialog.slice(chooseStart, addDialog.indexOf("Choose torrent file"));
++assert.match(chooseBtn, /autoFocus/);
++assert.match(chooseBtn, /ref=\{chooseFileRef\}/);
++assert.match(chooseBtn, /id="add-torrent-choose-file"/);
++
++const magnetTab = addDialog.slice(
++  addDialog.indexOf('TabsContent value="magnet"'),
++  addDialog.indexOf('TabsContent value="url"')
++);
++const urlTab = addDialog.slice(addDialog.indexOf('TabsContent value="url"'), addDialog.indexOf("TorrentPreviewCard"));
++assert.doesNotMatch(magnetTab, /autoFocus/);
++assert.doesNotMatch(urlTab, /autoFocus/);
++
  assert.match(addDialog, /<TorrentPreviewCard/);
  assert.doesNotMatch(addDialog, /preview \? <TorrentPreviewCard/);
  assert.match(addDialog, /className="min-h-16"/);
++assert.match(addDialog, /useState<AddTab>\("file"\)/);
++assert.doesNotMatch(addDialog, /useState<AddTab>\("(magnet|url)"\)/);
++assert.match(addDialog, /setTab\("file"\)/);
  assert.match(addDialog, /TabsContent value="file" className="grid min-h-16 min-w-0 gap-3 pt-3"/);
  assert.match(addDialog, /TabsContent value="magnet" className="grid min-h-16 gap-3 pt-3"/);
  assert.match(addDialog, /TabsContent value="url" className="grid min-h-16 min-w-0 gap-3 pt-3"/);
diff --cc src/components/app/torrent-dialogs.tsx
index f988ae6,f988ae6..e163a32
--- a/src/components/app/torrent-dialogs.tsx
+++ b/src/components/app/torrent-dialogs.tsx
@@@ -115,12 -115,12 +115,14 @@@ export function AddTorrentDialog(
    const [fileDragOver, setFileDragOver] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
++  const chooseFileRef = useRef<HTMLButtonElement>(null);
    const loadGen = useRef(0);
    const transmission = getStoredClientKind() === "transmission";
  
    useEffect(() => {
      if (!open) {
        loadGen.current += 1;
++      setTab("file");
        return;
      }
      const gen = ++loadGen.current;
@@@ -345,7 -345,7 +347,10 @@@
  
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
--      <DialogContent className="max-h-[90vh] min-w-0 max-w-[calc(100%-2rem)] grid-cols-1 overflow-x-hidden overflow-y-auto sm:max-w-xl">
++      <DialogContent
++        className="max-h-[90vh] min-w-0 max-w-[calc(100%-2rem)] grid-cols-1 overflow-x-hidden overflow-y-auto sm:max-w-xl"
++        initialFocus={chooseFileRef}
++      >
          <DialogHeader>
            <DialogTitle>Add torrent</DialogTitle>
          </DialogHeader>
@@@ -411,9 -411,9 +416,12 @@@
                />
                <div className="flex min-w-0 items-center gap-x-3 gap-y-1.5">
                  <Button
++                  ref={chooseFileRef}
++                  id="add-torrent-choose-file"
                    type="button"
                    variant="outline"
                    className="shrink-0"
++                  autoFocus
                    aria-describedby="add-torrent-file-name"
                    onClick={() => fileInputRef.current?.click()}
                  >
diff --cc src/components/app/torrent-shell-toolbar.test.ts
index c48fe2d,c48fe2d..243f5ac
--- a/src/components/app/torrent-shell-toolbar.test.ts
+++ b/src/components/app/torrent-shell-toolbar.test.ts
@@@ -5,13 -5,13 +5,10 @@@ import { fileURLToPath } from "node:url
  
  const dir = dirname(fileURLToPath(import.meta.url));
  const shell = readFileSync(join(dir, "torrent-shell.tsx"), "utf8");
++const table = readFileSync(join(dir, "torrent-table.tsx"), "utf8");
  const brand = readFileSync(join(dir, "brand.tsx"), "utf8");
  const login = readFileSync(join(dir, "login-screen.tsx"), "utf8");
  
--const toolbar = shell.slice(
--  shell.indexOf("const toolbar ="),
--  shell.indexOf("const table =")
--);
  const header = shell.slice(
    shell.indexOf("<header"),
    shell.indexOf("{error ?")
@@@ -20,29 -20,29 +17,86 @@@ const footer = shell.slice
    shell.indexOf("<footer"),
    shell.indexOf("<Sheet open={sidebarOpen}")
  );
++const addBtn = shell.slice(
++  shell.indexOf("function AddTorrentButton"),
++  shell.indexOf("function AddTorrentButton") + 500
++);
  
--assert.doesNotMatch(toolbar, /flex-wrap/, "toolbar stays on one row");
--assert.match(toolbar, /flex shrink-0 items-center/);
--assert.match(toolbar, /hidden md:inline-flex/);
--assert.match(toolbar, /hidden lg:inline-flex/);
--assert.match(toolbar, /Queue top/);
--assert.match(toolbar, /Move storage/);
--assert.match(toolbar, /Force recheck/);
--
--assert.match(header, /flex min-h-10 min-w-0 shrink-0 items-center/);
++assert.doesNotMatch(shell, /const toolbar =/);
  assert.doesNotMatch(header, /flex-wrap/);
++assert.match(header, /flex min-h-10 min-w-0 shrink-0 items-center/);
  assert.match(header, /wordmarkClassName="hidden sm:inline"/);
  assert.match(header, /min-w-0 max-w-xs flex-1 max-sm:hidden/);
  assert.match(header, /aria-label="Search torrents"/);
  assert.match(header, /sm:hidden/);
  assert.match(header, /Close search/);
--assert.match(header, /className="md:hidden"/);
--assert.match(header, /className="lg:hidden"/);
--assert.match(header, /Preferences/);
--assert.match(header, /More actions/);
--assert.match(header, /Queue top/);
--assert.match(header, /Move storage/);
--assert.match(header, /Force recheck/);
++assert.match(header, /<AddTorrentButton/);
++assert.ok(
++  header.lastIndexOf("<SearchField") < header.lastIndexOf("<AddTorrentButton"),
++  "Add torrent sits after search"
++);
++assert.ok(
++  header.lastIndexOf('aria-label="Search torrents"') < header.lastIndexOf("<AddTorrentButton"),
++  "Add torrent sits after the mobile search icon"
++);
++
++assert.match(addBtn, /<Button className="h-8 min-w-0 shrink"/);
++assert.match(addBtn, /<Plus \/>/);
++assert.match(addBtn, /\{label\}/);
++assert.match(addBtn, />Add</);
++assert.match(addBtn, /title=\{label\}/);
++assert.doesNotMatch(addBtn, /Add torrent…/);
++assert.doesNotMatch(addBtn, /variant=/);
++assert.doesNotMatch(addBtn, /size=/);
++assert.doesNotMatch(addBtn, /disabled/);
++assert.match(shell, /className="h-8 min-w-0 pl-7"/);
++assert.ok(
++  shell.includes('className="h-8 min-w-0 pl-7"') && shell.includes('className="h-8 min-w-0 shrink"'),
++  "Search input and Add torrent share h-8"
++);
++
++assert.doesNotMatch(header, /Queue top/);
++assert.doesNotMatch(header, /Queue up/);
++assert.doesNotMatch(header, /Queue down/);
++assert.doesNotMatch(header, /Queue bottom/);
++assert.doesNotMatch(header, /Move storage/);
++assert.doesNotMatch(header, /Force recheck/);
++assert.doesNotMatch(header, /label="Pause"/);
++assert.doesNotMatch(header, /label="Resume"/);
++assert.doesNotMatch(header, /label="Remove"/);
++assert.doesNotMatch(header, /className="md:hidden"/);
++assert.doesNotMatch(header, /className="lg:hidden"/);
++assert.doesNotMatch(header, /hidden md:inline-flex/);
++assert.doesNotMatch(header, /hidden lg:inline-flex/);
++
++assert.match(header, /Preferences…/);
++assert.match(header, /Connection Manager…/);
++assert.match(header, /Open hosts page/);
++assert.doesNotMatch(header, /Open hosts page…/);
++assert.match(header, /aria-label="Menu"/);
++assert.ok(
++  header.indexOf('aria-label="Menu"') < header.indexOf("<Brand"),
++  "hamburger sits left of the logo"
++);
++assert.match(header, /ThemeMenuSub/);
++assert.match(header, /About Nova/);
++assert.doesNotMatch(header, /About Nova…/);
++assert.ok(
++  header.indexOf("About Nova") < header.indexOf("Preferences…"),
++  "About Nova sits above Preferences in the hamburger"
++);
++assert.doesNotMatch(header, /More actions/);
++assert.doesNotMatch(header, /ThemeToggle/);
++
++assert.match(table, /<Pause \/> Pause/);
++assert.match(table, /<Play \/> Resume/);
++assert.match(table, /<Trash2 \/> Remove/);
++assert.match(table, /<ChevronsUp \/> Queue top/);
++assert.match(table, /<ArrowUp \/> Queue up/);
++assert.match(table, /<ArrowDown \/> Queue down/);
++assert.match(table, /<ChevronsDown \/> Queue bottom/);
++assert.match(table, /<FolderInput \/> Move storage…/);
++assert.match(table, /<RefreshCw \/> Force recheck/);
  
  assert.match(footer, /overflow-x-auto/);
  assert.match(footer, /flex-wrap/);
@@@ -52,6 -52,6 +106,37 @@@ assert.match(footer, /sm:ml-auto/)
  assert.match(shell, /show_session_speed|isWebSessionSpeedVisible|showSessionSpeed/);
  assert.match(shell, /w-\[min\(18rem,100%\)\]/);
  assert.match(shell, /data-torrent-search/);
++assert.match(shell, /decideTorrentSearchFindAction/);
++assert.match(shell, /decideAddTorrentShortcutAction/);
++assert.match(shell, /isMacPlatform\(navigator\.userAgent\)/);
++assert.match(shell, /setSearchExpanded\(true\)/);
++assert.match(shell, /torrentSearchShortcutTitle/);
++assert.match(shell, /torrentSearchPlaceholder/);
++assert.match(shell, /addTorrentShortcutTitle/);
++assert.match(shell, /DEFAULT_TORRENT_SEARCH_PLACEHOLDER/);
++assert.match(shell, /DEFAULT_ADD_TORRENT_LABEL/);
++assert.match(shell, /setSearchPlaceholder\(torrentSearchPlaceholder/);
++assert.match(shell, /setAddTorrentLabel\(addTorrentShortcutTitle/);
++assert.match(shell, /placeholder=\{placeholder\}/);
++assert.match(shell, /focusVisibleTorrentSearch/);
++assert.match(shell, /setAddOpen\(true\)/);
++assert.doesNotMatch(shell, /placeholder="Search torrents"/);
++assert.doesNotMatch(shell, /⌥⌘N|Ctrl\+Alt\+N|⌘⇧N|Ctrl\+Shift\+N/);
++assert.match(
++  table,
++  /if \(loading && !hasUi\)/,
++  "table first-paint is loading with no UI yet"
++);
++assert.match(
++  shell,
++  /const sidebarLoading = loading && !ui/,
++  "sidebar loading matches the table first-paint window"
++);
++assert.equal(
++  [...shell.matchAll(/loading=\{sidebarLoading\}/g)].length,
++  2,
++  "desktop sidebar and mobile filter sheet share the same loading flag"
++);
  
  assert.match(brand, /wordmarkClassName/);
  assert.match(brand, /min-w-0 truncate font-heading/);
diff --cc src/components/app/torrent-shell.tsx
index e714c6c,e714c6c..69e88ec
--- a/src/components/app/torrent-shell.tsx
+++ b/src/components/app/torrent-shell.tsx
@@@ -2,22 -2,22 +2,14 @@@
  
  import { useCallback, useEffect, useMemo, useRef, useState } from "react";
  import {
--  ArrowDown,
--  ArrowUp,
--  ChevronsDown,
--  ChevronsUp,
--  FolderInput,
++  Info,
    LogOut,
    Menu,
--  MoreHorizontal,
--  Pause,
--  Play,
++  PanelLeft,
    Plus,
--  RefreshCw,
    Search,
    Server,
    Settings,
--  Trash2,
    X,
  } from "lucide-react";
  import { toast } from "sonner";
@@@ -27,7 -27,7 +19,7 @@@ import { ConnectionManager } from "@/co
  import { DragResizeHandle } from "@/components/app/drag-resize-handle";
  import { FilterSidebar, type SidebarFilters } from "@/components/app/filter-sidebar";
  import { PreferencesDialog } from "@/components/app/preferences-dialog";
--import { ThemeToggle } from "@/components/app/theme-toggle";
++import { ThemeMenuSub } from "@/components/app/theme-toggle";
  import { TorrentDetails } from "@/components/app/torrent-details";
  import {
    AddTorrentDialog,
@@@ -51,7 -51,7 +43,6 @@@ import 
  } from "@/components/ui/dropdown-menu";
  import { Input } from "@/components/ui/input";
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
--import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
  import { useIsMobile } from "@/hooks/use-is-mobile";
  import { clientCapabilities, getStoredClientKind, rpc } from "@/lib/deluge/client";
  import { formatBytes, formatRate } from "@/lib/deluge/format";
@@@ -63,9 -63,9 +54,18 @@@ import 
    labelRpcErrorMessage,
  } from "@/lib/deluge/label-plugin";
  import {
++  addTorrentShortcutTitle,
    classifyEscapeTarget,
++  decideAddTorrentShortcutAction,
    decideEscapeSelectionAction,
++  decideTorrentSearchFindAction,
++  DEFAULT_ADD_TORRENT_LABEL,
++  DEFAULT_TORRENT_SEARCH_PLACEHOLDER,
    hasOpenDismissibleOverlay,
++  isMacPlatform,
++  torrentSearchPlaceholder,
++  torrentSearchShortcutTitle,
++  TORRENT_SEARCH_SELECTOR,
  } from "@/lib/deluge/escape-selection";
  import {
    clampSidebarSelection,
@@@ -179,12 -179,12 +179,20 @@@ export function TorrentShell(
    const searchValueRef = useRef(search);
    const selectedRef = useRef(selected);
    const activeIdRef = useRef(activeId);
++  const wantSearchFocusRef = useRef(false);
    const pollGen = useRef(0);
++  const [searchFieldTitle, setSearchFieldTitle] = useState<string | undefined>(undefined);
++  const [searchPlaceholder, setSearchPlaceholder] = useState(DEFAULT_TORRENT_SEARCH_PLACEHOLDER);
++  const [addTorrentLabel, setAddTorrentLabel] = useState(DEFAULT_ADD_TORRENT_LABEL);
    searchValueRef.current = search;
    selectedRef.current = selected;
    activeIdRef.current = activeId;
  
    useEffect(() => {
++    const isMac = isMacPlatform(navigator.userAgent);
++    setSearchFieldTitle(torrentSearchShortcutTitle(isMac));
++    setSearchPlaceholder(torrentSearchPlaceholder(isMac));
++    setAddTorrentLabel(addTorrentShortcutTitle(isMac));
      setVisibleColumnIds(loadTorrentColumnVisibility());
      setColumnOrder(loadTorrentColumnOrder());
      setSidebarWidth(loadSidebarWidth());
@@@ -349,6 -349,6 +357,7 @@@
      () => sidebarFilterTreeFromTorrents(Object.values(ui?.torrents ?? {}), filters),
      [ui?.torrents, filters]
    );
++  const sidebarLoading = loading && !ui;
    const visibleTorrents = useMemo(
      () => filterTorrentMap(ui?.torrents, filters),
      [ui?.torrents, filters]
@@@ -472,13 -472,13 +481,45 @@@
  
    const openAdd = useCallback(() => setAddOpen(true), []);
  
++  useEffect(() => {
++    if (!wantSearchFocusRef.current) return;
++    if (focusVisibleTorrentSearch()) wantSearchFocusRef.current = false;
++  }, [searchExpanded]);
++
    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
++      const overlayOpen = hasOpenDismissibleOverlay(document);
++      const targetKind = classifyEscapeTarget(event.target);
++      const isMac = isMacPlatform(navigator.userAgent);
++      const shortcutInput = {
++        key: event.key,
++        metaKey: event.metaKey,
++        ctrlKey: event.ctrlKey,
++        altKey: event.altKey,
++        shiftKey: event.shiftKey,
++        defaultPrevented: event.defaultPrevented,
++        overlayOpen,
++        targetKind,
++        isMac,
++      };
++      const findAction = decideTorrentSearchFindAction(shortcutInput);
++      if (findAction === "focus-search") {
++        event.preventDefault();
++        if (focusVisibleTorrentSearch()) return;
++        wantSearchFocusRef.current = true;
++        setSearchExpanded(true);
++        return;
++      }
++      if (decideAddTorrentShortcutAction(shortcutInput) === "open-add") {
++        event.preventDefault();
++        setAddOpen(true);
++        return;
++      }
        const action = decideEscapeSelectionAction({
          key: event.key,
          defaultPrevented: event.defaultPrevented,
--        overlayOpen: hasOpenDismissibleOverlay(document),
--        targetKind: classifyEscapeTarget(event.target),
++        overlayOpen,
++        targetKind,
          search: searchValueRef.current,
          selectedCount: selectedRef.current.size,
          hasActiveId: activeIdRef.current != null,
@@@ -499,72 -499,72 +540,6 @@@
    const downloadPath =
      primaryTorrent?.download_location || "/home/deluge/Downloads";
  
--  const hasSelection = selectedIds.length > 0;
--  const toolbar = (
--    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
--      <ToolBtn label="Add torrent" onClick={() => setAddOpen(true)}>
--        <Plus />
--      </ToolBtn>
--      <ToolBtn label="Pause" disabled={!hasSelection} onClick={() => void act("core.pause_torrent")}>
--        <Pause />
--      </ToolBtn>
--      <ToolBtn label="Resume" disabled={!hasSelection} onClick={() => void act("core.resume_torrent")}>
--        <Play />
--      </ToolBtn>
--      <ToolBtn label="Remove" disabled={!hasSelection} onClick={() => setRemoveOpen(true)}>
--        <Trash2 />
--      </ToolBtn>
--      <ToolBtn
--        label="Queue top"
--        className="hidden md:inline-flex"
--        disabled={!hasSelection}
--        onClick={() => void act("core.queue_top")}
--      >
--        <ChevronsUp />
--      </ToolBtn>
--      <ToolBtn
--        label="Queue up"
--        className="hidden md:inline-flex"
--        disabled={!hasSelection}
--        onClick={() => void act("core.queue_up")}
--      >
--        <ArrowUp />
--      </ToolBtn>
--      <ToolBtn
--        label="Queue down"
--        className="hidden md:inline-flex"
--        disabled={!hasSelection}
--        onClick={() => void act("core.queue_down")}
--      >
--        <ArrowDown />
--      </ToolBtn>
--      <ToolBtn
--        label="Queue bottom"
--        className="hidden md:inline-flex"
--        disabled={!hasSelection}
--        onClick={() => void act("core.queue_bottom")}
--      >
--        <ChevronsDown />
--      </ToolBtn>
--      <ToolBtn
--        label="Move storage"
--        className="hidden lg:inline-flex"
--        disabled={!hasSelection}
--        onClick={() => setMoveOpen(true)}
--      >
--        <FolderInput />
--      </ToolBtn>
--      <ToolBtn
--        label="Force recheck"
--        className="hidden lg:inline-flex"
--        disabled={!hasSelection}
--        onClick={() => void act("core.force_recheck")}
--      >
--        <RefreshCw />
--      </ToolBtn>
--    </div>
--  );
--
    const table = (
      <TorrentTable
        torrents={torrents}
@@@ -625,7 -625,7 +600,15 @@@
              >
                <X />
              </Button>
--            <SearchField autoFocus value={search} onChange={setSearch} className="min-w-0 flex-1" />
++            <SearchField
++              autoFocus
++              value={search}
++              onChange={setSearch}
++              title={searchFieldTitle}
++              placeholder={searchPlaceholder}
++              className="min-w-0 flex-1"
++            />
++            <AddTorrentButton onClick={openAdd} label={addTorrentLabel} />
            </div>
          ) : null}
          <div
@@@ -642,25 -642,25 +625,56 @@@
                onClick={() => setSidebarOpen(true)}
                aria-label="Filters"
              >
--              <Menu />
++              <PanelLeft />
              </Button>
            ) : null}
++          <DropdownMenu>
++            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Menu" />}>
++              <Menu />
++            </DropdownMenuTrigger>
++            <DropdownMenuContent align="start" className="min-w-52">
++              <DropdownMenuItem className="whitespace-nowrap" onClick={() => setAboutOpen(true)}>
++                <Info /> About Nova
++              </DropdownMenuItem>
++              <DropdownMenuSeparator />
++              <DropdownMenuItem className="whitespace-nowrap" onClick={() => setPrefsOpen(true)}>
++                <Settings /> Preferences…
++              </DropdownMenuItem>
++              {caps.connectionManager ? (
++                <>
++                  <DropdownMenuSeparator />
++                  <DropdownMenuItem className="whitespace-nowrap" onClick={() => setHostsOpen(true)}>
++                    <Server /> Connection Manager…
++                  </DropdownMenuItem>
++                  <DropdownMenuItem className="whitespace-nowrap" onClick={() => onManageHosts()}>
++                    <Server /> Open hosts page
++                  </DropdownMenuItem>
++                </>
++              ) : null}
++              <DropdownMenuSeparator />
++              <ThemeMenuSub />
++              <DropdownMenuSeparator />
++              <DropdownMenuItem className="whitespace-nowrap" onClick={() => void logout()}>
++                <LogOut /> Sign out
++              </DropdownMenuItem>
++            </DropdownMenuContent>
++          </DropdownMenu>
            <Brand
              className="min-w-0 shrink"
              markClassName="size-6"
              wordmarkClassName="hidden sm:inline"
--            onClick={() => setAboutOpen(true)}
            />
--          {toolbar}
            <SearchField
              value={search}
              onChange={setSearch}
++            title={searchFieldTitle}
++            placeholder={searchPlaceholder}
              className="relative ml-auto min-w-0 max-w-xs flex-1 max-sm:hidden"
            />
            <Button
              variant="ghost"
              size="icon-sm"
--            className="relative shrink-0 sm:hidden"
++            className="relative ml-auto shrink-0 sm:hidden"
              aria-label="Search torrents"
              aria-expanded={false}
              onClick={() => setSearchExpanded(true)}
@@@ -670,79 -670,79 +684,7 @@@
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" aria-hidden />
              ) : null}
            </Button>
--          <ToolBtn label="Preferences" className="hidden sm:inline-flex" onClick={() => setPrefsOpen(true)}>
--            <Settings />
--          </ToolBtn>
--          <DropdownMenu>
--            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
--              <MoreHorizontal />
--            </DropdownMenuTrigger>
--            <DropdownMenuContent align="end" className="min-w-52">
--              <OverflowItem
--                className="md:hidden"
--                disabled={!hasSelection}
--                onClick={() => void act("core.queue_top")}
--              >
--                <ChevronsUp /> Queue top
--              </OverflowItem>
--              <OverflowItem
--                className="md:hidden"
--                disabled={!hasSelection}
--                onClick={() => void act("core.queue_up")}
--              >
--                <ArrowUp /> Queue up
--              </OverflowItem>
--              <OverflowItem
--                className="md:hidden"
--                disabled={!hasSelection}
--                onClick={() => void act("core.queue_down")}
--              >
--                <ArrowDown /> Queue down
--              </OverflowItem>
--              <OverflowItem
--                className="md:hidden"
--                disabled={!hasSelection}
--                onClick={() => void act("core.queue_bottom")}
--              >
--                <ChevronsDown /> Queue bottom
--              </OverflowItem>
--              <OverflowItem
--                className="lg:hidden"
--                disabled={!hasSelection}
--                onClick={() => setMoveOpen(true)}
--              >
--                <FolderInput /> Move storage
--              </OverflowItem>
--              <OverflowItem
--                className="lg:hidden"
--                disabled={!hasSelection}
--                onClick={() => void act("core.force_recheck")}
--              >
--                <RefreshCw /> Force recheck
--              </OverflowItem>
--              <OverflowItem className="sm:hidden" onClick={() => setPrefsOpen(true)}>
--                <Settings /> Preferences
--              </OverflowItem>
--              {caps.connectionManager ? (
--                <>
--                  <DropdownMenuSeparator className="lg:hidden" />
--                  <DropdownMenuItem className="whitespace-nowrap" onClick={() => setHostsOpen(true)}>
--                    <Server /> Connection Manager
--                  </DropdownMenuItem>
--                  <DropdownMenuItem className="whitespace-nowrap" onClick={() => onManageHosts()}>
--                    <Server /> Open hosts page
--                  </DropdownMenuItem>
--                </>
--              ) : (
--                <DropdownMenuSeparator className="lg:hidden" />
--              )}
--              <DropdownMenuSeparator />
--              <DropdownMenuItem className="whitespace-nowrap" onClick={() => void logout()}>
--                <LogOut /> Sign out
--              </DropdownMenuItem>
--            </DropdownMenuContent>
--          </DropdownMenu>
--          <ThemeToggle />
++          <AddTorrentButton onClick={openAdd} label={addTorrentLabel} />
          </div>
        </header>
  
@@@ -768,6 -768,6 +710,7 @@@
                  definedLabels={labels}
                  onLabelsChanged={onLabelsChanged}
                  showLabelGroup={caps.kind === "deluge" || Boolean(ui?.filters?.label)}
++                loading={sidebarLoading}
                  className="h-full min-w-0"
                />
              </aside>
@@@ -852,6 -852,6 +795,7 @@@
              definedLabels={labels}
              onLabelsChanged={onLabelsChanged}
              showLabelGroup={caps.kind === "deluge" || Boolean(ui?.filters?.label)}
++            loading={sidebarLoading}
            />
          </SheetContent>
        </Sheet>
@@@ -905,16 -905,16 +849,31 @@@
    );
  }
  
++function focusVisibleTorrentSearch(): boolean {
++  const nodes = document.querySelectorAll<HTMLInputElement>(TORRENT_SEARCH_SELECTOR);
++  for (const node of nodes) {
++    if (node.getClientRects().length === 0) continue;
++    node.focus();
++    node.select();
++    return true;
++  }
++  return false;
++}
++
  function SearchField({
    value,
    onChange,
    className,
    autoFocus,
++  title,
++  placeholder,
  }: {
    value: string;
    onChange: (next: string) => void;
    className?: string;
    autoFocus?: boolean;
++  title?: string;
++  placeholder: string;
  }) {
    return (
      <div className={cn("relative min-w-0", className)}>
@@@ -923,8 -923,8 +882,9 @@@
          data-torrent-search=""
          value={value}
          onChange={(e) => onChange(e.target.value)}
--        placeholder="Search torrents"
++        placeholder={placeholder}
          aria-label="Search torrents"
++        title={title}
          autoFocus={autoFocus}
          className="h-8 min-w-0 pl-7"
        />
@@@ -932,58 -932,58 +892,12 @@@
    );
  }
  
--function OverflowItem({
--  children,
--  onClick,
--  disabled,
--  className,
--}: {
--  children: React.ReactNode;
--  onClick: () => void;
--  disabled?: boolean;
--  className?: string;
--}) {
--  return (
--    <DropdownMenuItem
--      className={cn("whitespace-nowrap", className)}
--      disabled={disabled}
--      onClick={onClick}
--    >
--      {children}
--    </DropdownMenuItem>
--  );
--}
--
--function ToolBtn({
--  label,
--  children,
--  onClick,
--  disabled,
--  className,
--}: {
--  label: string;
--  children: React.ReactNode;
--  onClick: () => void;
--  disabled?: boolean;
--  className?: string;
--}) {
++function AddTorrentButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
--    <Tooltip>
--      <TooltipTrigger
--        render={
--          <Button
--            variant="ghost"
--            size="icon-sm"
--            aria-label={label}
--            disabled={disabled}
--            onClick={onClick}
--            className={cn("disabled:opacity-40 disabled:text-muted-foreground", className)}
--          />
--        }
--      >
--        {children}
--      </TooltipTrigger>
--      <TooltipContent>{label}</TooltipContent>
--    </Tooltip>
++    <Button className="h-8 min-w-0 shrink" onClick={onClick} title={label}>
++      <Plus />
++      <span className="max-[20rem]:hidden">{label}</span>
++      <span className="hidden max-[20rem]:inline">Add</span>
++    </Button>
    );
  }
diff --cc src/components/app/torrent-table.tsx
index ca22721,ca22721..62abd1d
--- a/src/components/app/torrent-table.tsx
+++ b/src/components/app/torrent-table.tsx
@@@ -2,6 -2,6 +2,8 @@@
  
  import { useVirtualizer } from "@tanstack/react-virtual";
  import {
++  ArrowDown,
++  ArrowUp,
    ChevronsDown,
    ChevronsUp,
    FolderInput,
@@@ -649,6 -649,6 +651,16 @@@ const TorrentRow = memo(function Torren
          >
            <ChevronsUp /> Queue top
          </ContextMenuItem>
++        <ContextMenuItem
++          onClick={() => handlersRef.current.act("core.queue_up", handlersRef.current.selectForContext(id))}
++        >
++          <ArrowUp /> Queue up
++        </ContextMenuItem>
++        <ContextMenuItem
++          onClick={() => handlersRef.current.act("core.queue_down", handlersRef.current.selectForContext(id))}
++        >
++          <ArrowDown /> Queue down
++        </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              handlersRef.current.act("core.queue_bottom", handlersRef.current.selectForContext(id))
@@@ -661,7 -661,7 +673,7 @@@
              handlersRef.current.move(handlersRef.current.selectForContext(id));
            }}
          >
--          <FolderInput /> Move storage
++          <FolderInput /> Move storage…
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
diff --cc src/lib/deluge/escape-selection.test.ts
index d88ae21,d88ae21..e7f871b
--- a/src/lib/deluge/escape-selection.test.ts
+++ b/src/lib/deluge/escape-selection.test.ts
@@@ -3,10 -3,10 +3,22 @@@ import { readFileSync } from "node:fs"
  import { dirname, join } from "node:path";
  import { fileURLToPath } from "node:url";
  import {
++  DEFAULT_ADD_TORRENT_LABEL,
++  DEFAULT_TORRENT_SEARCH_PLACEHOLDER,
    DISMISSIBLE_OVERLAY_SELECTOR,
++  addTorrentShortcutLabel,
++  addTorrentShortcutTitle,
++  decideAddTorrentShortcutAction,
    decideEscapeSelectionAction,
++  decideTorrentSearchFindAction,
    hasOpenDismissibleOverlay,
++  isMacPlatform,
++  torrentSearchPlaceholder,
++  torrentSearchShortcutLabel,
++  torrentSearchShortcutTitle,
    type EscapeSelectionInput,
++  type ModifierShortcutInput,
++  type TorrentSearchFindInput,
  } from "./escape-selection";
  
  const here = dirname(fileURLToPath(import.meta.url));
@@@ -99,11 -99,11 +111,101 @@@ assert.match(DISMISSIBLE_OVERLAY_SELECT
  
  const shellSource = readFileSync(join(here, "../../components/app/torrent-shell.tsx"), "utf8");
  assert.match(shellSource, /decideEscapeSelectionAction/);
++assert.match(shellSource, /decideTorrentSearchFindAction/);
++assert.match(shellSource, /decideAddTorrentShortcutAction/);
  assert.match(shellSource, /hasOpenDismissibleOverlay/);
  assert.match(shellSource, /window\.addEventListener\("keydown"/);
  assert.match(shellSource, /capture:\s*true/);
  assert.match(shellSource, /setSelected\(new Set\(\)\)/);
  assert.match(shellSource, /setActiveId\(null\)/);
  assert.match(shellSource, /data-torrent-search/);
++assert.match(shellSource, /setSearchExpanded\(true\)/);
++assert.match(shellSource, /focusVisibleTorrentSearch/);
++assert.match(shellSource, /setAddOpen\(true\)/);
++assert.match(shellSource, /torrentSearchPlaceholder/);
++assert.match(shellSource, /addTorrentShortcutTitle/);
++assert.match(shellSource, /DEFAULT_TORRENT_SEARCH_PLACEHOLDER/);
++assert.match(shellSource, /DEFAULT_ADD_TORRENT_LABEL/);
++assert.match(shellSource, /setSearchPlaceholder\(torrentSearchPlaceholder/);
++assert.match(shellSource, /setAddTorrentLabel\(addTorrentShortcutTitle/);
++assert.doesNotMatch(
++  shellSource,
++  /placeholder="Search torrents"/,
++  "search placeholder is mount-safe, not a hardcoded shortcut"
++);
++
++function find(partial: Partial<TorrentSearchFindInput> = {}): ReturnType<typeof decideTorrentSearchFindAction> {
++  return decideTorrentSearchFindAction({
++    key: "f",
++    metaKey: false,
++    ctrlKey: true,
++    overlayOpen: false,
++    targetKind: "other",
++    isMac: false,
++    ...partial,
++  });
++}
++
++assert.equal(isMacPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), true);
++assert.equal(isMacPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), true);
++assert.equal(isMacPlatform("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), true);
++assert.equal(isMacPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), false);
++assert.equal(isMacPlatform("Mozilla/5.0 (X11; Linux x86_64)"), false);
++assert.equal(DEFAULT_TORRENT_SEARCH_PLACEHOLDER, "Search torrents");
++assert.equal(torrentSearchShortcutLabel(true), "⌘F");
++assert.equal(torrentSearchShortcutLabel(false), "Ctrl+F");
++assert.equal(torrentSearchShortcutTitle(true), "Search torrents (⌘F)");
++assert.equal(torrentSearchShortcutTitle(false), "Search torrents (Ctrl+F)");
++assert.equal(torrentSearchPlaceholder(true), "Search torrents (⌘F)");
++assert.equal(torrentSearchPlaceholder(false), "Search torrents (Ctrl+F)");
++assert.equal(torrentSearchPlaceholder(true), torrentSearchShortcutTitle(true));
++assert.equal(torrentSearchPlaceholder(false), torrentSearchShortcutTitle(false));
++assert.equal(DEFAULT_ADD_TORRENT_LABEL, "Add torrent");
++assert.equal(addTorrentShortcutLabel(true), "⌘A");
++assert.equal(addTorrentShortcutLabel(false), "Ctrl+A");
++assert.equal(addTorrentShortcutTitle(true), "Add torrent (⌘A)");
++assert.equal(addTorrentShortcutTitle(false), "Add torrent (Ctrl+A)");
++
++assert.equal(find(), "focus-search", "Ctrl+F focuses search on Windows/Linux");
++assert.equal(find({ isMac: true, metaKey: true, ctrlKey: false }), "focus-search", "⌘F focuses search on Mac");
++assert.equal(find({ key: "F", isMac: true, metaKey: true, ctrlKey: false }), "focus-search");
++assert.equal(find({ isMac: true, metaKey: false, ctrlKey: true }), "none", "Ctrl+F is not the Mac shortcut");
++assert.equal(find({ isMac: false, metaKey: true, ctrlKey: false }), "none", "⌘F is not the Windows shortcut");
++assert.equal(find({ key: "k" }), "none");
++assert.equal(find({ altKey: true }), "none");
++assert.equal(find({ shiftKey: true }), "none");
++assert.equal(find({ defaultPrevented: true }), "none");
++assert.equal(find({ overlayOpen: true }), "none", "open dialog/menu keeps native find");
++assert.equal(find({ targetKind: "input" }), "none", "other text fields keep native find");
++assert.equal(
++  find({ targetKind: "search" }),
++  "focus-search",
++  "repeat press stays in torrent search"
++);
++
++function add(partial: Partial<ModifierShortcutInput> = {}): ReturnType<typeof decideAddTorrentShortcutAction> {
++  return decideAddTorrentShortcutAction({
++    key: "a",
++    metaKey: false,
++    ctrlKey: true,
++    overlayOpen: false,
++    targetKind: "other",
++    isMac: false,
++    ...partial,
++  });
++}
++
++assert.equal(add(), "open-add", "Ctrl+A opens add on Windows/Linux");
++assert.equal(add({ isMac: true, metaKey: true, ctrlKey: false }), "open-add", "⌘A opens add on Mac");
++assert.equal(add({ key: "A", isMac: true, metaKey: true, ctrlKey: false }), "open-add");
++assert.equal(add({ isMac: true, metaKey: false, ctrlKey: true }), "none", "Ctrl+A is not the Mac shortcut");
++assert.equal(add({ isMac: false, metaKey: true, ctrlKey: false }), "none", "⌘A is not the Windows shortcut");
++assert.equal(add({ key: "n" }), "none");
++assert.equal(add({ altKey: true }), "none");
++assert.equal(add({ shiftKey: true }), "none");
++assert.equal(add({ defaultPrevented: true }), "none");
++assert.equal(add({ overlayOpen: true }), "none", "open dialog/menu keeps the shortcut");
++assert.equal(add({ targetKind: "input" }), "none", "other text fields keep Select All");
++assert.equal(add({ targetKind: "search" }), "none", "search keeps Select All");
  
  console.log("escape-selection tests passed");
diff --cc src/lib/deluge/escape-selection.ts
index 6c8de3b,6c8de3b..363d313
--- a/src/lib/deluge/escape-selection.ts
+++ b/src/lib/deluge/escape-selection.ts
@@@ -36,6 -36,6 +36,91 @@@ export type EscapeSelectionInput = 
    hasActiveId: boolean;
  };
  
++export type TorrentSearchFindAction = "none" | "focus-search";
++
++export type AddTorrentShortcutAction = "none" | "open-add";
++
++export type ModifierShortcutInput = {
++  key: string;
++  metaKey: boolean;
++  ctrlKey: boolean;
++  altKey?: boolean;
++  shiftKey?: boolean;
++  defaultPrevented?: boolean;
++  overlayOpen: boolean;
++  targetKind: EscapeTargetKind;
++  isMac: boolean;
++};
++
++export type TorrentSearchFindInput = ModifierShortcutInput;
++
++export const TORRENT_SEARCH_SELECTOR = "[data-torrent-search]";
++
++export const DEFAULT_TORRENT_SEARCH_PLACEHOLDER = "Search torrents";
++
++export const DEFAULT_ADD_TORRENT_LABEL = "Add torrent";
++
++/** Mac / iOS use ⌘F; Windows and Linux use Ctrl+F. */
++export function isMacPlatform(userAgent: string): boolean {
++  return /Mac|iPhone|iPad|iPod/.test(userAgent);
++}
++
++export function torrentSearchShortcutLabel(isMac: boolean): string {
++  return isMac ? "⌘F" : "Ctrl+F";
++}
++
++export function torrentSearchShortcutTitle(isMac: boolean): string {
++  return `${DEFAULT_TORRENT_SEARCH_PLACEHOLDER} (${torrentSearchShortcutLabel(isMac)})`;
++}
++
++/** Same parenthetical string as the title, so tooltip and placeholder cannot disagree. */
++export function torrentSearchPlaceholder(isMac: boolean): string {
++  return torrentSearchShortcutTitle(isMac);
++}
++
++/** Mac / iOS use ⌘A; Windows and Linux use Ctrl+A. */
++export function addTorrentShortcutLabel(isMac: boolean): string {
++  return isMac ? "⌘A" : "Ctrl+A";
++}
++
++export function addTorrentShortcutTitle(isMac: boolean): string {
++  return `${DEFAULT_ADD_TORRENT_LABEL} (${addTorrentShortcutLabel(isMac)})`;
++}
++
++function matchesLetterShortcut(
++  input: ModifierShortcutInput,
++  letter: string,
++  options: { skipSearch?: boolean } = {}
++): boolean {
++  if (input.defaultPrevented) return false;
++  if (input.overlayOpen) return false;
++  if (input.targetKind === "input") return false;
++  if (options.skipSearch && input.targetKind === "search") return false;
++  if (input.altKey || input.shiftKey) return false;
++  if (input.key !== letter && input.key !== letter.toUpperCase()) return false;
++  const modifier = input.isMac ? input.metaKey : input.ctrlKey;
++  const other = input.isMac ? input.ctrlKey : input.metaKey;
++  return Boolean(modifier) && !other;
++}
++
++/**
++ * Cmd+F (Mac) / Ctrl+F (elsewhere) focuses torrent search.
++ * Other text fields and open dialogs/menus keep native Find-in-page.
++ * Repeat presses while search is focused stay in the search field.
++ */
++export function decideTorrentSearchFindAction(input: TorrentSearchFindInput): TorrentSearchFindAction {
++  return matchesLetterShortcut(input, "f") ? "focus-search" : "none";
++}
++
++/**
++ * Cmd+A (Mac) / Ctrl+A (elsewhere) opens Add torrent.
++ * Search and other text fields keep native Select All.
++ * Open dialogs/menus keep the shortcut; preventDefault when handled.
++ */
++export function decideAddTorrentShortcutAction(input: ModifierShortcutInput): AddTorrentShortcutAction {
++  return matchesLetterShortcut(input, "a", { skipSearch: true }) ? "open-add" : "none";
++}
++
  export function hasOpenDismissibleOverlay(root: ParentNode): boolean {
    return Boolean(root.querySelector(DISMISSIBLE_OVERLAY_SELECTOR));
  }
@@@ -52,7 -52,7 +137,7 @@@ export function isEditableField(target
  
  export function classifyEscapeTarget(
    target: EventTarget | null,
--  searchSelector = "[data-torrent-search]"
++  searchSelector = TORRENT_SEARCH_SELECTOR
  ): EscapeTargetKind {
    if (!(target instanceof Element)) return "other";
    if (target.closest(searchSelector)) return "search";
diff --cc src/lib/deluge/sidebar-filters.test.ts
index 66bb503,66bb503..11afe8a
--- a/src/lib/deluge/sidebar-filters.test.ts
+++ b/src/lib/deluge/sidebar-filters.test.ts
@@@ -451,6 -451,6 +451,13 @@@ function paintStateRows(tree: unknown, 
    assert.match(src, /id="trackers"/);
    assert.match(src, /id="labels"/);
    assert.match(src, /useState\(emptyCollapsedGroups\)/, "default all expanded");
++  assert.match(src, /aria-busy=\{loading \|\| undefined\}/);
++  assert.match(src, /loading=\{loading\}/);
++  assert.match(
++    src,
++    /\{loading \? \(\s*<p className="px-2 py-1 text-sm text-muted-foreground">Loading…<\/p>/,
++    "groups show muted Loading… instead of a zero catalog"
++  );
    assert.doesNotMatch(src, /count=\{torrentCount\}/, "group headers do not take a torrent total");
    assert.match(
      src,
@@@ -530,6 -530,6 +537,43 @@@
    assert.match(html, />42</, "row counts such as All remain");
  }
  
++{
++  const html = renderToString(
++    createElement(FilterSidebar, {
++      filters: null,
++      selected: { state: "All", tracker: "", label: "__all__" },
++      onSelect() {},
++      loading: true,
++    })
++  );
++  assert.equal(
++    [...html.matchAll(/Loading…/g)].length,
++    3,
++    "State, Trackers, and Labels each show Loading…"
++  );
++  assert.equal(html.includes('aria-busy="true"'), true);
++  assert.equal(html.includes(">All<"), false, "catalog rows stay hidden while loading");
++  assert.equal(/>0</.test(html), false, "zero counts must not look like an empty session");
++}
++
++{
++  const html = renderToString(
++    createElement(FilterSidebar, {
++      filters: {
++        state: [["All", 0]],
++        tracker_host: [["All", 0]],
++        label: [["All", 0]],
++      },
++      selected: { state: "All", tracker: "", label: "__all__" },
++      onSelect() {},
++      loading: false,
++    })
++  );
++  assert.equal(html.includes("Loading…"), false, "empty after load is not a loading state");
++  assert.match(html, />All</);
++  assert.match(html, />0</, "empty daemon still shows All 0");
++}
++
  {
    const html = renderToString(
      createElement(FilterSidebar, {
