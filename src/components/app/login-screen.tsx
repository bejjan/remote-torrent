"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rpc, setStoredWebUrl, getStoredWebUrl } from "@/lib/deluge/client";

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [url, setUrl] = useState(() => (typeof window === "undefined" ? "" : getStoredWebUrl()));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStoredWebUrl(url);
    try {
      const ok = await rpc<boolean>("auth.login", [password]);
      if (!ok) {
        setError("Incorrect password.");
        return;
      }
      toast.success(url.trim() ? "Signed in" : "Signed in to demo mode");
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.12_185/0.18),transparent_55%)]" />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="relative w-full max-w-md py-6 ring-1 ring-primary/15">
        <CardHeader className="gap-3">
          <Brand />
          <div>
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription className="mt-1">
              Connect to deluge-web, or leave the URL blank to explore the demo.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="grid gap-1.5">
              <Label htmlFor="deluge-url">Deluge Web URL</Label>
              <Input
                id="deluge-url"
                placeholder="http://127.0.0.1:8112"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="url"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deluge-password">Password</Label>
              <Input
                id="deluge-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
            </div>
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
