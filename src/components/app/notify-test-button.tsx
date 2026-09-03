"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { testDownloadFinishedNotificationFromGesture } from "@/lib/notify-complete";
import { cn } from "@/lib/utils";

export function NotifyTestButton({
  className,
  size = "xs",
  variant = "ghost",
}: {
  className?: string;
  size?: "xs" | "sm" | "default";
  variant?: "ghost" | "outline" | "secondary";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("shrink-0", className)}
      onClick={() => {
        void testDownloadFinishedNotificationFromGesture().then((result) => {
          if (result.ok) return;
          if (result.reason === "error") toast.error(result.message);
          else toast.message(result.message);
        });
      }}
    >
      Test notification
    </Button>
  );
}
