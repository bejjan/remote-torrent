/** Tooltip copy for Error-state torrents. Prefers Deluge `message`. */
export function errorStatusTooltip(message?: string | null): string {
  const text = typeof message === "string" ? message.trim() : "";
  return text || "No error details";
}
