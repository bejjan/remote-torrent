"use client";

import { Activity } from "lucide-react";
import { formatBytes, formatRate } from "@/lib/deluge/format";
import {
  formatConnectionCount,
  sparklineIsDrawable,
  sparklineMax,
  sparklinePolyline,
  sparklineSeriesVisible,
  sessionMonitorRateParts,
  sessionTransferTotals,
  type SessionRateSample,
} from "@/lib/deluge/session-monitor";
import type { SessionStats, TorrentStatus } from "@/lib/deluge/types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const CHIP_GRAPH = { width: 40, height: 16 };
const PANEL_GRAPH = { width: 304, height: 56 };

export function SessionMonitor({
  downloadRate,
  uploadRate,
  samples,
  stats,
  torrents,
  showDht,
  className,
}: {
  downloadRate: number;
  uploadRate: number;
  samples: readonly SessionRateSample[];
  stats: SessionStats | null;
  torrents: Record<string, TorrentStatus> | null | undefined;
  showDht: boolean;
  className?: string;
}) {
  const rates = sessionMonitorRateParts(downloadRate, uploadRate);
  const connections = stats ? stats.num_connections : null;
  const totals = sessionTransferTotals(stats, torrents);
  const drawable = sparklineIsDrawable(samples);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-session-monitor=""
            aria-label="Session statistics"
            title="Session statistics"
            className={cn(
              "h-8 gap-1.5 px-1.5 text-xs text-muted-foreground",
              "hover:text-foreground aria-expanded:text-foreground",
              className
            )}
          />
        }
      >
        {drawable ? (
          <RateSparkline
            samples={samples}
            width={CHIP_GRAPH.width}
            height={CHIP_GRAPH.height}
            className="hidden sm:block"
          />
        ) : null}
        <Activity className={cn("size-3.5", drawable && "sm:hidden")} aria-hidden />
        <span className="tabular" title={connections == null ? "Connections" : `${connections} connections`}>
          {connections == null ? "—" : formatConnectionCount(connections)}
        </span>
        {rates.download || rates.upload ? (
          <span className="hidden items-center gap-1.5 min-[26rem]:inline-flex">
            {rates.download ? (
              <span className="tabular text-[color:var(--downloading)]">{rates.download}</span>
            ) : null}
            {rates.upload ? (
              <span className="tabular text-[color:var(--seeding)]">{rates.upload}</span>
            ) : null}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>Session</PopoverTitle>
          <PopoverDescription>Live rates from the current poll.</PopoverDescription>
        </PopoverHeader>
        {drawable ? (
          <RateSparkline
            samples={samples}
            width={PANEL_GRAPH.width}
            height={PANEL_GRAPH.height}
            className="w-full"
          />
        ) : (
          <p className="text-xs text-muted-foreground">No transfer activity in the last minute.</p>
        )}
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-xs">
          <StatRow
            label="Download"
            value={formatRate(downloadRate)}
            valueClassName="text-[color:var(--downloading)]"
          />
          <StatRow
            label="Upload"
            value={formatRate(uploadRate)}
            valueClassName="text-[color:var(--seeding)]"
          />
          {totals ? (
            <>
              <Separator className="col-span-2 my-0.5" />
              <StatRow label="Downloaded" value={formatBytes(totals.downloaded)} />
              <StatRow label="Uploaded" value={formatBytes(totals.uploaded)} />
            </>
          ) : null}
          <Separator className="col-span-2 my-0.5" />
          <StatRow label="Connections" value={connections == null ? "—" : String(connections)} />
          {showDht ? <StatRow label="DHT nodes" value={String(stats?.dht_nodes ?? 0)} /> : null}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function StatRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular text-right text-foreground", valueClassName)}>{value}</dd>
    </>
  );
}

function RateSparkline({
  samples,
  width,
  height,
  className,
}: {
  samples: readonly SessionRateSample[];
  width: number;
  height: number;
  className?: string;
}) {
  const max = sparklineMax(samples);
  const showDown = sparklineSeriesVisible(samples, "download");
  const showUp = sparklineSeriesVisible(samples, "upload");
  const down = showDown
    ? sparklinePolyline(
        samples.map((sample) => sample.download),
        width,
        height,
        max
      )
    : "";
  const up = showUp
    ? sparklinePolyline(
        samples.map((sample) => sample.upload),
        width,
        height,
        max
      )
    : "";
  if (!down && !up) return null;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", className)}
      aria-hidden
    >
      {down ? (
        <polyline
          fill="none"
          stroke="var(--downloading)"
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={down}
        />
      ) : null}
      {up ? (
        <polyline
          fill="none"
          stroke="var(--seeding)"
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={up}
        />
      ) : null}
    </svg>
  );
}
