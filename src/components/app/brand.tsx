"use client";

import { cn } from "@/lib/utils";

export function Brand({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <img
        src="/logo.svg"
        alt=""
        width={64}
        height={64}
        className={cn("size-8 shrink-0 object-contain", markClassName)}
      />
      <span
        className={cn(
          "min-w-0 truncate font-heading text-base font-semibold tracking-tight",
          wordmarkClassName
        )}
      >
        torro
      </span>
    </div>
  );
}
