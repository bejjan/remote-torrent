import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SESSION_FAVICON_LOGO_SRC,
  SESSION_FAVICON_MARK,
  SESSION_FAVICON_MIN_INTERVAL_MS,
  SESSION_FAVICON_RING_PROGRESS,
  SESSION_FAVICON_RING_TRACK,
  SESSION_FAVICON_RING_WIDTH,
  SESSION_FAVICON_SIZE,
  STATIC_FAVICON_HREF,
  applySessionFaviconHref,
  drawSessionFavicon,
  restoreStaticFavicon,
  sessionFaviconDownloadProgress,
  sessionFaviconDrawKey,
  sessionFaviconRingRadius,
  shouldRedrawSessionFavicon,
  type SessionFaviconContext,
  type SessionFaviconDocument,
  type SessionFaviconLink,
} from "./session-favicon";

assert.equal(sessionFaviconDownloadProgress([]), null);
assert.equal(
  sessionFaviconDownloadProgress([{ state: "Seeding", progress: 100 }]),
  null,
  "seeding is not a current download"
);
assert.equal(
  sessionFaviconDownloadProgress([{ state: "Paused", progress: 40 }]),
  null,
  "paused incomplete torrents do not count"
);
assert.equal(
  sessionFaviconDownloadProgress([{ state: "Downloading", progress: 40 }]),
  40
);
assert.equal(
  sessionFaviconDownloadProgress([
    { state: "Downloading", progress: 20 },
    { state: "Downloading", progress: 80 },
    { state: "Seeding", progress: 100 },
  ]),
  50
);
assert.equal(
  sessionFaviconDownloadProgress([{ state: "Downloading", progress: Number.NaN }]),
  null
);

assert.equal(sessionFaviconDrawKey(null), "");
assert.equal(sessionFaviconDrawKey(Number.NaN), "");
assert.equal(sessionFaviconDrawKey(0), "0");
assert.equal(sessionFaviconDrawKey(40.4), "40");
assert.equal(sessionFaviconDrawKey(40.6), "41");
assert.equal(sessionFaviconDrawKey(100), "100");

assert.equal(
  shouldRedrawSessionFavicon({
    prevKey: "",
    nextKey: "",
    lastDrawAt: 0,
    now: 1000,
  }),
  false,
  "idle logo stays static"
);
assert.equal(
  shouldRedrawSessionFavicon({
    prevKey: "",
    nextKey: "40",
    lastDrawAt: 0,
    now: 10,
  }),
  true
);
assert.equal(
  shouldRedrawSessionFavicon({
    prevKey: "40",
    nextKey: "40",
    lastDrawAt: 1,
    now: 5000,
  }),
  false
);
assert.equal(
  shouldRedrawSessionFavicon({
    prevKey: "40",
    nextKey: "41",
    lastDrawAt: 100,
    now: 200,
    minIntervalMs: SESSION_FAVICON_MIN_INTERVAL_MS,
  }),
  false,
  "throttle faster than ~4 fps"
);
assert.equal(
  shouldRedrawSessionFavicon({
    prevKey: "40",
    nextKey: "",
    lastDrawAt: 100,
    now: 400,
  }),
  true
);

function mockContext(): SessionFaviconContext & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    clearRect: (...args: unknown[]) => {
      calls.push(["clearRect", ...args]);
    },
    drawImage: (...args: unknown[]) => {
      calls.push(["drawImage", args[0], args[1], args[2], args[3], args[4]]);
    },
    beginPath: () => {
      calls.push(["beginPath"]);
    },
    arc: (...args: unknown[]) => {
      calls.push(["arc", ...args]);
    },
    stroke: () => {
      calls.push(["stroke"]);
    },
  };
}

{
  const ctx = mockContext();
  const logo = { id: "logo" };
  const canvas = {
    width: SESSION_FAVICON_SIZE,
    height: SESSION_FAVICON_SIZE,
    getContext: () => ctx,
  };
  assert.equal(drawSessionFavicon(canvas, logo, null), true);
  assert.deepEqual(ctx.calls[0], ["clearRect", 0, 0, 64, 64]);
  assert.deepEqual(ctx.calls[1], ["drawImage", logo, 0, 0, 64, 64]);
  assert.equal(
    ctx.calls.some((call) => call[0] === "arc"),
    false,
    "no downloads draw the logo only"
  );
}

{
  const ctx = mockContext();
  const canvas = {
    width: SESSION_FAVICON_SIZE,
    height: SESSION_FAVICON_SIZE,
    getContext: () => ctx,
  };
  assert.equal(drawSessionFavicon(canvas, {}, 0), true);
  const arcs = ctx.calls.filter((call) => call[0] === "arc");
  assert.equal(arcs.length, 1, "0% download paints the empty track");
  assert.equal(ctx.strokeStyle, SESSION_FAVICON_RING_TRACK);
}

{
  const ctx = mockContext();
  const canvas = {
    width: SESSION_FAVICON_SIZE,
    height: SESSION_FAVICON_SIZE,
    getContext: () => ctx,
  };
  assert.equal(drawSessionFavicon(canvas, {}, 50), true);
  assert.equal(ctx.lineCap, "round");
  assert.equal(ctx.lineWidth, SESSION_FAVICON_RING_WIDTH);
  const arcs = ctx.calls.filter((call) => call[0] === "arc");
  assert.equal(arcs.length, 2);
  const radius = sessionFaviconRingRadius(SESSION_FAVICON_SIZE);
  assert.deepEqual(arcs[0], ["arc", 32, 32, radius, 0, Math.PI * 2]);
  assert.equal(arcs[1][1], 32);
  assert.equal(arcs[1][2], 32);
  assert.equal(arcs[1][3], radius);
  assert.equal(arcs[1][4], -Math.PI / 2);
  assert.equal(arcs[1][5], Math.PI / 2);
  assert.equal(ctx.strokeStyle, SESSION_FAVICON_RING_PROGRESS);
}

{
  const ctx = mockContext();
  const canvas = {
    width: SESSION_FAVICON_SIZE,
    height: SESSION_FAVICON_SIZE,
    getContext: () => ctx,
  };
  assert.equal(drawSessionFavicon(canvas, {}, 100), true);
  const arcs = ctx.calls.filter((call) => call[0] === "arc");
  assert.deepEqual(arcs[1], ["arc", 32, 32, sessionFaviconRingRadius(64), 0, Math.PI * 2]);
}

{
  assert.equal(
    drawSessionFavicon({ width: 64, height: 64, getContext: () => null }, {}, 40),
    false
  );
}

function fakeDocument(initial: SessionFaviconLink[] = []): SessionFaviconDocument & {
  links: SessionFaviconLink[];
} {
  const links = initial;
  return {
    links,
    querySelectorAll() {
      return links;
    },
    createElement() {
      const attrs = new Map<string, string>();
      const link: SessionFaviconLink = {
        rel: "",
        type: "",
        href: "",
        sizes: "",
        getAttribute: (name) => attrs.get(name) ?? null,
        setAttribute: (name, value) => {
          attrs.set(name, value);
        },
      };
      return link;
    },
    head: {
      appendChild(node: SessionFaviconLink) {
        links.push(node);
        return node;
      },
    },
  };
}

{
  const doc = fakeDocument();
  assert.equal(applySessionFaviconHref(doc, "data:image/png;base64,abc"), true);
  assert.equal(doc.links.length, 1);
  assert.equal(doc.links[0].rel, "icon");
  assert.equal(doc.links[0].type, "image/png");
  assert.equal(doc.links[0].href, "data:image/png;base64,abc");
  assert.equal(doc.links[0].getAttribute?.(SESSION_FAVICON_MARK), "1");
  assert.equal(applySessionFaviconHref(doc, "data:image/png;base64,abc"), false);
  assert.equal(restoreStaticFavicon(doc), true);
  assert.equal(doc.links[0].href, STATIC_FAVICON_HREF);
}

{
  const existing: SessionFaviconLink = {
    rel: "icon",
    type: "image/svg+xml",
    href: "/logo.svg",
  };
  const doc = fakeDocument([existing]);
  assert.equal(applySessionFaviconHref(doc, "data:image/png;base64,xyz"), true);
  assert.equal(existing.href, "data:image/png;base64,xyz");
  assert.equal(doc.links.some((link) => link.getAttribute?.(SESSION_FAVICON_MARK) === "1"), true);
}

const here = dirname(fileURLToPath(import.meta.url));
const component = readFileSync(
  join(here, "../../components/app/session-progress-favicon.tsx"),
  "utf8"
);
const login = readFileSync(join(here, "../../components/app/login-screen.tsx"), "utf8");
assert.match(component, /canvas\.toDataURL\("image\/png"\)/);
assert.match(component, /SESSION_FAVICON_LOGO_SRC/);
assert.match(component, /restoreStaticFavicon\(document\)/);
assert.match(component, /shouldRedrawSessionFavicon/);
assert.doesNotMatch(component, /downloadRate|uploadRate|formatCompactRate|fillText/);
assert.equal(SESSION_FAVICON_LOGO_SRC, "/logo.png");
assert.equal(STATIC_FAVICON_HREF, "/icon.png");
assert.doesNotMatch(login, /SessionProgressFavicon|SessionSpeedFavicon/);

console.log("session-favicon tests passed");
