import { NextRequest, NextResponse } from "next/server";
import { parseAdminDemoHeader } from "@/lib/demo/admin-catalog";
import { clientKindFromRequest } from "@/lib/backend/request";
import { handleDemoUpload } from "@/lib/deluge/demo";
import { proxyDeluge, resolveDelugeTarget, uploadError } from "@/lib/deluge/proxy";
import { encodeTorrentUpload, findUploadedFile } from "@/lib/deluge/upload-multipart";
import { handleQbittorrentDemoUpload } from "@/lib/qbittorrent/demo";
import { qbittorrentUploadError, resolveQbittorrentTarget } from "@/lib/qbittorrent/proxy";
import { handleTransmissionDemoUpload } from "@/lib/transmission/demo";
import { resolveTransmissionTarget, transmissionUploadError } from "@/lib/transmission/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (clientKindFromRequest(req) === "transmission") return handleTransmissionUpload(req);
  if (clientKindFromRequest(req) === "qbittorrent") return handleQbittorrentUpload(req);

  const resolved = resolveDelugeTarget(req);
  if (resolved.error) return uploadError(resolved.error, 400);

  const form = await req.formData();
  const file = findUploadedFile(form);
  const name = file?.name || "upload.torrent";
  const size = file instanceof File ? file.size : 0;

  if (resolved.demo) {
    return NextResponse.json(
      handleDemoUpload(name, size, parseAdminDemoHeader(req.headers.get("x-nova-admin-demo")))
    );
  }
  if (!file) {
    return uploadError(
      "Failed to upload torrent: no file in the multipart body (expected field name \"file\").",
      400
    );
  }
  const encoded = await encodeTorrentUpload(file, name);
  return proxyDeluge(req, resolved.target, "/upload", {
    method: "POST",
    headers: {
      "Content-Type": encoded.contentType,
      Accept: "application/json, text/html;q=0.9, */*;q=0.8",
    },
    body: encoded.body,
  });
}

async function handleTransmissionUpload(req: NextRequest) {
  const resolved = resolveTransmissionTarget(req);
  if (resolved.error) return transmissionUploadError(resolved.error, 400);
  const form = await req.formData();
  const file = findUploadedFile(form);
  const name = file?.name || "upload.torrent";
  const size = file instanceof File ? file.size : 0;
  if (!file) {
    return transmissionUploadError(
      "Failed to upload torrent: no file in the multipart body (expected field name \"file\").",
      400
    );
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return NextResponse.json(
    handleTransmissionDemoUpload(
      name,
      size,
      bytes.toString("base64"),
      parseAdminDemoHeader(req.headers.get("x-nova-admin-demo"))
    )
  );
}

async function handleQbittorrentUpload(req: NextRequest) {
  const resolved = resolveQbittorrentTarget(req);
  if (resolved.error) return qbittorrentUploadError(resolved.error, 400);
  const form = await req.formData();
  const file = findUploadedFile(form);
  const name = file?.name || "upload.torrent";
  const size = file instanceof File ? file.size : 0;
  if (!file) {
    return qbittorrentUploadError(
      "Failed to upload torrent: no file in the multipart body (expected field name \"file\").",
      400
    );
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return NextResponse.json(
    handleQbittorrentDemoUpload(
      name,
      size,
      bytes.toString("base64"),
      parseAdminDemoHeader(req.headers.get("x-nova-admin-demo"))
    )
  );
}
