import { NextResponse } from "next/server";

export const UNREACHABLE =
  "Cannot reach Deluge Web. Check the URL and that deluge-web is running.";

export function resolveWebUrl(request: Request): string | NextResponse {
  const header = request.headers.get("x-deluge-url")?.trim().replace(/\/$/, "") ?? "";
  const fallback = (process.env.DELUGE_WEB_URL ?? "").trim().replace(/\/$/, "");
  const raw = header || fallback;
  if (!raw) {
    return NextResponse.json(
      { error: "Deluge Web URL is not set." },
      { status: 400 }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid Deluge Web URL." }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid Deluge Web URL." }, { status: 400 });
  }

  return raw;
}

export function sessionCookieHeader(request: Request): string | undefined {
  const cookie = request.headers.get("cookie");
  if (!cookie) return undefined;
  const session = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("_session_id="));
  return session;
}

export function rewriteSetCookie(cookie: string): string {
  const parts = cookie.split(";").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return cookie;

  const [nameValue, ...attrs] = parts;
  const kept: string[] = [];
  let hasPath = false;

  for (const attr of attrs) {
    const key = attr.split("=")[0]?.toLowerCase();
    if (key === "domain" || key === "secure" || key === "samesite") continue;
    if (key === "path") {
      hasPath = true;
      kept.push("Path=/");
      continue;
    }
    kept.push(attr);
  }

  if (!hasPath) kept.push("Path=/");
  kept.push("SameSite=Lax");
  return [nameValue, ...kept].join("; ");
}

export function unreachable(status: 502 | 503 = 502): NextResponse {
  return NextResponse.json({ error: UNREACHABLE }, { status });
}

export async function forwardDeluge(res: Response): Promise<NextResponse> {
  const contentType = res.headers.get("content-type") ?? "";
  if (res.ok && contentType && !contentType.includes("json")) {
    return unreachable();
  }

  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);

  for (const cookie of res.headers.getSetCookie()) {
    headers.append("set-cookie", rewriteSetCookie(cookie));
  }

  return new NextResponse(await res.arrayBuffer(), {
    status: res.status,
    headers,
  });
}

export function proxyHeaders(
  request: Request,
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const session = sessionCookieHeader(request);
  if (session) headers.Cookie = session;
  return headers;
}
