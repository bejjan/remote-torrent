"use client";

import { useState } from "react";
import { CircleAlert, Loader2, Waves } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  connectToDaemon,
  DEFAULT_WEB_URL,
  DelugeError,
  getStoredWebUrl,
  login,
  setStoredWebUrl,
} from "@/lib/deluge/client";

export function ConnectScreen({
  initialError,
  onSuccess,
}: {
  initialError?: string;
  onSuccess: (daemonConnected: boolean) => void;
}) {
  const [url, setUrl] = useState(() => getStoredWebUrl() || DEFAULT_WEB_URL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const trimmed = url.trim().replace(/\/$/, "");
      if (!trimmed) {
        setError("Enter the Deluge Web URL.");
        return;
      }
      setStoredWebUrl(trimmed);
      const ok = await login(password);
      if (!ok) {
        setError("Incorrect password.");
        return;
      }
      const connected = await connectToDaemon();
      onSuccess(connected);
    } catch (err) {
      setError(
        err instanceof DelugeError
          ? err.message
          : "Cannot reach Deluge Web. Check the URL and that deluge-web is running."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Waves className="size-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Nova</span>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <form
          onSubmit={onSubmit}
          className="flex w-full max-w-md flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold tracking-tight">
              Connect to Deluge
            </h1>
            <p className="text-sm text-muted-foreground">
              Point Nova at your Deluge Web UI. It logs in with{" "}
              <code className="font-mono text-xs">auth.login</code> and talks to
              the daemon through that session.
            </p>
          </div>
          {error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Could not connect</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="web-url">Deluge Web URL</Label>
            <Input
              id="web-url"
              type="url"
              autoComplete="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={DEFAULT_WEB_URL}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="web-password">Web UI password</Label>
            <Input
              id="web-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password from deluge-web"
            />
          </div>
          <Button type="submit" disabled={busy} className="mt-1">
            {busy && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {busy ? "Connecting…" : "Connect"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Default Web UI is{" "}
            <code className="font-mono">{DEFAULT_WEB_URL}</code>. Keep{" "}
            <code className="font-mono">deluge-web</code> running.
          </p>
        </form>
      </main>
    </div>
  );
}
