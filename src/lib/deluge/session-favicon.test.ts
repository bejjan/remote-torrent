import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SESSION_FAVICON_FONT,
  SESSION_FAVICON_LOGO_SRC,
  SESSION_FAVICON_MARK,
  SESSION_FAVICON_MIN_INTERVAL_MS,
  SESSION_FAVICON_PILL,
  SESSION_FAVICON_SIZE,
  SESSION_FAVICON_TEXT,
  STATIC_FAVICON_HREF,
  applySessionFaviconHref,
  drawSessionFavicon,
  restoreStaticFavicon,
  sessionFaviconDrawKey,
  sessionFaviconOverlayLines,
  shouldRedrawSessionFavicon,
  type SessionFaviconContext,
  type SessionFaviconDocument,
  type SessionFaviconLink,
} from "./session-favicon";

assert.deepEqual(sessionFaviconOverlayLines(0, 0), []);
assert.deepEqual(sessionFaviconOverlayLines(-1, Number.NaN), []);
assert.deepEqual(sessionFaviconOverlayLines(1.2 * 1024 ** 2, 0), ["↓ 1.2M"]);
assert.deepEqual(sessionFaviconOverlayLines(0, 340 * 1024), ["↑ 340K"]);
assert.deepEqual(sessionFaviconOverlayLines(1.2 * 1024 ** 2, 340 * 1024), [
  "↓ 1.2M",
  "↑ 340K",
]);
assert.equal(sessionFaviconDrawKey(0, 0), "");
assert.equal(sessionFaviconDrawKey(1024, 0), "↓ 1K");

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
    nextKey: "↓ 1K",
    lastDrawAt: 0,
    now: 10,
  }),
  true
);
assert.equal(
  shouldRedrawSessionFavicon({
    prevKey: "↓ 1K",
    nextKey: "↓ 1K",
    lastDrawAt: 1,
    now: 5000,
  }),
  false
);
assert.equal(
  shouldRedrawSessionFavicon({
    prevKey: "↓ 1K",
    nextKey: "↓ 2K",
    lastDrawAt: 100,
    now: 200,
    minIntervalMs: SESSION_FAVICON_MIN_INTERVAL_MS,
  }),
  false,
  "throttle faster than ~4 fps"
);
assert.equal(
  shouldRedrawSessionFavicon({
    prevKey: "↓ 1K",
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
    font: "",
    fillStyle: "",
    textAlign: "",
    textBaseline: "",
    clearRect: (...args: unknown[]) => {
      calls.push(["clearRect", ...args]);
    },
    drawImage: (...args: unknown[]) => {
      calls.push(["drawImage", args[0], args[1], args[2], args[3], args[4]]);
    },
    fillText: (...args: unknown[]) => {
      calls.push(["fillText", ...args]);
    },
    fill: () => {
      calls.push(["fill"]);
    },
    beginPath: () => {
      calls.push(["beginPath"]);
    },
    fillRect: (...args: unknown[]) => {
      calls.push(["fillRect", ...args]);
    },
    roundRect: (...args: unknown[]) => {
      calls.push(["roundRect", ...args]);
    },
    measureText: (text: string) => ({ width: text.length * 6 }),
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
  assert.equal(drawSessionFavicon(canvas, logo, []), true);
  assert.deepEqual(ctx.calls[0], ["clearRect", 0, 0, 64, 64]);
  assert.deepEqual(ctx.calls[1], ["drawImage", logo, 0, 0, 64, 64]);
  assert.equal(
    ctx.calls.some((call) => call[0] === "fillText"),
    false,
    "zero rates draw the S logo only"
  );
}

{
  const ctx = mockContext();
  const canvas = {
    width: SESSION_FAVICON_SIZE,
    height: SESSION_FAVICON_SIZE,
    getContext: () => ctx,
  };
  const lines = sessionFaviconOverlayLines(1.2 * 1024 ** 2, 340 * 1024);
  assert.equal(drawSessionFavicon(canvas, {}, lines), true);
  assert.equal(ctx.font, SESSION_FAVICON_FONT);
  assert.equal(ctx.textAlign, "right");
  assert.ok(ctx.calls.some((call) => call[0] === "roundRect"));
  const texts = ctx.calls.filter((call) => call[0] === "fillText").map((call) => call[1]);
  assert.deepEqual(texts, ["↓ 1.2M", "↑ 340K"]);
  assert.equal(ctx.fillStyle, SESSION_FAVICON_TEXT);
  assert.ok(SESSION_FAVICON_PILL.startsWith("rgba(0,0,0,"));
}

{
  assert.equal(
    drawSessionFavicon(
      { width: 64, height: 64, getContext: () => null },
      {},
      ["↓ 1K"]
    ),
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
      appendChild(node) {
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
  join(here, "../../components/app/session-speed-favicon.tsx"),
  "utf8"
);
const login = readFileSync(join(here, "../../components/app/login-screen.tsx"), "utf8");
assert.match(component, /canvas\.toDataURL\("image\/png"\)/);
assert.match(component, /SESSION_FAVICON_LOGO_SRC/);
assert.match(component, /restoreStaticFavicon\(document\)/);
assert.match(component, /shouldRedrawSessionFavicon/);
assert.equal(SESSION_FAVICON_LOGO_SRC, "/logo.png");
assert.equal(STATIC_FAVICON_HREF, "/icon.png");
assert.doesNotMatch(login, /SessionSpeedFavicon/);

console.log("session-favicon tests passed");
