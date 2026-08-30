import { formatCompactRate } from "./format";

export const SESSION_FAVICON_SIZE = 64;
export const SESSION_FAVICON_LOGO_SRC = "/logo.png";
export const STATIC_FAVICON_HREF = "/icon.png";
export const SESSION_FAVICON_MIN_INTERVAL_MS = 250;
export const SESSION_FAVICON_MARK = "data-session-speed-favicon";
export const SESSION_FAVICON_FONT =
  "700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
export const SESSION_FAVICON_PILL = "rgba(0,0,0,0.78)";
export const SESSION_FAVICON_TEXT = "#ffffff";

export function sessionFaviconOverlayLines(
  downloadRate: number,
  uploadRate: number
): string[] {
  const lines: string[] = [];
  const down = formatCompactRate(downloadRate);
  const up = formatCompactRate(uploadRate);
  if (down) lines.push(`↓ ${down}`);
  if (up) lines.push(`↑ ${up}`);
  return lines;
}

/** Stable key so we skip `link[rel=icon]` writes when compact text did not change. */
export function sessionFaviconDrawKey(downloadRate: number, uploadRate: number): string {
  return sessionFaviconOverlayLines(downloadRate, uploadRate).join("\n");
}

export function shouldRedrawSessionFavicon({
  prevKey,
  nextKey,
  lastDrawAt,
  now,
  minIntervalMs = SESSION_FAVICON_MIN_INTERVAL_MS,
}: {
  prevKey: string;
  nextKey: string;
  lastDrawAt: number;
  now: number;
  minIntervalMs?: number;
}): boolean {
  if (nextKey === prevKey) return false;
  if (lastDrawAt > 0 && now - lastDrawAt < minIntervalMs) return false;
  return true;
}

export type SessionFaviconContext = {
  clearRect(x: number, y: number, w: number, h: number): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
  measureText(text: string): { width: number };
  fillText(text: string, x: number, y: number): void;
  beginPath(): void;
  fill(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  roundRect?(x: number, y: number, w: number, h: number, radii?: number): void;
  font: string;
  fillStyle: string;
  textAlign: string;
  textBaseline: string;
};

export type SessionFaviconCanvas = {
  width: number;
  height: number;
  getContext(type: "2d"): SessionFaviconContext | null;
};

export function drawSessionFavicon(
  canvas: SessionFaviconCanvas,
  logo: unknown,
  lines: readonly string[]
): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(logo, 0, 0, size, size);
  if (!lines.length) return true;

  ctx.font = SESSION_FAVICON_FONT;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  const padX = 3;
  const padY = 2;
  const lineH = 11;
  let textW = 0;
  for (const line of lines) {
    textW = Math.max(textW, ctx.measureText(line).width);
  }
  const boxW = Math.ceil(textW + padX * 2);
  const boxH = Math.ceil(lines.length * lineH + padY * 2);
  const boxX = Math.max(1, size - boxW - 2);
  const boxY = Math.max(1, size - boxH - 2);

  ctx.fillStyle = SESSION_FAVICON_PILL;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 3);
    ctx.fill();
  } else {
    ctx.fillRect(boxX, boxY, boxW, boxH);
  }

  ctx.fillStyle = SESSION_FAVICON_TEXT;
  lines.forEach((line, i) => {
    ctx.fillText(line, boxX + boxW - padX, boxY + padY + i * lineH);
  });
  return true;
}

export type SessionFaviconLink = {
  rel: string;
  type: string;
  href: string;
  sizes?: string;
  getAttribute?(name: string): string | null;
  setAttribute?(name: string, value: string): void;
};

export type SessionFaviconDocument = {
  querySelectorAll(selectors: string): ArrayLike<SessionFaviconLink>;
  createElement(tag: string): SessionFaviconLink;
  head: { appendChild(node: SessionFaviconLink): unknown };
};

function iconLinks(doc: SessionFaviconDocument): SessionFaviconLink[] {
  return Array.from(doc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]'));
}

export function applySessionFaviconHref(doc: SessionFaviconDocument, href: string): boolean {
  const existing = iconLinks(doc);
  let marked = existing.find((link) => link.getAttribute?.(SESSION_FAVICON_MARK) === "1");
  let changed = false;

  if (!marked) {
    marked = doc.createElement("link");
    marked.rel = "icon";
    marked.setAttribute?.(SESSION_FAVICON_MARK, "1");
    doc.head.appendChild(marked);
    changed = true;
  }

  if (marked.href !== href) {
    marked.type = "image/png";
    marked.sizes = "32x32";
    marked.href = href;
    changed = true;
  }

  for (const link of existing) {
    if (link === marked) continue;
    if (link.href === href) continue;
    link.type = "image/png";
    link.href = href;
    changed = true;
  }
  return changed;
}

export function restoreStaticFavicon(doc: SessionFaviconDocument): boolean {
  return applySessionFaviconHref(doc, STATIC_FAVICON_HREF);
}
