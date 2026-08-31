import type { ClientKind } from "@/lib/backend/client-kind";

/** Deluge web UI Options → D/L and U/L Speed Limit presets (KiB/s). */
export const TORRENT_SPEED_LIMIT_PRESETS_KIB = [5, 10, 30, 80, 300] as const;

/** Deluge web UI Options → Connection Limit presets. */
export const TORRENT_CONNECTION_LIMIT_PRESETS = [50, 100, 200, 300, 500] as const;

/** Deluge web UI Options → Upload Slot Limit presets. */
export const TORRENT_UPLOAD_SLOT_LIMIT_PRESETS = [0, 1, 2, 3, 5] as const;

export type TorrentLimitMenuCaps = {
  downloadSpeed: boolean;
  uploadSpeed: boolean;
  connections: boolean;
  uploadSlots: boolean;
  autoManaged: boolean;
};

/**
 * Per-torrent options that `core.set_torrent_options` actually applies
 * for the connected client. Speed limits and auto-managed work everywhere;
 * connection / upload-slot limits are Deluge (libtorrent) only.
 */
export function torrentLimitMenuCaps(kind: ClientKind): TorrentLimitMenuCaps {
  const deluge = kind === "deluge";
  return {
    downloadSpeed: true,
    uploadSpeed: true,
    connections: deluge,
    uploadSlots: deluge,
    autoManaged: true,
  };
}

export function torrentAutoManagedLabel(kind: ClientKind): string {
  if (kind === "transmission") return "Honor session limits";
  if (kind === "qbittorrent") return "Automatic Torrent Management";
  return "Auto Managed";
}

/** Radio value for a preset menu: `-1` unlimited, else a listed preset, else unset. */
export function torrentLimitRadioValue(
  current: number,
  presets: readonly number[]
): string {
  if (!Number.isFinite(current) || current < 0) return "-1";
  return presets.includes(current) ? String(current) : "";
}

export function torrentAutoManagedRadioValue(enabled: boolean): "on" | "off" {
  return enabled ? "on" : "off";
}
