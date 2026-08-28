"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  markClassName,
  onClick,
}: {
  className?: string;
  markClassName?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
          markClassName
        )}
      >
        <Download className="size-4" />
      </span>
      <span className="font-heading text-base font-semibold tracking-tight">
        Deluge <span className="text-primary">Nova</span>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="About Deluge Nova"
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 text-left select-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          className
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={cn("flex items-center gap-2", className)}>{content}</div>;
}
