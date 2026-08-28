"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, PlugZap, Power, PowerOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { rpc } from "@/lib/deluge/client";
import type { HostInfo, HostStatus } from "@/lib/deluge/types";

interface HostRow {
  info: HostInfo;
  status: string;
  version: string;
}

async function loadHosts(): Promise<HostRow[]> {
  const hosts = await rpc<HostInfo[]>("web.get_hosts");
  const rows: HostRow[] = [];
  for (const info of hosts || []) {
    try {
      const status = await rpc<HostStatus>("web.get_host_status", [info[0]]);
      rows.push({ info, status: String(status?.[1] ?? "Unknown"), version: String(status?.[2] ?? "") });
    } catch {
      rows.push({ info, status: "Unknown", version: "" });
    }
  }
  return rows;
}

export function ConnectionManager({
  onConnected,
  onBack,
  embedded = false,
}: {
  onConnected: () => void;
  onBack?: () => void;
  embedded?: boolean;
}) {
  const [rows, setRows] = useState<HostRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("58846");
  const [user, setUser] = useState("localclient");
  const [password, setPassword] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRows(await loadHosts());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hosts");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connect(id: string) {
    setBusy(id);
    try {
      await rpc("web.connect", [id]);
      toast.success("Connected to daemon");
      onConnected();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusy(null);
    }
  }

  async function start(id: string) {
    setBusy(id);
    try {
      await rpc("web.start_daemon", [id]);
      await refresh();
      toast.success("Daemon started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Start failed");
    } finally {
      setBusy(null);
    }
  }

  async function stop(id: string) {
    setBusy(id);
    try {
      await rpc("web.stop_daemon", [id]);
      await refresh();
      toast.success("Daemon stopped");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stop failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await rpc("web.remove_host", [id]);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(null);
    }
  }

  async function addHost() {
    try {
      await rpc("web.add_host", [host, Number(port), user, password]);
      setAddOpen(false);
      setPassword("");
      await refresh();
      toast.success("Host added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add host failed");
    }
  }

  const body = (
    <div className="flex flex-col gap-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Host</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Version</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No daemons yet. Add a host to connect.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const [id, hostname, p, username] = row.info;
                const online = row.status.toLowerCase() === "online";
                return (
                  <tr key={id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {hostname}:{p}
                      </div>
                      <div className="text-xs text-muted-foreground">{username || "localclient"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={online ? "default" : "secondary"}>{row.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.version || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" disabled={busy === id} onClick={() => void connect(id)}>
                          {busy === id ? <Loader2 className="animate-spin" /> : <PlugZap />}
                          Connect
                        </Button>
                        <Button size="icon-sm" variant="outline" onClick={() => void start(id)}>
                          <Power />
                        </Button>
                        <Button size="icon-sm" variant="outline" onClick={() => void stop(id)}>
                          <PowerOff />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => void remove(id)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setAddOpen(true)}>
          <Plus />
          Add host
        </Button>
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        ) : null}
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add daemon</DialogTitle>
            <DialogDescription>Connection details for a Deluge daemon.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Host</Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Port</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Username</Label>
              <Input value={user} onChange={(e) => setUser(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void addHost()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) return body;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <Brand />
          <CardTitle>Connection Manager</CardTitle>
          <CardDescription>Choose a Deluge daemon to control.</CardDescription>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    </div>
  );
}
