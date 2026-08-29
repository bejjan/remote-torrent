import { NextRequest } from "next/server";
import type { ClientKind } from "@/lib/backend/client-kind";
import { parseClientKind } from "@/lib/backend/client-kind";

export function clientKindFromRequest(req: NextRequest): ClientKind {
  return parseClientKind(
    req.headers.get("x-torrent-client") || req.headers.get("x-client-kind")
  );
}
