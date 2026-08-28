"use client";

import { useEffect, useState } from "react";
import { Brand } from "@/components/app/brand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rpc } from "@/lib/deluge/client";
import {
  ABOUT_APP_NAME,
  ABOUT_DAEMON_UNAVAILABLE,
  ABOUT_LICENSE,
  ABOUT_LICENSE_URL,
  ABOUT_PROJECT_LABEL,
  ABOUT_PROJECT_URL,
  ABOUT_TAGLINE,
  UI_VERSION,
  loadAboutInfo,
  type AboutInfo,
} from "@/lib/deluge/about";

function VersionRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | null;
  loading?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums text-foreground">
        {loading ? "…" : value ?? "Unavailable"}
      </dd>
    </div>
  );
}

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [info, setInfo] = useState<AboutInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void loadAboutInfo(rpc)
      .then((next) => {
        if (!cancelled) setInfo(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <Brand className="justify-center" markClassName="size-10" />
          <DialogTitle className="sr-only">About {ABOUT_APP_NAME}</DialogTitle>
          <DialogDescription>{ABOUT_TAGLINE}</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-1.5 text-sm">
          <VersionRow label={ABOUT_APP_NAME} value={info?.uiVersion ?? UI_VERSION} />
          <VersionRow label="Deluge" value={info?.daemonVersion ?? null} loading={loading} />
          <VersionRow label="libtorrent" value={info?.libtorrentVersion ?? null} loading={loading} />
        </dl>
        {!loading && info && !info.connected ? (
          <p className="text-center text-xs text-muted-foreground">{ABOUT_DAEMON_UNAVAILABLE}</p>
        ) : null}
        <p className="text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground">
          <a href={ABOUT_LICENSE_URL} target="_blank" rel="noreferrer">
            {ABOUT_LICENSE}
          </a>
          {" · "}
          <a href={ABOUT_PROJECT_URL} target="_blank" rel="noreferrer">
            {ABOUT_PROJECT_LABEL}
          </a>
        </p>
        <DialogFooter showCloseButton className="m-0" />
      </DialogContent>
    </Dialog>
  );
}
