import { NextRequest, NextResponse } from "next/server";
import { parseAdminDemoHeader } from "@/lib/demo/admin-catalog";
import { findUploadedFile } from "@/lib/deluge/upload-multipart";
import { handleTransmissionDemoUpload } from "@/lib/transmission/demo";
import { resolveTransmissionTarget, transmissionUploadError } from "@/lib/transmission/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const resolved = resolveTransmissionTarget(req);
  if (resolved.error) return transmissionUploadError(resolved.error, 400);
  const form = await req.formData();
  const file = findUploadedFile(form);
  if (!file) {
    return transmissionUploadError(
      "Failed to upload torrent: no file in the multipart body (expected field name \"file\").",
      400
    );
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return NextResponse.json(
    handleTransmissionDemoUpload(
      file.name || "upload.torrent",
      file.size,
      bytes.toString("base64"),
      parseAdminDemoHeader(req.headers.get("x-nova-admin-demo"))
    )
  );
}
