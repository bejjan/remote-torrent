import { NextRequest, NextResponse } from "next/server";
import { handleDemoRpc, type JsonRpcRequest } from "@/lib/deluge/demo";

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
  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return NextResponse.json(
      { id: null, result: null, error: { message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const target = resolveTarget(req);
  if (shouldUseDemo(target)) {
    const demo = handleDemoRpc(body, req.headers.get("cookie"));
    const res = NextResponse.json({
      id: demo.id,
      result: demo.result,
      error: demo.error,
    });
    if (demo.setCookie) res.headers.append("Set-Cookie", demo.setCookie);
    return res;
  }

  applyTlsInsecure();
  try {
    const upstream = await fetch(`${target}/json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
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
      {
        id: body.id ?? null,
        result: null,
        error: { message: `Cannot reach Deluge Web (${message})` },
      },
      { status: 502 }
    );
  }
}
