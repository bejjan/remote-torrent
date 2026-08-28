"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
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
    </div>
  );
}
