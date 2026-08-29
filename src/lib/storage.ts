/** Browser prefs used to live under `deluge-nova:*`. Read that prefix so existing values survive. */
export const STORAGE_PREFIX = "nova";
export const LEGACY_STORAGE_PREFIX = "deluge-nova";

export function storageKey(suffix: string): string {
  return `${STORAGE_PREFIX}:${suffix}`;
}

export function legacyStorageKey(suffix: string): string {
  return `${LEGACY_STORAGE_PREFIX}:${suffix}`;
}

function suffixOf(key: string): string | null {
  const nova = `${STORAGE_PREFIX}:`;
  const legacy = `${LEGACY_STORAGE_PREFIX}:`;
  if (key.startsWith(nova)) return key.slice(nova.length);
  if (key.startsWith(legacy)) return key.slice(legacy.length);
  return null;
}

/** Read `nova:suffix`, falling back to `deluge-nova:suffix` and copying forward. */
export function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fresh = localStorage.getItem(key);
    if (fresh != null) return fresh;
    const suffix = suffixOf(key);
    if (!suffix) return null;
    const legacy = localStorage.getItem(legacyStorageKey(suffix));
    if (legacy == null) return null;
    try {
      localStorage.setItem(storageKey(suffix), legacy);
    } catch {
      /* quota / private mode */
    }
    return legacy;
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

export function removeLocalStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
    const suffix = suffixOf(key);
    if (suffix) localStorage.removeItem(legacyStorageKey(suffix));
  } catch {
    /* quota / private mode */
  }
}
