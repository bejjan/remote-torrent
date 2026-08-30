"use client";

import { useState, type PointerEvent } from "react";
import { Activity } from "lucide-react";
import { formatBytes, formatRate } from "@/lib/deluge/format";
import {
  formatConnectionCount,
  sparklineCloserSeries,
  sparklineIsDrawable,
  sparklineLookbackLabel,
  sparklineMax,
  sparklineNearestIndex,
  sparklinePointerInPlot,
  sparklineNiceMax,
  sparklinePointX,
  sparklinePointY,
  sparklinePolyline,
  sparklinePolylineInPlot,
  sparklineSeriesVisible,
  sparklineYTicks,
  sessionMonitorRateParts,
  sessionTransferTotals,
  type SessionRateSample,
  type SparklinePlot,
} from "@/lib/deluge/session-monitor";
import type { SessionStats, TorrentStatus } from "@/lib/deluge/types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const CHIP_GRAPH = { width: 40, height: 16 };
const PANEL_GRAPH = { width: 304, height: 96 };
const PANEL_PLOT: SparklinePlot = { left: 1, top: 1, width: 302, height: 94 };
const LABEL_INSET = 6;

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
            aria-label="Activity monitor"
            title="Activity monitor"
            className={cn(
              "h-8 shrink-0 gap-1.5 px-1.5 text-xs text-muted-foreground",
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
            className="hidden xl:block"
          />
        ) : null}
        <Activity className={cn("size-3.5", drawable && "xl:hidden")} aria-hidden />
        <span className="tabular" title={connections == null ? "Connections" : `${connections} connections`}>
          {connections == null ? "—" : formatConnectionCount(connections)}
        </span>
        {rates.download || rates.upload ? (
          <span className="hidden items-center gap-1.5 xl:inline-flex">
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
          <PopoverTitle>Activity monitor</PopoverTitle>
        </PopoverHeader>
        {drawable ? (
          <RateChart samples={samples} className="w-full" />
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

const SERIES_META = {
  download: { label: "Download", color: "var(--downloading)" },
  upload: { label: "Upload", color: "var(--seeding)" },
} as const;

function RateChart({
  samples,
  className,
}: {
  samples: readonly SessionRateSample[];
  className?: string;
}) {
  const [hover, setHover] = useState<{
    index: number;
    series: keyof SessionRateSample;
  } | null>(null);
  const rawMax = sparklineMax(samples);
  const max = sparklineNiceMax(rawMax);
  const showDown = sparklineSeriesVisible(samples, "download");
  const showUp = sparklineSeriesVisible(samples, "upload");
  const down = showDown ? sparklinePolylineInPlot(samples.map((s) => s.download), PANEL_PLOT, max) : "";
  const up = showUp ? sparklinePolylineInPlot(samples.map((s) => s.upload), PANEL_PLOT, max) : "";
  if (!down && !up) return null;

  const ticks = sparklineYTicks(max);
  const plotRight = PANEL_PLOT.left + PANEL_PLOT.width;
  const plotBottom = PANEL_PLOT.top + PANEL_PLOT.height;
  const lookback = sparklineLookbackLabel(samples.length);
  const hoverSample = hover ? samples[hover.index] : undefined;
  const hoverMeta = hover ? SERIES_META[hover.series] : null;
  const hoverX = hover ? sparklinePointX(hover.index, samples.length, PANEL_PLOT) : 0;
  const hoverY =
    hover && hoverSample ? sparklinePointY(hoverSample[hover.series], max, PANEL_PLOT) : 0;
  const tooltipBelow = hoverY < PANEL_PLOT.top + 28;

  function pointerToViewBox(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * PANEL_GRAPH.width;
    const y = ((event.clientY - rect.top) / rect.height) * PANEL_GRAPH.height;
    return { x, y };
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const { x, y } = pointerToViewBox(event);
    const index = sparklineNearestIndex(x, samples.length, PANEL_PLOT);
    const sample = samples[index];
    if (!sample) {
      setHover(null);
      return;
    }
    if (!sparklinePointerInPlot(x, y, PANEL_PLOT)) {
      setHover(null);
      return;
    }
    const series = sparklineCloserSeries(
      sample,
      y,
      max,
      PANEL_PLOT,
      { download: showDown, upload: showUp },
      Number.POSITIVE_INFINITY
    );
    setHover(series ? { index, series } : null);
  }

  return (
    <div className={cn("relative", className)}>
      <svg
        width={PANEL_GRAPH.width}
        height={PANEL_GRAPH.height}
        viewBox={`0 0 ${PANEL_GRAPH.width} ${PANEL_GRAPH.height}`}
        className="w-full cursor-crosshair overflow-visible touch-none"
        role="img"
        aria-label="Download and upload rates over the recent samples"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((tick) => {
          const y = sparklinePointY(tick, max, PANEL_PLOT);
          const labelY = tick === max ? y + 11 : y;
          return (
            <g key={tick}>
              <line
                x1={PANEL_PLOT.left}
                x2={plotRight}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="1"
              />
              {tick > 0 ? (
                <text
                  x={PANEL_PLOT.left + LABEL_INSET}
                  y={labelY}
                  textAnchor="start"
                  dominantBaseline="middle"
                  className="fill-foreground/70 tabular"
                  fontSize="10"
                  paintOrder="stroke"
                  stroke="var(--popover)"
                  strokeWidth="3"
                >
                  {formatRate(tick)}
                </text>
              ) : null}
            </g>
          );
        })}
        <rect
          x={PANEL_PLOT.left}
          y={PANEL_PLOT.top}
          width={PANEL_PLOT.width}
          height={PANEL_PLOT.height}
          fill="transparent"
        />
        <line
          x1={PANEL_PLOT.left}
          x2={PANEL_PLOT.left}
          y1={PANEL_PLOT.top}
          y2={plotBottom}
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        <line
          x1={PANEL_PLOT.left}
          x2={plotRight}
          y1={plotBottom}
          y2={plotBottom}
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
        <text
          x={PANEL_PLOT.left + LABEL_INSET}
          y={plotBottom - 4}
          textAnchor="start"
          className="fill-foreground/70 tabular"
          fontSize="10"
          paintOrder="stroke"
          stroke="var(--popover)"
          strokeWidth="3"
        >
          {lookback}
        </text>
        <text
          x={plotRight - LABEL_INSET}
          y={plotBottom - 4}
          textAnchor="end"
          className="fill-foreground/70 tabular"
          fontSize="10"
          paintOrder="stroke"
          stroke="var(--popover)"
          strokeWidth="3"
        >
          now
        </text>
        {down ? (
          <polyline
            fill="none"
            stroke={SERIES_META.download.color}
            strokeWidth={hover?.series === "download" ? 2 : 1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={down}
            opacity={hover && hover.series !== "download" ? 0.45 : 1}
          />
        ) : null}
        {up ? (
          <polyline
            fill="none"
            stroke={SERIES_META.upload.color}
            strokeWidth={hover?.series === "upload" ? 2 : 1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={up}
            opacity={hover && hover.series !== "upload" ? 0.45 : 1}
          />
        ) : null}
        {hover && hoverSample && hoverMeta ? (
          <>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PANEL_PLOT.top}
              y2={plotBottom}
              stroke="currentColor"
              strokeOpacity="0.28"
              strokeWidth="1"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r="3"
              fill={hoverMeta.color}
              stroke="var(--popover)"
              strokeWidth="1.25"
            />
          </>
        ) : null}
      </svg>
      {hover && hoverSample && hoverMeta ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-sm"
          style={{
            left: `${Math.min(88, Math.max(18, (hoverX / PANEL_GRAPH.width) * 100))}%`,
            top: `${(hoverY / PANEL_GRAPH.height) * 100}%`,
            transform: tooltipBelow
              ? "translate(-50%, 10px)"
              : "translate(-50%, calc(-100% - 8px))",
          }}
        >
          <span className="font-medium">{hoverMeta.label}</span>
          {" · "}
          <span className="tabular">{formatRate(hoverSample[hover.series])}</span>
        </div>
      ) : null}
    </div>
  );
}
