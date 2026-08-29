"use client";

import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ADMIN_DEMO_DEFAULT_COUNT,
  ADMIN_DEMO_MAX_COUNT,
  type StoredAdminDemo,
  clampAdminDemoConfig,
  defaultStoredAdminDemo,
  getStoredAdminDemo,
  setStoredAdminDemo,
} from "@/lib/demo/admin-catalog";
import {
  type ClientKind,
  getStoredClientKind,
  getStoredTlsInsecure,
  getStoredTransmissionUrl,
  getStoredTransmissionUsername,
  getStoredWebUrl,
  rpc,
  setStoredClientKind,
  setStoredTlsInsecure,
  setStoredTransmissionUrl,
  setStoredTransmissionUsername,
  setStoredWebUrl,
} from "@/lib/deluge/client";
import {
  DEFAULT_WEB_PORT,
  extractExplicitPort as extractDelugePort,
  normalizeDelugeWebUrl,
} from "@/lib/deluge/web-url";
import {
  DEFAULT_TRANSMISSION_PORT,
  extractExplicitPort as extractTransmissionPort,
  normalizeTransmissionRpcUrl,
} from "@/lib/transmission/url";
import { cn } from "@/lib/utils";

function initialKind(): ClientKind {
  return typeof window === "undefined" ? "deluge" : getStoredClientKind();
}

function initialDelugeUrl(): string {
  return typeof window === "undefined" ? "" : getStoredWebUrl();
}

function initialTransmissionUrl(): string {
  return typeof window === "undefined" ? "" : getStoredTransmissionUrl();
}

function initialDelugePort(): string {
  return extractDelugePort(initialDelugeUrl()) || String(DEFAULT_WEB_PORT);
}

function initialTransmissionPort(): string {
  return extractTransmissionPort(initialTransmissionUrl()) || String(DEFAULT_TRANSMISSION_PORT);
}

function initialUsername(): string {
  return typeof window === "undefined" ? "" : getStoredTransmissionUsername();
}

function initialAdmin(): StoredAdminDemo {
  return typeof window === "undefined" ? defaultStoredAdminDemo() : getStoredAdminDemo();
}

function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [kind, setKind] = useState<ClientKind>(initialKind);
  const [delugeUrl, setDelugeUrl] = useState(initialDelugeUrl);
  const [delugePort, setDelugePort] = useState(initialDelugePort);
  const [txUrl, setTxUrl] = useState(initialTransmissionUrl);
  const [txPort, setTxPort] = useState(initialTransmissionPort);
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [tlsInsecure, setTlsInsecure] = useState(
    () => typeof window !== "undefined" && getStoredTlsInsecure()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<StoredAdminDemo>(initialAdmin);

  function persistAdmin(next: StoredAdminDemo) {
    const clamped = { ...clampAdminDemoConfig(next), open: Boolean(next.open) };
    setAdmin(clamped);
    setStoredAdminDemo(clamped);
  }

  const url = kind === "transmission" ? txUrl : delugeUrl;
  const port = kind === "transmission" ? txPort : delugePort;

  function onKindChange(next: ClientKind) {
    setKind(next);
    setStoredClientKind(next);
    setError(null);
  }

  function onUrlChange(next: string) {
    if (kind === "transmission") {
      setTxUrl(next);
      const explicit = extractTransmissionPort(next);
      if (explicit) setTxPort(explicit);
      return;
    }
    setDelugeUrl(next);
    const explicit = extractDelugePort(next);
    if (explicit) setDelugePort(explicit);
  }

  function onPortChange(next: string) {
    if (kind === "transmission") {
      setTxPort(next);
      const trimmed = txUrl.trim();
      if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;
      try {
        setTxUrl(normalizeTransmissionRpcUrl(trimmed, next.trim() || String(DEFAULT_TRANSMISSION_PORT)));
      } catch {
        // keep the URL as typed while the port field is mid-edit
      }
      return;
    }
    setDelugePort(next);
    const trimmed = delugeUrl.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;
    try {
      setDelugeUrl(normalizeDelugeWebUrl(trimmed, next.trim() || String(DEFAULT_WEB_PORT)));
    } catch {
      // keep the URL as typed while the port field is mid-edit
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let target = url.trim();
    try {
      if (target) {
        target =
          kind === "transmission"
            ? normalizeTransmissionRpcUrl(target, port.trim() || undefined)
            : normalizeDelugeWebUrl(target, port.trim() || undefined);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : kind === "transmission"
            ? "Invalid Transmission RPC URL"
            : "Invalid Deluge Web URL"
      );
      setBusy(false);
      return;
    }
    setStoredClientKind(kind);
    setStoredTlsInsecure(tlsInsecure);
    persistAdmin(admin);
    if (kind === "transmission") {
      if (!admin.enabled) setStoredTransmissionUrl(target);
      setStoredTransmissionUsername(username);
    } else if (!admin.enabled) {
      setStoredWebUrl(target);
    }
    try {
      if (admin.enabled) await yieldToPaint();
      const ok = await rpc<boolean>("auth.login", [password]);
      if (!ok) {
        setError(kind === "transmission" ? "Incorrect username or password." : "Incorrect password.");
        return;
      }
      toast.success(
        admin.enabled
          ? `Signed in to load-test (${admin.count.toLocaleString()} torrents)`
          : target
            ? "Signed in"
            : "Signed in to demo mode"
      );
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-svh min-w-0 flex-col items-center justify-center overflow-y-auto bg-background px-3 py-8 sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.45_0_0/0.08),transparent_55%)]" />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="relative my-auto w-full min-w-0 max-w-md py-6 ring-1 ring-primary/15">
        <CardHeader className="gap-3">
          <Brand />
          <div className="min-w-0">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription className="mt-1 text-pretty">
              Connect Nova to Deluge Web or Transmission RPC — or leave the URL blank for the demo.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="flex min-w-0 flex-col gap-4" onSubmit={onSubmit}>
            <div className="grid min-w-0 gap-1.5">
              <Label>Client</Label>
              <div
                role="radiogroup"
                aria-label="Client"
                className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-[3px]"
              >
                {(["deluge", "transmission"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={kind === id}
                    className={cn(
                      "h-7 rounded-md text-sm font-medium transition-colors",
                      kind === id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => onKindChange(id)}
                  >
                    {id === "deluge" ? "Deluge" : "Transmission"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid min-w-0 gap-1.5">
              <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem]">
                <Label htmlFor="daemon-url">
                  {kind === "transmission" ? "Transmission RPC URL" : "Deluge Web URL"}
                </Label>
                <Label htmlFor="daemon-port">Port</Label>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem]">
                <Input
                  id="daemon-url"
                  placeholder={
                    kind === "transmission"
                      ? "http://127.0.0.1:9091"
                      : "http://192.168.1.10:8112"
                  }
                  value={url}
                  onChange={(e) => onUrlChange(e.target.value)}
                  autoComplete="url"
                  inputMode="url"
                  className="min-w-0"
                />
                <Input
                  id="daemon-port"
                  placeholder={kind === "transmission" ? "9091" : "8112"}
                  value={port}
                  onChange={(e) => onPortChange(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={kind === "transmission" ? "Transmission RPC port" : "Deluge Web port"}
                />
              </div>
              <p className="min-w-0 text-xs break-words text-muted-foreground">
                {kind === "transmission" ? (
                  <>
                    Example:{" "}
                    <span className="font-mono text-foreground">http://127.0.0.1:9091</span> or{" "}
                    <span className="font-mono text-foreground">http://host:9091/transmission/rpc</span>.
                    Missing <span className="font-mono">http://</span> is added; missing port defaults to{" "}
                    {DEFAULT_TRANSMISSION_PORT}.
                  </>
                ) : (
                  <>
                    Example: <span className="font-mono text-foreground">http://192.168.1.10:8112</span>.
                    Missing <span className="font-mono">http://</span> is added; missing port defaults to{" "}
                    {DEFAULT_WEB_PORT}.
                  </>
                )}
              </p>
            </div>
            {kind === "transmission" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="transmission-username">Username</Label>
                <Input
                  id="transmission-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Transmission RPC often uses HTTP basic auth. Leave blank if the daemon has no
                  username.
                </p>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="daemon-password">
                {kind === "transmission" ? "Password" : "Deluge Web password"}
              </Label>
              <Input
                id="daemon-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {kind === "transmission"
                  ? "RPC password (HTTP basic auth). Daemon settings are on the Transmission side."
                  : "This is the Deluge Web password. Daemon username is in Connection Manager after login."}
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm leading-snug">
              <Checkbox
                className="mt-0.5"
                checked={tlsInsecure}
                onCheckedChange={(v) => setTlsInsecure(v === true)}
              />
              <span>
                Allow self-signed TLS
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  For home-lab HTTPS. You can also set{" "}
                  <span className="font-mono">
                    {kind === "transmission" ? "TRANSMISSION_TLS_INSECURE=1" : "DELUGE_TLS_INSECURE=1"}
                  </span>
                  .
                </span>
              </span>
            </label>
            <Alert>
              <AlertDescription>
                Demo password is <span className="font-mono text-foreground">deluge</span>. Leave
                the URL empty to use the in-memory demo backend for the selected client.
              </AlertDescription>
            </Alert>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="animate-spin" /> : null}
              {busy
                ? admin.enabled
                  ? `Generating ${admin.count.toLocaleString()} torrents…`
                  : "Signing in…"
                : "Sign in"}
            </Button>
            <AdminDemoFoldout admin={admin} onChange={persistAdmin} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDemoFoldout({
  admin,
  onChange,
}: {
  admin: StoredAdminDemo;
  onChange: (next: StoredAdminDemo) => void;
}) {
  function patch(partial: Partial<StoredAdminDemo>) {
    onChange({ ...admin, ...partial });
  }

  return (
    <details
      className="rounded-md border border-transparent text-muted-foreground open:border-border/60 open:bg-muted/30"
      open={admin.open}
      onToggle={(e) => patch({ open: e.currentTarget.open })}
    >
      <summary className="flex cursor-pointer list-none items-center gap-1 px-1 py-1.5 text-xs marker:content-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className={cn("size-3 shrink-0 transition-transform", admin.open && "rotate-90")}
          aria-hidden
        />
        Admin: synthetic session
      </summary>
      <div className="flex flex-col gap-3 px-1 pb-2 pt-0.5">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Load test with an in-memory Deluge or Transmission catalog. URL may stay blank. Password{" "}
          <span className="font-mono text-foreground">deluge</span> or any value. No daemon.{" "}
          {ADMIN_DEMO_MAX_COUNT.toLocaleString()} torrents will be slow.
        </p>
        <label className="flex items-start gap-2 text-sm leading-snug text-foreground">
          <Checkbox
            className="mt-0.5"
            checked={admin.enabled}
            onCheckedChange={(v) => patch({ enabled: v === true })}
          />
          <span>
            Use dummy data
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Default {ADMIN_DEMO_DEFAULT_COUNT.toLocaleString()} torrents. Client selector above
              still picks Deluge vs Transmission.
            </span>
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="admin-torrent-count" className="text-xs text-muted-foreground">
              Torrent count
            </Label>
            <Input
              id="admin-torrent-count"
              type="number"
              min={1}
              max={ADMIN_DEMO_MAX_COUNT}
              value={admin.count}
              onChange={(e) => patch({ count: Number(e.target.value) })}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="admin-rng-seed" className="text-xs text-muted-foreground">
              RNG seed
            </Label>
            <Input
              id="admin-rng-seed"
              type="number"
              value={admin.seed}
              onChange={(e) => patch({ seed: Number(e.target.value) })}
              inputMode="numeric"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="admin-seeding" className="text-xs text-muted-foreground">
              Seeding %
            </Label>
            <Input
              id="admin-seeding"
              type="number"
              min={0}
              max={100}
              value={admin.seedingPct}
              onChange={(e) => patch({ seedingPct: Number(e.target.value) })}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="admin-downloading" className="text-xs text-muted-foreground">
              Downloading %
            </Label>
            <Input
              id="admin-downloading"
              type="number"
              min={0}
              max={100}
              value={admin.downloadingPct}
              onChange={(e) => patch({ downloadingPct: Number(e.target.value) })}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="admin-paused" className="text-xs text-muted-foreground">
              Paused %
            </Label>
            <Input
              id="admin-paused"
              type="number"
              min={0}
              max={100}
              value={admin.pausedPct}
              onChange={(e) => patch({ pausedPct: Number(e.target.value) })}
              inputMode="numeric"
            />
          </div>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Leftover percent becomes checking, queued, and error. Same seed rebuilds the same catalog
          after reload.
        </p>
      </div>
    </details>
  );
}
