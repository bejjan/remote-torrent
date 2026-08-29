import { readLocalStorage, removeLocalStorage, storageKey, writeLocalStorage } from "@/lib/storage";

export const CLIENT_KINDS = ["deluge", "transmission"] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];

export const CLIENT_KIND_STORAGE_KEY = storageKey("client-kind");
export const TRANSMISSION_USERNAME_STORAGE_KEY = storageKey("transmission-username");
export const TRANSMISSION_PASSWORD_SESSION_KEY = storageKey("transmission-password");

export function isClientKind(value: unknown): value is ClientKind {
  return value === "deluge" || value === "transmission";
}

export function parseClientKind(raw: string | null | undefined): ClientKind {
  return raw === "transmission" ? "transmission" : "deluge";
}

export function getStoredClientKind(): ClientKind {
  return parseClientKind(readLocalStorage(CLIENT_KIND_STORAGE_KEY));
}

export function setStoredClientKind(kind: ClientKind) {
  writeLocalStorage(CLIENT_KIND_STORAGE_KEY, kind);
}

export function getStoredTransmissionUsername(): string {
  return readLocalStorage(TRANSMISSION_USERNAME_STORAGE_KEY) ?? "";
}

export function setStoredTransmissionUsername(username: string) {
  const trimmed = username.trim();
  if (!trimmed) {
    removeLocalStorage(TRANSMISSION_USERNAME_STORAGE_KEY);
    return;
  }
  writeLocalStorage(TRANSMISSION_USERNAME_STORAGE_KEY, trimmed);
}

export function getSessionTransmissionPassword(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(TRANSMISSION_PASSWORD_SESSION_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setSessionTransmissionPassword(password: string) {
  if (typeof window === "undefined") return;
  try {
    if (!password) sessionStorage.removeItem(TRANSMISSION_PASSWORD_SESSION_KEY);
    else sessionStorage.setItem(TRANSMISSION_PASSWORD_SESSION_KEY, password);
  } catch {
    /* quota / private mode */
  }
}

export function clientCapabilities(kind: ClientKind) {
  const deluge = kind === "deluge";
  return {
    kind,
    connectionManager: deluge,
    plugins: deluge,
    delugePreferences: deluge,
    labelPluginHint: deluge,
    sequentialDownload: deluge,
    prioritizeFirstLast: deluge,
    superSeeding: deluge,
    dhtNodes: deluge,
    libtorrentVersion: deluge,
    hostsPhase: deluge,
  };
}

export function clientDisplayName(kind: ClientKind): string {
  return kind === "transmission" ? "Transmission" : "Deluge";
}
