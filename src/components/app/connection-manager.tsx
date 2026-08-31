"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, Pencil, Plus, PlugZap, Power, PowerOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { rpc } from "@/lib/deluge/client";
import type { HostInfo, HostStatus } from "@/lib/deluge/types";

const HOST_SKELETON_ROWS = 3;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = "58846";
const DEFAULT_USER = "localclient";

interface HostRow {
  info: HostInfo;
  status: string;
  version: string;
}

function isHostConnected(status: string): boolean {
  return status.toLowerCase() === "connected";
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
  onConnecting,
  onConnectFailed,
  onBack,
  embedded = false,
}: {
  onConnected: () => void;
  onConnecting?: () => void;
  onConnectFailed?: () => void;
  onBack?: () => void;
  embedded?: boolean;
}) {
  const [rows, setRows] = useState<HostRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [host, setHost] = useState(DEFAULT_HOST);
  const [port, setPort] = useState(DEFAULT_PORT);
  const [user, setUser] = useState(DEFAULT_USER);
  const [password, setPassword] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRows(await loadHosts());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hosts");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connect(id: string) {
    setBusy(id);
    onConnecting?.();
    try {
      try {
        if (await rpc<boolean>("web.connected")) {
          await rpc("web.disconnect");
        }
      } catch {
        /* already disconnected */
      }
      await rpc("web.connect", [id]);
      toast.success("Connected to daemon");
      onConnected();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connect failed");
      onConnectFailed?.();
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

  function resetForm() {
    setEditingId(null);
    setHost(DEFAULT_HOST);
    setPort(DEFAULT_PORT);
    setUser(DEFAULT_USER);
    setPassword("");
  }

  function openAdd() {
    resetForm();
    setFormOpen(true);
  }

  function openEdit(row: HostRow) {
    const [id, hostname, p, username] = row.info;
    setEditingId(id);
    setHost(hostname);
    setPort(String(p));
    setUser(username || DEFAULT_USER);
    setPassword("");
    setFormOpen(true);
  }

  function onFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) resetForm();
  }

  async function saveHost() {
    try {
      if (editingId) {
        if (!password) {
          toast.error("Enter the daemon password to save changes");
          return;
        }
        const ok = await rpc<boolean>("web.edit_host", [editingId, host, Number(port), user, password]);
        if (!ok) throw new Error("Edit host failed");
        toast.success("Host updated");
      } else {
        await rpc("web.add_host", [host, Number(port), user, password]);
        toast.success("Host added");
      }
      setFormOpen(false);
      resetForm();
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : editingId ? "Edit host failed" : "Add host failed");
    }
  }

  const body = (
    <div className="flex flex-col gap-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto rounded-lg border" aria-busy={!loaded}>
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
            {!loaded ? (
              <HostTableSkeleton />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No daemons yet. Add a host to connect.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const [id, hostname, p, username] = row.info;
                const connected = isHostConnected(row.status);
                const online = row.status.toLowerCase() === "online";
                return (
                  <tr key={id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {hostname}:{p}
                      </div>
                      <div className="text-xs text-muted-foreground">{username || DEFAULT_USER}</div>
                    </td>
                    <td className="px-3 py-2">
                      <HostStatusBadge status={row.status} connected={connected} online={online} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.version || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {!connected ? (
                          <Button
                            size="sm"
                            variant="default"
                            aria-label="Connect"
                            disabled={busy === id}
                            onClick={() => void connect(id)}
                          >
                            {busy === id ? <Loader2 className="animate-spin" /> : <PlugZap />}
                            <span className="hidden sm:inline">Connect</span>
                          </Button>
                        ) : null}
                        <HostActionBtn label="Start" variant="outline" onClick={() => void start(id)}>
                          <Power />
                        </HostActionBtn>
                        <HostActionBtn label="Stop" variant="outline" onClick={() => void stop(id)}>
                          <PowerOff />
                        </HostActionBtn>
                        <HostActionBtn label="Edit" variant="outline" onClick={() => openEdit(row)}>
                          <Pencil />
                        </HostActionBtn>
                        <HostActionBtn label="Remove" variant="destructive" onClick={() => void remove(id)}>
                          <Trash2 />
                        </HostActionBtn>
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
        <Button variant="outline" onClick={openAdd}>
          <Plus />
          Add host
        </Button>
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        ) : null}
      </div>
      <Dialog open={formOpen} onOpenChange={onFormOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit daemon" : "Add daemon"}</DialogTitle>
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
              {editingId ? (
                <p className="text-xs text-muted-foreground">Re-enter the daemon password to save changes.</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onFormOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveHost()}>{editingId ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) return body;

  return (
    <div className="flex min-h-svh min-w-0 flex-col items-center justify-center bg-background px-3 py-8 sm:px-4 sm:py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full min-w-0 max-w-3xl">
        <CardHeader>
          <Brand markClassName="size-10" />
          <CardTitle>Connection Manager</CardTitle>
          <CardDescription>Choose a Deluge daemon to control.</CardDescription>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    </div>
  );
}

function HostStatusBadge({
  status,
  connected,
  online,
}: {
  status: string;
  connected: boolean;
  online: boolean;
}) {
  if (connected) {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-[color:var(--seeding)]/15 text-[color:var(--seeding)]"
      >
        {status}
      </Badge>
    );
  }
  return <Badge variant={online ? "default" : "secondary"}>{status}</Badge>;
}

function HostTableSkeleton() {
  return (
    <>
      <tr className="sr-only">
        <td colSpan={4}>Loading hosts</td>
      </tr>
      {Array.from({ length: HOST_SKELETON_ROWS }, (_, row) => (
        <tr key={row} className="border-t" aria-hidden="true">
          <td className="px-3 py-2">
            <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
            <div className="mt-1.5 h-3 w-20 animate-pulse rounded-md bg-muted" />
          </td>
          <td className="px-3 py-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 w-12 animate-pulse rounded-md bg-muted" />
          </td>
          <td className="px-3 py-2">
            <div className="ml-auto h-7 w-40 animate-pulse rounded-md bg-muted" />
          </td>
        </tr>
      ))}
    </>
  );
}

function HostActionBtn({
  label,
  children,
  onClick,
  disabled,
  variant = "ghost",
  size = "icon-sm",
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "ghost" | "outline" | "default" | "destructive";
  size?: "icon-sm" | "sm";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant={variant} size={size} aria-label={label} disabled={disabled} onClick={onClick} />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
