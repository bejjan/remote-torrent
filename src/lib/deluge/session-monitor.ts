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
