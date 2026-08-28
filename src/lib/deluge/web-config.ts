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
