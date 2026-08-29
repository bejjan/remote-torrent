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

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const res = await fetch(`${webUrl}/json`, {
      method: "POST",
      headers: proxyHeaders(request, {
        "Content-Type": request.headers.get("content-type") || "application/json",
        Accept: "application/json",
      }),
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    return await forwardDeluge(res);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return unreachable(timedOut ? 503 : 502);
  }
}
