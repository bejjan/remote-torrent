import { NextResponse } from "next/server";

import {
  forwardDeluge,
  proxyHeaders,
  resolveWebUrl,
  unreachable,
} from "@/lib/deluge/proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webUrl = resolveWebUrl(request);
  if (webUrl instanceof NextResponse) return webUrl;

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected a torrent file." }, { status: 400 });
  }

  let body: ArrayBuffer;
  try {
    body = await request.arrayBuffer();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  try {
    const res = await fetch(`${webUrl}/upload`, {
      method: "POST",
      headers: proxyHeaders(request, { "Content-Type": contentType }),
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    return await forwardDeluge(res);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return unreachable(timedOut ? 503 : 502);
  }
}
