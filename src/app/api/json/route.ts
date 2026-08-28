import { NextRequest, NextResponse } from "next/server";
import { handleDemoRpc, type JsonRpcRequest } from "@/lib/deluge/demo";
import { jsonRpcError, proxyDeluge, resolveDelugeTarget } from "@/lib/deluge/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return jsonRpcError(null, "Invalid JSON", 400);
  }

  const resolved = resolveDelugeTarget(req);
  if (resolved.error) {
    return jsonRpcError(body.id ?? null, resolved.error, 400);
  }
  if (resolved.demo) {
    const demo = handleDemoRpc(body, req.headers.get("cookie"));
    const res = NextResponse.json({
      id: demo.id,
      result: demo.result,
      error: demo.error,
    });
    if (demo.setCookie) res.headers.append("Set-Cookie", demo.setCookie);
    return res;
  }

  return proxyDeluge(req, resolved.target, "/json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    rpcId: body.id ?? null,
  });
}
