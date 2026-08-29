"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getStoredClientKind, rpc } from "@/lib/deluge/client";
import { LoginScreen } from "@/components/app/login-screen";
import { ConnectionManager } from "@/components/app/connection-manager";
import { TorrentShell } from "@/components/app/torrent-shell";

type Phase = "boot" | "login" | "hosts" | "main";

export function NovaApp() {
  const [phase, setPhase] = useState<Phase>("boot");

  const advance = useCallback(async () => {
    try {
      const session = await rpc<boolean>("auth.check_session");
      if (!session) {
        setPhase("login");
        return;
      }
      if (getStoredClientKind() === "transmission") {
        setPhase("main");
        return;
      }
      const connected = await rpc<boolean>("web.connected");
      setPhase(connected ? "main" : "hosts");
    } catch {
      setPhase("login");
    }
  }, []);

  useEffect(() => {
    void advance();
  }, [advance]);

  if (phase === "boot") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm">Starting Nova…</p>
      </div>
    );
  }

  if (phase === "login") {
    return <LoginScreen onLoggedIn={() => void advance()} />;
  }

  if (phase === "hosts") {
    return <ConnectionManager onConnected={() => setPhase("main")} />;
  }

  return (
    <TorrentShell
      onLogout={() => setPhase("login")}
      onManageHosts={() => setPhase("hosts")}
    />
  );
}
