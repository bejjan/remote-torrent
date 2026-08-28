import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { FilterSidebar } from "../../components/app/filter-sidebar";
import {
  clampSidebarSelection,
  completeStateFilters,
  isVisibleFilterRow,
  mergeKnownFilterNames,
  sidebarGroupRows,
  splitSpecialAll,
  stateAllCount,
  stateSidebarRows,
  visibleFilterTuples,
  type SidebarFilterRow,
} from "./sidebar-filters";
import type { FilterTuple } from "./types";

const states: FilterTuple[] = [
  ["All", 1091],
  ["Downloading", 10],
  ["Seeding", 1000],
  ["Paused", 81],
  ["Checking", 0],
];

const trackersWithAll: FilterTuple[] = [
  ["All", 1091],
  ["tracker.example", 800],
  ["cdn.example", 543],
];

function allLabels(rows: SidebarFilterRow[]) {
  return rows.filter((row) => row.label === "All");
}

// --- splitSpecialAll ---
{
  const { special, rest } = splitSpecialAll(trackersWithAll);
  assert.deepEqual(special, ["All", 1091]);
  assert.equal(rest.length, 2);
  assert.ok(!rest.some(([name]) => name === "All"));
}

{
  const { special, rest } = splitSpecialAll([
    ["All", 1091],
    ["tracker.example", 800],
    ["All", 3],
  ]);
  assert.deepEqual(special, ["All", 1091]);
  assert.deepEqual(rest, [
    ["tracker.example", 800],
    ["All", 3],
  ]);
}

{
  const { special, rest } = splitSpecialAll([["opentrackr.org", 12]]);
  assert.equal(special, null);
  assert.deepEqual(rest, [["opentrackr.org", 12]]);
}

// --- Trackers: All from update_ui, never a summed duplicate ---
{
  const rows = sidebarGroupRows(trackersWithAll, {
    showZero: false,
    fallbackAllCount: 1091,
    allValue: "",
    emptyLabel: "(empty)",
    namedAllLabel: "All (tracker)",
  });
  const alls = allLabels(rows);
  assert.equal(alls.length, 1, "at most one All under Trackers");
  assert.equal(alls[0].count, 1091, "All is torrent count, not sum of tracker rows");
  assert.equal(alls[0].isAll, true);
  assert.equal(alls[0].value, "");
  assert.equal(
    rows.reduce((n, row) => n + row.count, 0),
    1091 + 800 + 543,
    "hosts still listed with their own counts"
  );
}

{
  const summed = trackersWithAll.reduce((n, [, c]) => n + c, 0);
  const rows = sidebarGroupRows(trackersWithAll, {
    showZero: false,
    fallbackAllCount: 1091,
    allValue: "",
    emptyLabel: "(empty)",
    namedAllLabel: "All (tracker)",
  });
  assert.notEqual(rows[0].count, summed);
  assert.equal(rows[0].count, 1091);
}

// --- Trackers: synthesize All only when the list omits it ---
{
  const hostsOnly: FilterTuple[] = [
    ["tracker.example", 800],
    ["cdn.example", 543],
  ];
  const rows = sidebarGroupRows(hostsOnly, {
    showZero: false,
    fallbackAllCount: 1091,
    allValue: "",
    emptyLabel: "(empty)",
    namedAllLabel: "All (tracker)",
  });
  assert.equal(allLabels(rows).length, 1);
  assert.equal(rows[0].count, 1091, "synthesized All uses State All, not host sum");
  assert.notEqual(rows[0].count, 800 + 543);
}

// --- Real tracker named All is disambiguated ---
{
  const rows = sidebarGroupRows(
    [
      ["All", 1091],
      ["All", 4],
      ["other.example", 10],
    ],
    {
      showZero: false,
      fallbackAllCount: 1091,
      allValue: "",
      emptyLabel: "(empty)",
      namedAllLabel: "All (tracker)",
    }
  );
  assert.equal(rows.filter((row) => row.isAll).length, 1);
  const hostAll = rows.find((row) => row.label === "All (tracker)");
  assert.ok(hostAll);
  assert.equal(hostAll!.value, "All");
  assert.equal(hostAll!.count, 4);
  assert.equal(hostAll!.isAll, false);
}

// --- Zero-count hosts hide; All remains ---
{
  const rows = sidebarGroupRows(
    [
      ["All", 0],
      ["dead.example", 0],
      ["live.example", 2],
    ],
    {
      showZero: false,
      fallbackAllCount: 0,
      allValue: "",
      emptyLabel: "(empty)",
      namedAllLabel: "All (tracker)",
    }
  );
  assert.equal(rows[0].label, "All");
  assert.equal(rows[0].count, 0);
  assert.deepEqual(
    rows.map((row) => row.label),
    ["All", "live.example"]
  );
}

{
  const rows = sidebarGroupRows(
    [
      ["All", 0],
      ["dead.example", 0],
    ],
    {
      showZero: true,
      fallbackAllCount: 0,
      allValue: "",
      emptyLabel: "(empty)",
      namedAllLabel: "All (tracker)",
    }
  );
  assert.deepEqual(
    rows.map((row) => row.label),
    ["All", "dead.example"]
  );
}

// --- Labels: same All rules ---
{
  const labels: FilterTuple[] = [
    ["All", 1091],
    ["", 40],
    ["linux", 200],
    ["movies", 0],
  ];
  const rows = sidebarGroupRows(labels, {
    showZero: false,
    fallbackAllCount: 1091,
    allValue: "__all__",
    emptyLabel: "(no label)",
    namedAllLabel: "All (label)",
    emptyValue: "__none__",
  });
  assert.equal(allLabels(rows).length, 1);
  assert.equal(rows[0].value, "__all__");
  assert.equal(rows[0].count, 1091);
  assert.ok(rows.some((row) => row.value === "__none__" && row.label === "(no label)"));
  assert.ok(!rows.some((row) => row.label === "movies"));
}

{
  const rows = sidebarGroupRows(
    [
      ["", 40],
      ["linux", 200],
    ],
    {
      showZero: false,
      fallbackAllCount: 1091,
      allValue: "__all__",
      emptyLabel: "(no label)",
      namedAllLabel: "All (label)",
      emptyValue: "__none__",
    }
  );
  assert.equal(allLabels(rows).length, 1);
  assert.equal(rows[0].count, 1091);
}

// --- clamp: "All" from update_ui is not a tracker selection ---
{
  const next = clampSidebarSelection(
    { state: "Downloading", tracker: "All", label: "All" },
    states,
    trackersWithAll,
    [
      ["All", 1091],
      ["linux", 200],
    ],
    false
  );
  assert.equal(next.tracker, "");
  assert.equal(next.label, "__all__");
  assert.equal(next.state, "Downloading");
}

{
  const next = clampSidebarSelection(
    { state: "Downloading", tracker: "All", label: "linux" },
    states,
    [
      ["All", 1091],
      ["All", 4],
    ],
    [
      ["All", 1091],
      ["linux", 200],
    ],
    false
  );
  assert.equal(next.tracker, "All");
  assert.equal(next.label, "linux");
}

{
  const next = clampSidebarSelection(
    { state: "Checking", tracker: "gone.example", label: "gone" },
    states,
    trackersWithAll,
    [["linux", 200]],
    false
  );
  assert.equal(next.state, "All");
  assert.equal(next.tracker, "");
  assert.equal(next.label, "__all__");
}

assert.equal(stateAllCount(states), 1091);
assert.deepEqual(
  visibleFilterTuples(states, false, (name) => name === "All").map(([name]) => name),
  ["All", "Downloading", "Seeding", "Paused"]
);

// --- Live Deluge injects every state at 0; hide those rows ---
const liveStates: FilterTuple[] = [
  ["Active", 2],
  ["All", 42],
  ["Allocating", 0],
  ["Checking", 0],
  ["Downloading", 5],
  ["Error", 0],
  ["Moving", 0],
  ["Paused", 0],
  ["Queued", 1],
  ["Seeding", 34],
];

{
  const completed = completeStateFilters(liveStates);
  assert.equal(completed.find(([name]) => name === "Paused")?.[1], 0);
  assert.equal(completed.find(([name]) => name === "Checking")?.[1], 0);
  assert.ok(completed.some(([name]) => name === "Allocating"));
}

{
  const rows = stateSidebarRows(liveStates, false);
  assert.deepEqual(
    rows.map(([name]) => name),
    ["All", "Downloading", "Seeding", "Queued", "Active"]
  );
  assert.ok(!rows.some(([name, count]) => name !== "All" && count === 0));
  assert.ok(!rows.some(([name]) => name === "Paused"));
  assert.ok(!rows.some(([name]) => name === "Checking"));
  assert.ok(!rows.some(([name]) => name === "Error"));
  assert.equal(rows.find(([name]) => name === "All")?.[1], 42);
}

{
  const rows = stateSidebarRows(liveStates, true);
  assert.ok(rows.some(([name, count]) => name === "Paused" && count === 0));
  assert.ok(rows.some(([name, count]) => name === "Checking" && count === 0));
  assert.ok(rows.some(([name]) => name === "All"));
}

{
  const rows = stateSidebarRows(undefined, false);
  assert.deepEqual(
    rows.map(([name, count]) => [name, count]),
    [["All", 0]]
  );
}

{
  const dict = { All: 10, Downloading: 4, Paused: 0, Checking: 0, Seeding: 6, Error: 0 };
  const rows = stateSidebarRows(dict, false);
  assert.deepEqual(
    rows.map(([name]) => name),
    ["All", "Downloading", "Seeding"]
  );
}

{
  const next = clampSidebarSelection(
    { state: "Paused", tracker: "", label: "__all__" },
    liveStates,
    trackersWithAll,
    [["linux", 200]],
    false
  );
  assert.equal(next.state, "All");
}

{
  const merged = mergeKnownFilterNames(
    [
      ["All", 10],
      ["linux", 4],
    ],
    ["linux", "fresh"]
  );
  assert.ok(merged.some(([name, count]) => name === "fresh" && count === 0));
  assert.equal(merged.find(([name]) => name === "linux")?.[1], 4);
}

{
  const rows = sidebarGroupRows(
    [
      ["All", 10],
      ["linux", 4],
    ],
    {
      showZero: false,
      fallbackAllCount: 10,
      allValue: "__all__",
      emptyLabel: "(no label)",
      namedAllLabel: "All (label)",
      emptyValue: "__none__",
      knownNames: ["linux", "fresh"],
    }
  );
  assert.ok(rows.some((row) => row.value === "fresh" && row.count === 0));
}

{
  const next = clampSidebarSelection(
    { state: "All", tracker: "", label: "fresh" },
    states,
    trackersWithAll,
    [["linux", 200]],
    false,
    ["fresh"]
  );
  assert.equal(next.label, "fresh");
}

/** Same decision FilterButton makes after injecting the live catalog. */
function paintStateRows(tree: unknown, showZero: boolean): FilterTuple[] {
  return completeStateFilters(tree).filter(([name, count]) =>
    isVisibleFilterRow(name, count, showZero, name === "All")
  );
}

{
  const painted = paintStateRows(liveStates, false);
  assert.ok(!painted.some(([name]) => name === "Paused"), "Paused:0 must be hidden at render");
  assert.ok(!painted.some(([name]) => name === "Checking"));
  assert.ok(!painted.some(([name, count]) => name !== "All" && count === 0));
  assert.ok(painted.some(([name, count]) => name === "All" && count === 42));
  assert.deepEqual(
    painted.map(([name]) => name),
    ["All", "Downloading", "Seeding", "Queued", "Active"]
  );
}

{
  const painted = paintStateRows(liveStates, true);
  assert.ok(painted.some(([name, count]) => name === "Paused" && count === 0));
}

{
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "../../components/app/filter-sidebar.tsx"), "utf8");
  const formatSrc = readFileSync(join(here, "format.ts"), "utf8");
  assert.match(src, /completeStateFilters\(filters\?\.state\)/, "paint the injected catalog");
  assert.match(
    src,
    /function FilterButton\([\s\S]*isVisibleFilterRow/,
    "zeros must be dropped in FilterButton, not only in helpers"
  );
  assert.match(src, /row\.isAll \? allTrackersIcon\(\) : <TrackerFavicon host=\{row\.value\} \/>/);
  assert.match(src, /loading="lazy"/);
  assert.match(src, /onError=\{advanceSource\}/);
  assert.match(src, /trackerFaviconSources\(host\)/);
  assert.match(src, /function LetterAvatar/);
  assert.match(src, /rounded-full bg-muted/);
  assert.match(src, /<Globe className="size-3\.5 text-muted-foreground" \/>/);
  assert.match(
    src,
    /function allTrackersIcon\([\s\S]*<ListFilter className="size-3\.5 text-muted-foreground" \/>/
  );
  assert.match(src, /loadSidebarCollapsedGroups/);
  assert.match(src, /saveSidebarCollapsedGroups/);
  assert.match(src, /aria-expanded=\{!collapsed\}/);
  assert.match(src, /ChevronDown/);
  assert.match(src, /ChevronRight/);
  assert.match(src, /id="state"/);
  assert.match(src, /id="trackers"/);
  assert.match(src, /id="labels"/);
  assert.match(src, /useState\(\(\) => new Set<string>\(\)\)/, "default all expanded");
  assert.match(formatSrc, /icons\.duckduckgo\.com\/ip3/);
  assert.match(formatSrc, /s2\/favicons/);
  assert.match(formatSrc, /favicon\.yandex\.net\/favicon/);
}

{
  const html = renderToString(
    createElement(FilterSidebar, {
      filters: {
        state: liveStates,
        tracker_host: [
          ["All", 42],
          ["dead.example", 0],
          ["live.example", 12],
        ],
        label: [
          ["All", 42],
          ["linux", 4],
          ["movies", 0],
        ],
      },
      selected: { state: "All", tracker: "", label: "__all__" },
      onSelect() {},
      showZero: false,
    })
  );
  assert.equal(html.includes("Paused"), false, "live Paused:0 must not appear in the DOM");
  assert.equal(html.includes("Checking"), false);
  assert.equal(html.includes("Downloading"), true);
  assert.match(html, />All</);
  assert.equal(html.includes("movies"), false);
  assert.equal(html.includes("dead.example"), false);
  assert.match(
    html,
    /icons\.duckduckgo\.com\/ip3\/live\.example\.ico/,
    "visible tracker hosts start with the DuckDuckGo favicon"
  );
  assert.match(html, /rounded-full[^>]*>L</, "letter avatar sits behind the probing image");
  assert.equal(html.includes("loading=\"lazy\""), true);
  assert.equal(
    html.includes("ip3/All.ico") || html.includes("s2/favicons?domain=All"),
    false,
    "the Trackers All row must not fetch a favicon"
  );
  assert.match(html, /aria-expanded="true"/, "groups default to expanded");
  assert.equal(html.includes("aria-expanded=\"false\""), false, "no group starts collapsed");
  assert.match(html, />State</);
  assert.match(html, />Trackers</);
  assert.match(html, />Labels</);
  assert.match(html, /id="sidebar-group-state"/);
  assert.match(html, /id="sidebar-group-trackers"/);
  assert.match(html, /id="sidebar-group-labels"/);
  assert.match(html, /lucide-chevron-down/, "expanded headers show a down chevron");
}

{
  const html = renderToString(
    createElement(FilterSidebar, {
      filters: {
        state: [["All", 3], ["Downloading", 3]],
        tracker_host: [
          ["All", 3],
          ["", 1],
          ["All", 2],
        ],
        label: [["All", 3]],
      },
      selected: { state: "All", tracker: "", label: "__all__" },
      onSelect() {},
      showZero: false,
    })
  );
  assert.equal(html.includes("s2/favicons"), false, "empty and invalid hosts must not fetch favicons");
  assert.equal(html.includes("icons.duckduckgo.com"), false);
  assert.match(html, /lucide-globe/, "empty tracker hosts fall back to Globe");
}

console.log("sidebar-filters tests passed");
