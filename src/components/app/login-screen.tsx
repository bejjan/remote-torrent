"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
    if (kind === "transmission") {
      setStoredTransmissionUrl(target);
      setStoredTransmissionUsername(username);
    } else {
      setStoredWebUrl(target);
    }
    try {
      const ok = await rpc<boolean>("auth.login", [password]);
      if (!ok) {
        setError(kind === "transmission" ? "Incorrect username or password." : "Incorrect password.");
        return;
      }
      toast.success(target ? "Signed in" : "Signed in to demo mode");
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-svh min-w-0 flex-col items-center justify-center bg-background px-3 py-8 sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.45_0_0/0.08),transparent_55%)]" />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="relative w-full min-w-0 max-w-md py-6 ring-1 ring-primary/15">
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
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
