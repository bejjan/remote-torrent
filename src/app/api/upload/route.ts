import { NextRequest, NextResponse } from "next/server";
import { handleDemoUpload } from "@/lib/deluge/demo";
import { proxyDeluge, resolveDelugeTarget, uploadError } from "@/lib/deluge/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const resolved = resolveDelugeTarget(req);
  if (resolved.error) {
    return uploadError(resolved.error, 400);
  }

  const form = await req.formData();

  if (resolved.demo) {
    const file = form.get("file");
    const name = file instanceof File ? file.name : "upload.torrent";
    const size = file instanceof File ? file.size : 0;
    return NextResponse.json(handleDemoUpload(name, size));
  }

  return proxyDeluge(req, resolved.target, "/upload", {
    method: "POST",
    body: form,
  });
}
