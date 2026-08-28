import { NextRequest, NextResponse } from "next/server";
import { handleDemoUpload } from "@/lib/deluge/demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveTarget(req: NextRequest): string {
  const header = req.headers.get("x-deluge-url")?.trim().replace(/\/$/, "") || "";
  const env = process.env.DELUGE_WEB_URL?.trim().replace(/\/$/, "") || "";
  return header || env;
}

function shouldUseDemo(target: string): boolean {
  return process.env.DELUGE_DEMO === "1" || process.env.DELUGE_DEMO === "true" || !target;
}

function rewriteSetCookie(value: string): string {
  return value
    .replace(/;\s*Domain=[^;]*/gi, "")
    .replace(/;\s*Path=[^;]*/gi, "; Path=/")
    .replace(/;\s*Secure/gi, "")
    .replace(/;\s*SameSite=[^;]*/gi, "; SameSite=Lax");
}

function applyTlsInsecure() {
  if (process.env.DELUGE_TLS_INSECURE === "1" || process.env.DELUGE_TLS_INSECURE === "true") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

export async function POST(req: NextRequest) {
  const target = resolveTarget(req);
  const form = await req.formData();

  if (shouldUseDemo(target)) {
    const file = form.get("file");
    const name = file instanceof File ? file.name : "upload.torrent";
    const size = file instanceof File ? file.size : 0;
    return NextResponse.json(handleDemoUpload(name, size));
  }

  applyTlsInsecure();
  try {
    const upstream = await fetch(`${target}/upload`, {
      method: "POST",
      headers: {
        Cookie: req.headers.get("cookie") ?? "",
      },
      body: form,
      cache: "no-store",
    });
    const text = await upstream.text();
    const res = new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
      },
    });
    const cookies =
      typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : [];
    for (const cookie of cookies) {
      res.headers.append("Set-Cookie", rewriteSetCookie(cookie));
    }
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy failure";
    return NextResponse.json(
      { success: false, error: `Cannot reach Deluge Web (${message})` },
      { status: 502 }
    );
  }
}
