import { NextRequest, NextResponse } from "next/server";
import { parseAdminDemoHeader } from "@/lib/demo/admin-catalog";
import { handleTransmissionDemoRpc } from "@/lib/transmission/demo";
import type { TransmissionRpcRequest } from "@/lib/transmission/types";
import {
  TransmissionProxyError,
  authSetCookie,
  proxyTransmissionRpc,
  resolveTransmissionTarget,
  withTransmissionCookies,
} from "@/lib/transmission/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: TransmissionRpcRequest;
  try {
    body = (await req.json()) as TransmissionRpcRequest;
  } catch {
    return NextResponse.json({ result: "Invalid JSON", arguments: {} }, { status: 400 });
  }

  const resolved = resolveTransmissionTarget(req);
  if (resolved.error) {
    return NextResponse.json({ result: resolved.error, arguments: {} }, { status: 400 });
  }
  if (resolved.demo) {
    const demo = handleTransmissionDemoRpc(
      body,
      parseAdminDemoHeader(req.headers.get("x-nova-admin-demo"))
    );
    return withTransmissionCookies(NextResponse.json(demo), undefined, authSetCookie(req));
  }
  try {
    const proxied = await proxyTransmissionRpc(req, resolved.target, body);
    const res = NextResponse.json(proxied.response, { status: proxied.status >= 400 ? proxied.status : 200 });
    return withTransmissionCookies(res, proxied.sessionId, authSetCookie(req));
  } catch (err) {
    const message = err instanceof TransmissionProxyError ? err.message : err instanceof Error ? err.message : "Transmission RPC failed";
    const status = err instanceof TransmissionProxyError ? err.status : 502;
    return NextResponse.json({ result: message, arguments: {} }, { status });
  }
}
