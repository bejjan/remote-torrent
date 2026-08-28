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
  rpc,
  setStoredWebUrl,
  getStoredWebUrl,
  getStoredTlsInsecure,
  setStoredTlsInsecure,
} from "@/lib/deluge/client";
import {
  DEFAULT_WEB_PORT,
  extractExplicitPort,
  normalizeDelugeWebUrl,
} from "@/lib/deluge/web-url";

function initialUrl(): string {
  return typeof window === "undefined" ? "" : getStoredWebUrl();
}

function initialPort(): string {
  return extractExplicitPort(initialUrl()) || String(DEFAULT_WEB_PORT);
}

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [url, setUrl] = useState(initialUrl);
  const [port, setPort] = useState(initialPort);
  const [password, setPassword] = useState("");
  const [tlsInsecure, setTlsInsecure] = useState(
    () => typeof window !== "undefined" && getStoredTlsInsecure()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onUrlChange(next: string) {
    setUrl(next);
    const explicit = extractExplicitPort(next);
    if (explicit) setPort(explicit);
  }

  function onPortChange(next: string) {
    setPort(next);
    const trimmed = url.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;
    try {
      setUrl(normalizeDelugeWebUrl(trimmed, next.trim() || String(DEFAULT_WEB_PORT)));
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
        target = normalizeDelugeWebUrl(target, port.trim() || undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid Deluge Web URL");
      setBusy(false);
      return;
    }
    setStoredWebUrl(target);
    setStoredTlsInsecure(tlsInsecure);
    try {
      const ok = await rpc<boolean>("auth.login", [password]);
      if (!ok) {
        setError("Incorrect password.");
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
              Connect to deluge-web with protocol, host, and port — or leave the URL blank for the
              demo.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="flex min-w-0 flex-col gap-4" onSubmit={onSubmit}>
            <div className="grid min-w-0 gap-1.5">
              <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem]">
                <Label htmlFor="deluge-url">Deluge Web URL</Label>
                <Label htmlFor="deluge-port">Port</Label>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem]">
                <Input
                  id="deluge-url"
                  placeholder="http://192.168.1.10:8112"
                  value={url}
                  onChange={(e) => onUrlChange(e.target.value)}
                  autoComplete="url"
                  inputMode="url"
                  className="min-w-0"
                />
                <Input
                  id="deluge-port"
                  placeholder="8112"
                  value={port}
                  onChange={(e) => onPortChange(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="Deluge Web port"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Example: <span className="font-mono text-foreground">http://192.168.1.10:8112</span>.
                Missing <span className="font-mono">http://</span> is added; missing port defaults to{" "}
                {DEFAULT_WEB_PORT}.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deluge-password">Deluge Web password</Label>
              <Input
                id="deluge-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This is the Deluge Web password. Daemon username is in Connection Manager after
                login.
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
                  <span className="font-mono">DELUGE_TLS_INSECURE=1</span>.
                </span>
              </span>
            </label>
            <Alert>
              <AlertDescription>
                Demo password is <span className="font-mono text-foreground">deluge</span>. Leave
                the URL empty to use the in-memory demo backend.
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
