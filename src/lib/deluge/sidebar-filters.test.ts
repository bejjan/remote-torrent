import assert from "node:assert/strict";
import {
  clampSidebarSelection,
  sidebarGroupRows,
  splitSpecialAll,
  stateAllCount,
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

console.log("sidebar-filters tests passed");
