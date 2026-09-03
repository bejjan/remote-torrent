import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { FilterSidebar } from "../../components/app/filter-sidebar";
import {
  FILTER_DOWNLOADING,
  SIDEBAR_TRACKER_ROW_CAP,
  capNamedSidebarRows,
  clampSidebarSelection,
  completeStateFilters,
  isVisibleFilterRow,
  mergeKnownFilterNames,
  selectSidebarState,
  sidebarGroupRows,
  splitSpecialAll,
  sidebarFilterTreeFromTorrents,
  sidebarSessionCatalog,
  stateAllCount,
  stateSidebarRows,
  torrentMatchesSidebarFilter,
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
  assert.equal(next.state, "Checking", "keep a catalog state even at count 0");
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
  assert.equal(next.state, "Paused", "keep a catalog state even at count 0");
}

{
  const emptyDownloading: FilterTuple[] = [
    ["All", 3],
    ["Seeding", 3],
    ["Downloading", 0],
  ];
  const next = clampSidebarSelection(
    selectSidebarState({ state: "All", tracker: "", label: "__all__" }, FILTER_DOWNLOADING),
    emptyDownloading,
    trackersWithAll,
    [["linux", 200]],
    false
  );
  assert.equal(next.state, FILTER_DOWNLOADING);
}

{
  const next = clampSidebarSelection(
    { state: "GoneState", tracker: "", label: "__all__" },
    liveStates,
    trackersWithAll,
    [["linux", 200]],
    false
  );
  assert.equal(next.state, "All");
}

{
  const selected = { state: "All", tracker: "cdn.example", label: "linux" };
  assert.deepEqual(selectSidebarState(selected, FILTER_DOWNLOADING), {
    state: FILTER_DOWNLOADING,
    tracker: "cdn.example",
    label: "linux",
  });
  assert.deepEqual(selected, { state: "All", tracker: "cdn.example", label: "linux" });
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
  assert.match(src, /SIDEBAR_TRACKER_ROW_CAP/);
  assert.match(src, /completeStateFilters\(filters\?\.state\)/, "paint the injected catalog");
  assert.match(src, /onSelect\(selectSidebarState\(selected, name\)\)/);
  assert.match(
    src,
    /alwaysShow=\{name === FILTER_ALL \|\| selected\.state === name \|\| keepStates\.has\(name\)\}/
  );
  assert.match(src, /sessionTrackers/);
  assert.match(src, /alwaysShow=\{row\.isAll \|\| Boolean\(row\.keepZero\)\}/);
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
  assert.match(src, /bg-sidebar-foreground\/6 font-medium text-sidebar-foreground/);
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
  assert.match(src, /useState\(emptyCollapsedGroups\)/, "default all expanded");
  assert.match(src, /aria-busy=\{loading \|\| undefined\}/);
  assert.match(src, /loading=\{loading\}/);
  assert.match(src, /function FilterGroupSkeleton/);
  assert.match(src, /Loading filters/);
  assert.match(
    src,
    /\{loading \? <FilterGroupSkeleton rows=\{skeletonRows\} \/> : children\}/,
    "groups show a pulse skeleton instead of a zero catalog"
  );
  assert.doesNotMatch(src, /Loading…/, "sidebar loading is a skeleton, not Loading… copy");
  assert.doesNotMatch(src, /count=\{torrentCount\}/, "group headers do not take a torrent total");
  assert.match(
    src,
    /function FilterGroup\([\s\S]*?<span className="min-w-0 flex-1 truncate">\{title\}<\/span>\s*<\/button>/,
    "fold headers are title + chevron only"
  );
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
  const headerInners = [
    ...html.matchAll(
      /aria-controls="sidebar-group-(?:state|trackers|labels)"[^>]*>([\s\S]*?)<\/button>/g
    ),
  ].map((match) => match[1]);
  assert.equal(headerInners.length, 3, "State, Trackers, and Labels are fold buttons");
  assert.deepEqual(
    headerInners.map((inner) => inner.match(/>(State|Trackers|Labels)</)?.[1]),
    ["State", "Trackers", "Labels"]
  );
  for (const inner of headerInners) {
    assert.equal(
      />\d+</.test(inner),
      false,
      "group headers must not show a total torrent count"
    );
  }
  assert.match(html, />42</, "row counts such as All remain");
}

{
  const html = renderToString(
    createElement(FilterSidebar, {
      filters: {
        state: [
          ["All", 1],
          ["Error", 1],
          ["Seeding", 0],
          ["Paused", 0],
        ],
        tracker_host: [
          ["All", 1],
          ["live.example", 1],
          ["quiet.example", 0],
        ],
        label: [
          ["All", 1],
          ["linux", 1],
          ["movies", 0],
        ],
      },
      selected: { state: "Error", tracker: "", label: "__all__" },
      onSelect() {},
      showZero: false,
      sessionStates: ["Error", "Seeding"],
      sessionTrackers: ["live.example", "quiet.example"],
      sessionLabels: ["linux", "movies"],
    })
  );
  assert.equal(html.includes("quiet.example"), true, "session trackers stay at count 0");
  assert.equal(html.includes("movies"), true, "session labels stay at count 0");
  assert.equal(html.includes("Seeding"), true, "session states stay at count 0");
  assert.equal(html.includes("Paused"), false, "states absent from the session stay hidden");
}

{
  const html = renderToString(
    createElement(FilterSidebar, {
      filters: null,
      selected: { state: "All", tracker: "", label: "__all__" },
      onSelect() {},
      loading: true,
    })
  );
  assert.equal(html.includes("Loading…"), false, "sidebar loading is not Loading… copy");
  assert.match(html, /Loading filters/);
  assert.match(html, /animate-pulse/);
  assert.equal(html.includes('aria-busy="true"'), true);
  assert.equal(html.includes(">All<"), false, "catalog rows stay hidden while loading");
  assert.equal(/>0</.test(html), false, "zero counts must not look like an empty session");
}

{
  const html = renderToString(
    createElement(FilterSidebar, {
      filters: {
        state: [["All", 0]],
        tracker_host: [["All", 0]],
        label: [["All", 0]],
      },
      selected: { state: "All", tracker: "", label: "__all__" },
      onSelect() {},
      loading: false,
    })
  );
  assert.equal(html.includes("Loading…"), false, "empty after load is not a loading state");
  assert.match(html, />All</);
  assert.match(html, />0</, "empty daemon still shows All 0");
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

{
  const many: FilterTuple[] = [
    ["All", 2000],
    ...Array.from({ length: 200 }, (_, i) => [`tracker-${i}.example`, 200 - (i % 50)] as FilterTuple),
  ];
  const rows = sidebarGroupRows(many, {
    showZero: false,
    fallbackAllCount: 2000,
    allValue: "",
    emptyLabel: "(empty)",
    namedAllLabel: "All (tracker)",
    maxNamedRows: SIDEBAR_TRACKER_ROW_CAP,
    keepValue: "tracker-199.example",
  });
  assert.ok(rows.length <= SIDEBAR_TRACKER_ROW_CAP + 1);
  assert.ok(rows.some((row) => row.value === "tracker-199.example"));
  assert.equal(rows[0].isAll, true);
  const capped = capNamedSidebarRows(
    [
      { value: "", label: "All", count: 10, isAll: true },
      ...Array.from({ length: 5 }, (_, i) => ({
        value: `t${i}`,
        label: `t${i}`,
        count: i,
        isAll: false,
      })),
    ],
    2,
    "t0"
  );
  assert.equal(capped.filter((row) => !row.isAll).length, 2);
  assert.ok(capped.some((row) => row.value === "t0"));
}

{
  const checking = {
    state: "Checking",
    tracker_host: "bttracker.debian.org",
    label: "linux",
    download_payload_rate: 0,
    upload_payload_rate: 0,
  } as const;
  const seeding = {
    state: "Seeding",
    tracker_host: "archive.ubuntu.com",
    label: "linux",
    download_payload_rate: 0,
    upload_payload_rate: 1024,
  } as const;
  const all = { state: "All", tracker: "", label: "__all__" };
  assert.equal(torrentMatchesSidebarFilter(checking as never, all), true);
  assert.equal(
    torrentMatchesSidebarFilter(checking as never, { ...all, state: "Checking" }),
    true
  );
  assert.equal(
    torrentMatchesSidebarFilter(seeding as never, { ...all, state: "Checking" }),
    false
  );

  const tree = sidebarFilterTreeFromTorrents(
    [checking, seeding] as never,
    { state: "Checking", tracker: "", label: "__all__" }
  );
  assert.deepEqual(
    Object.fromEntries(tree.tracker_host),
    { All: 1, "bttracker.debian.org": 1, "archive.ubuntu.com": 0 }
  );
  assert.equal(tree.state.find(([name]) => name === "Checking")?.[1], 1);
  assert.equal(tree.state.find(([name]) => name === "Seeding")?.[1], 1);
  assert.equal(tree.state.find(([name]) => name === "All")?.[1], 2);
  assert.equal(tree.state.some(([name]) => name === "Paused"), false, "session-empty states stay out of the tree");

  const catalog = sidebarSessionCatalog([checking, seeding] as never);
  assert.deepEqual(new Set(catalog.trackers), new Set(["bttracker.debian.org", "archive.ubuntu.com"]));
  assert.ok(catalog.states.includes("Checking"));
  assert.ok(catalog.states.includes("Seeding"));
  assert.equal(catalog.states.includes("Paused"), false);

  const byTracker = sidebarFilterTreeFromTorrents(
    [checking, seeding] as never,
    { state: "All", tracker: "bttracker.debian.org", label: "__all__" }
  );
  assert.equal(byTracker.state.find(([name]) => name === "Checking")?.[1], 1);
  assert.equal(byTracker.state.find(([name]) => name === "Seeding")?.[1], 0);
  assert.equal(byTracker.state.find(([name]) => name === "All")?.[1], 1);
  assert.deepEqual(Object.fromEntries(byTracker.tracker_host), {
    All: 2,
    "bttracker.debian.org": 1,
    "archive.ubuntu.com": 1,
  });
}

{
  const errored = {
    state: "Error",
    tracker_host: "bttracker.debian.org",
    label: "linux",
    download_payload_rate: 0,
    upload_payload_rate: 0,
  } as const;
  const seeding = {
    state: "Seeding",
    tracker_host: "archive.ubuntu.com",
    label: "",
    download_payload_rate: 0,
    upload_payload_rate: 1024,
  } as const;
  const tree = sidebarFilterTreeFromTorrents(
    [errored, seeding] as never,
    { state: "Error", tracker: "", label: "__all__" }
  );
  assert.deepEqual(Object.fromEntries(tree.tracker_host), {
    All: 1,
    "bttracker.debian.org": 1,
    "archive.ubuntu.com": 0,
  });
  assert.deepEqual(Object.fromEntries(tree.label), {
    All: 1,
    linux: 1,
    "": 0,
  });
}

{
  const rows = sidebarGroupRows(
    [
      ["All", 1],
      ["bttracker.debian.org", 1],
      ["archive.ubuntu.com", 0],
      ["", 0],
    ],
    {
      showZero: false,
      fallbackAllCount: 1,
      allValue: "",
      emptyLabel: "(empty)",
      namedAllLabel: "All (tracker)",
      knownNames: ["archive.ubuntu.com", ""],
    }
  );
  assert.ok(rows.some((row) => row.value === "archive.ubuntu.com" && row.count === 0));
  assert.ok(rows.some((row) => row.label === "(empty)" && row.count === 0 && row.keepZero));
}

{
  const next = clampSidebarSelection(
    { state: "Error", tracker: "archive.ubuntu.com", label: "linux" },
    [
      ["All", 1],
      ["Error", 1],
    ],
    [
      ["All", 1],
      ["bttracker.debian.org", 1],
      ["archive.ubuntu.com", 0],
    ],
    [
      ["All", 1],
      ["linux", 0],
    ],
    false
  );
  assert.equal(next.tracker, "archive.ubuntu.com", "keep a session tracker at count 0");
  assert.equal(next.label, "linux", "keep a session label at count 0");
}

console.log("sidebar-filters tests passed");
