import type { TorrentState } from "./types";

/** Paused torrents offer Resume; every other state offers Pause. */
export function torrentIsPaused(state: TorrentState | null | undefined): boolean {
  return state === "Paused";
}
