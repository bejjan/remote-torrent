import { NextRequest, NextResponse } from "next/server";
import { parseAdminDemoHeader } from "@/lib/demo/admin-catalog";
import { clientKindFromRequest } from "@/lib/backend/request";
import { handleDemoRpc, type JsonRpcRequest } from "@/lib/deluge/demo";
import { jsonRpcError, proxyDeluge, resolveDelugeTarget } from "@/lib/deluge/proxy";
import { handleTransmissionCompat } from "@/lib/transmission/compat";
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
  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return jsonRpcError(null, "Invalid JSON", 400);
  }

  if (clientKindFromRequest(req) === "transmission") {
    return handleTransmissionJson(req, body);
  }

  const resolved = resolveDelugeTarget(req);
  if (resolved.error) return jsonRpcError(body.id ?? null, resolved.error, 400);
  if (resolved.demo) {
    const admin = parseAdminDemoHeader(req.headers.get("x-nova-admin-demo"));
    const demo = handleDemoRpc(body, req.headers.get("cookie"), admin);
    const res = NextResponse.json({ id: demo.id, result: demo.result, error: demo.error });
    if (demo.setCookie) res.headers.append("Set-Cookie", demo.setCookie);
    return res;
  }

  return proxyDeluge(req, resolved.target, "/json", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    rpcId: body.id ?? null,
  });
}

async function handleTransmissionJson(req: NextRequest, body: JsonRpcRequest) {
  const resolved = resolveTransmissionTarget(req);
  if (resolved.error) return jsonRpcError(body.id ?? null, resolved.error, 400);

  const live = resolved.demo
    ? undefined
    : async (method: string, args?: Record<string, unknown>) => {
        const proxied = await proxyTransmissionRpc(req, resolved.target, { method, arguments: args });
        return proxied.response;
      };

  try {
    const demo = await handleTransmissionCompat(body, {
      demo: resolved.demo,
      cookieHeader: req.headers.get("cookie"),
      live,
      password: req.headers.get("x-transmission-password") ?? "",
      admin: parseAdminDemoHeader(req.headers.get("x-nova-admin-demo")),
    });
    const res = NextResponse.json({ id: demo.id, result: demo.result, error: demo.error });
    const cookies = demo.setCookie == null ? [] : Array.isArray(demo.setCookie) ? demo.setCookie : [demo.setCookie];
    if (body.method === "auth.login" && demo.result === true) {
      const auth = authSetCookie(req);
      if (auth) cookies.push(auth);
    }
    return withTransmissionCookies(res, undefined, cookies);
  } catch (err) {
    if (err instanceof TransmissionProxyError) {
      return jsonRpcError(body.id ?? null, err.message, err.status);
    }
    return jsonRpcError(body.id ?? null, err instanceof Error ? err.message : "Transmission RPC failed");
  }
}
