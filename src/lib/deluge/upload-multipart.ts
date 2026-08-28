import { randomBytes } from "crypto";

/** Pull the torrent File out of multipart form data (official field name is `file`). */
export function findUploadedFile(form: FormData): File | null {
  const named = form.get("file");
  if (named instanceof File) return named;
  for (const value of form.values()) {
    if (value instanceof File) return value;
  }
  return null;
}

/**
 * Rebuild a Deluge-compatible multipart body.
 *
 * Next.js `request.formData()` File objects often fail to re-serialize through
 * undici `fetch`, so Twisted `request.args[b'file']` is empty and `/upload`
 * returns `{ success: false, files: [] }` ("Failed to upload torrent").
 */
export async function encodeTorrentUpload(
  file: Blob,
  filename: string
): Promise<{ body: Buffer; contentType: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  return encodeTorrentUploadBytes(bytes, filename);
}

export function encodeTorrentUploadBytes(
  bytes: Buffer,
  filename: string
): { body: Buffer; contentType: string } {
  const safeName = (filename || "upload.torrent").replace(/[\r\n"]/g, "_");
  const boundary = `----DelugeNova${randomBytes(16).toString("hex")}`;
  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
      `Content-Type: application/x-bittorrent\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: Buffer.concat([header, bytes, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
