"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Neutral gray drag handle for sidebar / table column edges.
 * Left-button drag only — right-click still reaches header context menus.
 */
export function DragResizeHandle({
  ariaLabel,
  onDelta,
  onDragEnd,
  variant = "column",
  className,
}: {
  ariaLabel: string;
  onDelta: (deltaX: number) => void;
  onDragEnd?: () => void;
  variant?: "column" | "sidebar";
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const dragging = useRef(false);

  const startDrag = useCallback(
    (startX: number, target: HTMLElement, pointerId?: number) => {
      if (dragging.current) return;
      dragging.current = true;
      setActive(true);
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      let lastX = startX;

      const move = (clientX: number) => {
        const dx = clientX - lastX;
        lastX = clientX;
        if (dx) onDelta(dx);
      };
      const onPointerMove = (ev: PointerEvent) => move(ev.clientX);
      const onMouseMove = (ev: MouseEvent) => move(ev.clientX);
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
    [onDelta, onDragEnd]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      data-active={active ? "" : undefined}
      data-variant={variant}
      className={cn(
        "col-resize-handle touch-none",
        variant === "column"
          ? "absolute inset-y-0 right-0 z-20 w-2 translate-x-1/2 cursor-col-resize"
          : "relative z-20 w-2 shrink-0 cursor-col-resize self-stretch",
        className
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        startDrag(event.clientX, event.currentTarget, event.pointerId);
      }}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        startDrag(event.clientX, event.currentTarget);
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
