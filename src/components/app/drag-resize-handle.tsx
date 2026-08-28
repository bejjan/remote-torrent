"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Neutral gray drag handle for sidebar / table column edges.
 * Left-button pointer drag only — right-click still reaches header context menus.
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

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      setActive(true);
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      let lastX = event.clientX;

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - lastX;
        lastX = ev.clientX;
        if (dx) onDelta(dx);
      };
      const stop = () => {
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", stop);
        target.removeEventListener("pointercancel", stop);
        if (target.hasPointerCapture(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
        }
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        setActive(false);
        onDragEnd?.();
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", stop);
      target.addEventListener("pointercancel", stop);
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
      onPointerDown={onPointerDown}
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
