"use client";

import Image from "next/image";
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
      <Image
        src="/logo.png"
        alt=""
        width={64}
        height={64}
        className={cn("size-8 shrink-0 object-contain", markClassName)}
        priority
      />
      <span
        className={cn(
          "min-w-0 truncate font-heading text-base font-semibold tracking-tight",
          wordmarkClassName
        )}
      >
        <span className="text-primary">Nova</span>
      </span>
    </div>
  );
}
