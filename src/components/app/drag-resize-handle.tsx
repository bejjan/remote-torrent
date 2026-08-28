"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Neutral gray drag handle for sidebar / table column / details panel edges.
 * Left-button drag only — right-click still reaches header context menus.
 * `row` tracks vertical movement only; column/sidebar track horizontal only.
 */
export function DragResizeHandle({
  ariaLabel,
  onDelta,
  onDragEnd,
  variant = "column",
  className,
}: {
  ariaLabel: string;
  onDelta: (delta: number) => void;
  onDragEnd?: () => void;
  variant?: "column" | "sidebar" | "row";
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const dragging = useRef(false);
  const vertical = variant === "row";

  const startDrag = useCallback(
    (start: number, target: HTMLElement, pointerId?: number) => {
      if (dragging.current) return;
      dragging.current = true;
      setActive(true);
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = vertical ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
      let last = start;

      const move = (client: number) => {
        const delta = client - last;
        last = client;
        if (delta) onDelta(delta);
      };
      const onPointerMove = (ev: PointerEvent) => move(vertical ? ev.clientY : ev.clientX);
      const onMouseMove = (ev: MouseEvent) => move(vertical ? ev.clientY : ev.clientX);
      const stop = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", stop);
        if (pointerId != null && target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        dragging.current = false;
        setActive(false);
        onDragEnd?.();
      };

      if (pointerId != null) {
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", stop);
        window.addEventListener("pointercancel", stop);
        try {
          target.setPointerCapture(pointerId);
        } catch {
          /* synthetic pointers may reject capture */
        }
      } else {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", stop);
      }
    },
    [onDelta, onDragEnd, vertical]
  );

  return (
    <div
      role="separator"
      aria-orientation={vertical ? "horizontal" : "vertical"}
      aria-label={ariaLabel}
      data-active={active ? "" : undefined}
      data-variant={variant}
      className={cn(
        "touch-none absolute z-20",
        vertical
          ? "row-resize-handle inset-x-0 top-0 h-2 -translate-y-1/2 cursor-row-resize"
          : "col-resize-handle inset-y-0 right-0 w-2 translate-x-1/2 cursor-col-resize",
        className
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        startDrag(vertical ? event.clientY : event.clientX, event.currentTarget, event.pointerId);
      }}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        startDrag(vertical ? event.clientY : event.clientX, event.currentTarget);
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    />
  );
}
