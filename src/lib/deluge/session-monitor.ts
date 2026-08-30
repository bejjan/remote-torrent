import { formatRate } from "./format";
import type { SessionRates } from "./web-config";

export const SESSION_MONITOR_SAMPLE_CAP = 60;

export type SessionRateSample = SessionRates;

function finiteAmount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function pushRateSample(
  samples: readonly SessionRateSample[],
  next: SessionRateSample,
  cap = SESSION_MONITOR_SAMPLE_CAP
): SessionRateSample[] {
  const limit = Number.isFinite(cap) && cap > 0 ? Math.trunc(cap) : SESSION_MONITOR_SAMPLE_CAP;
  if (samples.length < limit) return [...samples, next];
  return [...samples.slice(samples.length - limit + 1), next];
}

/** Drop the buffer when the daemon disconnects so a new session starts empty. */
export function nextRateSamples(
  samples: readonly SessionRateSample[],
  rates: SessionRateSample,
  connected: boolean,
  cap = SESSION_MONITOR_SAMPLE_CAP
): SessionRateSample[] {
  if (!connected) return samples.length ? [] : (samples as SessionRateSample[]);
  return pushRateSample(samples, rates, cap);
}

export function sparklineMax(samples: readonly SessionRateSample[]): number {
  let max = 0;
  for (const sample of samples) {
    if (sample.download > max) max = sample.download;
    if (sample.upload > max) max = sample.upload;
  }
  return max;
}

/** A lone flat zero line is not useful — wait for a non-zero sample and two points. */
export function sparklineIsDrawable(samples: readonly SessionRateSample[]): boolean {
  return samples.length >= 2 && sparklineMax(samples) > 0;
}

export function sparklineSeriesVisible(
  samples: readonly SessionRateSample[],
  key: keyof SessionRateSample
): boolean {
  return samples.some((sample) => sample[key] > 0);
}

export function sparklinePolyline(
  values: readonly number[],
  width: number,
  height: number,
  max: number,
  pad = 1
): string {
  if (values.length < 2 || !(max > 0) || width <= 0 || height <= 0) return "";
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  return values
    .map((value, index) => {
      const x = pad + (index / (values.length - 1)) * innerW;
      const y = pad + innerH - (Math.max(0, value) / max) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export type SparklinePlot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Ceiling used for the panel Y-axis so tick labels stay on 1–2–5 steps. */
export function sparklineNiceMax(max: number): number {
  if (!(max > 0) || !Number.isFinite(max)) return 0;
  let unit = 1;
  while (unit * 1024 <= max && unit < 1024 ** 5) unit *= 1024;
  const n = max / unit;
  const exp = Math.floor(Math.log10(n));
  const pow = 10 ** Math.max(0, exp);
  const m = n / pow;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  const result = nice * pow * unit;
  if (result / unit >= 1000 && unit < 1024 ** 5) return unit * 1024;
  return result;
}

export function sparklineYTicks(max: number): number[] {
  if (!(max > 0) || !Number.isFinite(max)) return [0];
  return [0, max / 2, max];
}

export function sparklinePointX(index: number, count: number, plot: SparklinePlot): number {
  if (count <= 1) return plot.left;
  return plot.left + (index / (count - 1)) * plot.width;
}

export function sparklinePointY(value: number, max: number, plot: SparklinePlot): number {
  const t = max > 0 ? Math.max(0, value) / max : 0;
  return plot.top + plot.height - t * plot.height;
}

export function sparklinePolylineInPlot(
  values: readonly number[],
  plot: SparklinePlot,
  max: number
): string {
  if (values.length < 2 || !(max > 0)) return "";
  return values
    .map((value, index) => {
      const x = sparklinePointX(index, values.length, plot);
      const y = sparklinePointY(value, max, plot);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function sparklineNearestIndex(x: number, count: number, plot: SparklinePlot): number {
  if (count <= 1) return 0;
  const t = (x - plot.left) / Math.max(1, plot.width);
  return Math.min(count - 1, Math.max(0, Math.round(t * (count - 1))));
}

export function sparklineLookbackLabel(sampleCount: number): string {
  const seconds = Math.max(0, sampleCount - 1);
  if (seconds >= 45) {
    const minutes = seconds / 60;
    const rounded = minutes >= 10 ? Math.round(minutes) : Math.round(minutes * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `−${text}m`;
  }
  return `−${seconds}s`;
}

export function sparklinePointerInPlot(x: number, y: number, plot: SparklinePlot): boolean {
  return (
    x >= plot.left &&
    x <= plot.left + plot.width &&
    y >= plot.top &&
    y <= plot.top + plot.height
  );
}

export function sparklineCloserSeries(
  sample: SessionRateSample,
  pointerY: number,
  max: number,
  plot: SparklinePlot,
  visible: { download: boolean; upload: boolean },
  threshold = 16
): keyof SessionRateSample | null {
  const candidates: { key: keyof SessionRateSample; distance: number }[] = [];
  if (visible.download) {
    candidates.push({
      key: "download",
      distance: Math.abs(sparklinePointY(sample.download, max, plot) - pointerY),
    });
  }
  if (visible.upload) {
    candidates.push({
      key: "upload",
      distance: Math.abs(sparklinePointY(sample.upload, max, plot) - pointerY),
    });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  const closest = candidates[0];
  return closest && closest.distance <= threshold ? closest.key : null;
}

/**
 * Compact toolbar rates using the status-bar formatter.
 * Zero / invalid rates are omitted — same hide rule as the live favicon overlay.
 */
export function sessionMonitorRateParts(
  downloadRate: number,
  uploadRate: number
): { download: string | null; upload: string | null } {
  return {
    download:
      Number.isFinite(downloadRate) && downloadRate > 0 ? `↓ ${formatRate(downloadRate)}` : null,
    upload: Number.isFinite(uploadRate) && uploadRate > 0 ? `↑ ${formatRate(uploadRate)}` : null,
  };
}

export function isSessionMonitorChipVisible(connected: boolean | null | undefined): boolean {
  return Boolean(connected);
}

/** Compact connection count for the toolbar chip (`222K`); the popover keeps the full number. */
export function formatConnectionCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  const n = Math.trunc(value);
  if (n < 10000) return String(n);
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
}

export function sessionTransferTotals(
  stats: { payload_download?: unknown; payload_upload?: unknown } | null | undefined,
  torrents: Record<string, { total_done?: unknown; total_uploaded?: unknown }> | null | undefined
): { downloaded: number; uploaded: number } | null {
  const fromStatsDown = finiteAmount(stats?.payload_download);
  const fromStatsUp = finiteAmount(stats?.payload_upload);
  if (fromStatsDown != null && fromStatsUp != null) {
    return { downloaded: fromStatsDown, uploaded: fromStatsUp };
  }
  if (!torrents) return null;
  let downloaded = 0;
  let uploaded = 0;
  for (const torrent of Object.values(torrents)) {
    downloaded += finiteAmount(torrent.total_done) ?? 0;
    uploaded += finiteAmount(torrent.total_uploaded) ?? 0;
  }
  return { downloaded, uploaded };
}
