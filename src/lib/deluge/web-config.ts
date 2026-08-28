import { ABOUT_APP_NAME } from "./about";
import { formatRate } from "./format";

/** Official Deluge web UI uses `show_sidebar`; older/demo configs may store `sidebar`. */
export function isWebSidebarVisible(web: Record<string, unknown> | null | undefined): boolean {
  const value = web?.show_sidebar ?? web?.sidebar;
  return value === undefined ? true : Boolean(value);
}

/**
 * Official Deluge web UI key `show_session_speed` (default on).
 * Nova uses it for both the window title and the status-bar rate widgets.
 */
export function isWebSessionSpeedVisible(web: Record<string, unknown> | null | undefined): boolean {
  const value = web?.show_session_speed;
  return value === undefined ? true : Boolean(value);
}

/** Window title when `show_session_speed` is off, or after the shell unmounts. */
export const DEFAULT_DOCUMENT_TITLE = ABOUT_APP_NAME;

export type SessionRates = {
  download: number;
  upload: number;
};

export const ZERO_SESSION_RATES: SessionRates = { download: 0, upload: 0 };

function finiteRate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * A poll frame is only "good" when both payload rates are present.
 * Missing `stats`, a disconnected update, or a partial object is not a real 0 B/s.
 */
export function sessionRatesFromStats(
  stats: { download_rate?: unknown; upload_rate?: unknown } | null | undefined
): SessionRates | null {
  if (!stats) return null;
  const download = finiteRate(stats.download_rate);
  const upload = finiteRate(stats.upload_rate);
  if (download == null || upload == null) return null;
  return { download, upload };
}

/** Keep the last good session rates when a poll omits `stats`. */
export function holdLastSessionRates(
  last: SessionRates | null | undefined,
  stats: { download_rate?: unknown; upload_rate?: unknown } | null | undefined
): SessionRates {
  const next = sessionRatesFromStats(stats);
  if (!next) return last ?? ZERO_SESSION_RATES;
  if (last && last.download === next.download && last.upload === next.upload) return last;
  return next;
}

/**
 * Official Deluge puts session rates in `document.title` when `show_session_speed`
 * is on, e.g. `↓1.2 MiB/s ↑200 KiB/s — Deluge Nova`.
 */
export function sessionSpeedDocumentTitle(
  downloadRate: number,
  uploadRate: number,
  enabled: boolean,
  appName = DEFAULT_DOCUMENT_TITLE
): string {
  if (!enabled) return appName;
  return `↓${formatRate(downloadRate)} ↑${formatRate(uploadRate)} — ${appName}`;
}

/** Avoid rewriting `document.title` when the computed string did not change. */
export function writeDocumentTitleIfChanged(
  target: { title: string },
  next: string
): boolean {
  if (target.title === next) return false;
  target.title = next;
  return true;
}
