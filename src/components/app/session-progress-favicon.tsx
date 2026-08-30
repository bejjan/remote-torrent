"use client";

import { useEffect, useRef } from "react";
import {
  SESSION_FAVICON_LOGO_SRC,
  SESSION_FAVICON_MIN_INTERVAL_MS,
  SESSION_FAVICON_SIZE,
  STATIC_FAVICON_HREF,
  applySessionFaviconHref,
  drawSessionFavicon,
  restoreStaticFavicon,
  sessionFaviconDrawKey,
  shouldRedrawSessionFavicon,
} from "@/lib/deluge/session-favicon";

export function SessionProgressFavicon({ progress }: { progress: number | null }) {
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const paintRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SESSION_FAVICON_SIZE;
    canvas.height = SESSION_FAVICON_SIZE;

    const logo = new Image();
    logo.decoding = "async";

    let lastKey = "";
    let lastDrawAt = 0;
    let timer = 0;
    let cancelled = false;
    let logoReady = false;

    const paint = () => {
      if (cancelled || !logoReady) return;
      const nextProgress = progressRef.current;
      const nextKey = sessionFaviconDrawKey(nextProgress);
      const now = performance.now();
      if (
        !shouldRedrawSessionFavicon({
          prevKey: lastKey,
          nextKey,
          lastDrawAt,
          now,
        })
      ) {
        if (nextKey !== lastKey && timer === 0) {
          const wait = Math.max(0, SESSION_FAVICON_MIN_INTERVAL_MS - (now - lastDrawAt));
          timer = window.setTimeout(() => {
            timer = 0;
            paint();
          }, wait);
        }
        return;
      }
      if (!nextKey) {
        applySessionFaviconHref(document, STATIC_FAVICON_HREF);
        lastKey = nextKey;
        lastDrawAt = now;
        return;
      }
      if (!drawSessionFavicon(canvas, logo, nextProgress)) return;
      try {
        applySessionFaviconHref(document, canvas.toDataURL("image/png"));
      } catch {
        return;
      }
      lastKey = nextKey;
      lastDrawAt = now;
    };

    paintRef.current = paint;

    const onLoad = () => {
      logoReady = true;
      paint();
    };
    logo.addEventListener("load", onLoad);
    logo.src = SESSION_FAVICON_LOGO_SRC;
    if (logo.complete && logo.naturalWidth > 0) onLoad();

    return () => {
      cancelled = true;
      paintRef.current = () => {};
      if (timer) window.clearTimeout(timer);
      logo.removeEventListener("load", onLoad);
      restoreStaticFavicon(document);
    };
  }, []);

  useEffect(() => {
    paintRef.current();
  }, [progress]);

  return null;
}
