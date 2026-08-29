import packageJson from "../../../package.json";

export const ABOUT_APP_NAME = "Nova";
export const ABOUT_TAGLINE = "modern Web UI for Deluge and Transmission";
export const ABOUT_LICENSE = "GPL-3.0";
export const ABOUT_LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.html";
export const ABOUT_PROJECT_LABEL = "Deluge project";
export const ABOUT_PROJECT_URL = "https://www.deluge-torrent.org/";
export const ABOUT_TRANSMISSION_LABEL = "Transmission project";
export const ABOUT_TRANSMISSION_URL = "https://transmissionbt.com/";
export const ABOUT_DAEMON_UNAVAILABLE =
  "Daemon version is unavailable while not connected.";

/** UI version from package.json. */
export const UI_VERSION: string = packageJson.version;

export const ABOUT_RPC = {
  connected: "web.connected",
  daemonVersion: "core.get_version",
  libtorrentVersion: "core.get_libtorrent_version",
} as const;

export type AboutRpc = <T = unknown>(method: string, params?: unknown[]) => Promise<T>;

export type AboutInfo = {
  uiVersion: string;
  connected: boolean;
  daemonVersion: string | null;
  libtorrentVersion: string | null;
};

function versionString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

async function tryVersion(call: AboutRpc, method: string): Promise<string | null> {
  try {
    return versionString(await call(method));
  } catch {
    return null;
  }
}

export async function loadAboutInfo(call: AboutRpc, uiVersion = UI_VERSION): Promise<AboutInfo> {
  let connected = false;
  try {
    connected = Boolean(await call<boolean>(ABOUT_RPC.connected));
  } catch {
    connected = false;
  }

  if (!connected) {
    return {
      uiVersion,
      connected: false,
      daemonVersion: null,
      libtorrentVersion: null,
    };
  }

  const [daemonVersion, libtorrentVersion] = await Promise.all([
    tryVersion(call, ABOUT_RPC.daemonVersion),
    tryVersion(call, ABOUT_RPC.libtorrentVersion),
  ]);

  return {
    uiVersion,
    connected: true,
    daemonVersion,
    libtorrentVersion,
  };
}
