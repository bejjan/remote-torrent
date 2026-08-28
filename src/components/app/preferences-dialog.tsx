"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rpc } from "@/lib/deluge/client";
import type { ExecuteCommand, WatchDir } from "@/lib/deluge/types";
import { isWebSidebarVisible } from "@/lib/deluge/web-config";
import { cn } from "@/lib/utils";

type Page =
  | "downloads"
  | "network"
  | "bandwidth"
  | "queue"
  | "proxy"
  | "cache"
  | "daemon"
  | "other"
  | "interface"
  | "plugins"
  | "scheduler"
  | "extractor"
  | "execute"
  | "notifications"
  | "blocklist"
  | "autoadd";

const CORE_PAGES: { id: Page; label: string }[] = [
  { id: "downloads", label: "Downloads" },
  { id: "network", label: "Network" },
  { id: "bandwidth", label: "Bandwidth" },
  { id: "queue", label: "Queue" },
  { id: "proxy", label: "Proxy" },
  { id: "cache", label: "Cache" },
  { id: "daemon", label: "Daemon" },
  { id: "other", label: "Other" },
  { id: "interface", label: "Interface" },
  { id: "plugins", label: "Plugins" },
];

const PLUGIN_PAGES: { id: Page; label: string; plugin: string }[] = [
  { id: "scheduler", label: "Scheduler", plugin: "Scheduler" },
  { id: "extractor", label: "Extractor", plugin: "Extractor" },
  { id: "execute", label: "Execute", plugin: "Execute" },
  { id: "notifications", label: "Notifications", plugin: "Notifications" },
  { id: "blocklist", label: "Blocklist", plugin: "Blocklist" },
  { id: "autoadd", label: "AutoAdd", plugin: "AutoAdd" },
];

export function PreferencesDialog({
  open,
  onOpenChange,
  onWebConfigChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWebConfigChange?: (web: Record<string, unknown>) => void;
}) {
  const [page, setPage] = useState<Page>("downloads");
  const [core, setCore] = useState<Record<string, unknown>>({});
  const [web, setWeb] = useState<Record<string, unknown>>({});
  const [available, setAvailable] = useState<string[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);

  function commitWeb(next: Record<string, unknown>) {
    setWeb(next);
    onWebConfigChange?.(next);
  }

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [c, w, plugins] = await Promise.all([
          rpc<Record<string, unknown>>("core.get_config"),
          rpc<Record<string, unknown>>("web.get_config"),
          rpc<{ available_plugins: string[]; enabled_plugins: string[] }>("web.get_plugins"),
        ]);
        setCore(c || {});
        const nextWeb = w || {};
        setWeb(nextWeb);
        onWebConfigChange?.(nextWeb);
        setAvailable(plugins?.available_plugins || []);
        setEnabled(plugins?.enabled_plugins || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load preferences");
      }
    })();
  }, [open, onWebConfigChange]);

  async function saveCore() {
    try {
      await rpc("core.set_config", [core]);
      await rpc("web.set_config", [web]);
      onWebConfigChange?.(web);
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  const pluginSet = new Set(enabled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(40rem,90vh)] max-w-4xl flex-col gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b p-4">
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1">
          <nav className="w-44 shrink-0 overflow-auto border-r p-2">
            {CORE_PAGES.map((p) => (
              <NavBtn key={p.id} active={page === p.id} onClick={() => setPage(p.id)}>
                {p.label}
              </NavBtn>
            ))}
            <p className="mt-3 mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Plugins
            </p>
            {PLUGIN_PAGES.filter((p) => pluginSet.has(p.plugin)).map((p) => (
              <NavBtn key={p.id} active={page === p.id} onClick={() => setPage(p.id)}>
                {p.label}
              </NavBtn>
            ))}
          </nav>
          <ScrollArea className="min-w-0 flex-1">
            <div className="p-4">
              {page === "downloads" && <DownloadsPage core={core} setCore={setCore} />}
              {page === "network" && <NetworkPage core={core} setCore={setCore} />}
              {page === "bandwidth" && <BandwidthPage core={core} setCore={setCore} />}
              {page === "queue" && <QueuePage core={core} setCore={setCore} />}
              {page === "proxy" && <ProxyPage core={core} setCore={setCore} />}
              {page === "cache" && <CachePage core={core} setCore={setCore} />}
              {page === "daemon" && <DaemonPage core={core} setCore={setCore} />}
              {page === "other" && <OtherPage core={core} setCore={setCore} />}
              {page === "interface" && <InterfacePage web={web} setWeb={commitWeb} />}
              {page === "plugins" && (
                <PluginsPage
                  available={available}
                  enabled={enabled}
                  onChange={async (name, on) => {
                    try {
                      await rpc(on ? "web.enable_plugin" : "web.disable_plugin", [name]);
                      setEnabled((cur) =>
                        on ? [...cur, name] : cur.filter((n) => n !== name)
                      );
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Plugin toggle failed");
                    }
                  }}
                />
              )}
              {page === "scheduler" && <SchedulerPage />}
              {page === "extractor" && <ExtractorPage />}
              {page === "execute" && <ExecutePage />}
              {page === "notifications" && <NotificationsPage />}
              {page === "blocklist" && <BlocklistPage />}
              {page === "autoadd" && <AutoAddPage />}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="m-0 rounded-none">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void saveCore()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NavBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full rounded-md px-2 py-1.5 text-left text-sm",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[16rem_1fr] sm:items-center">
      <Label className="text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Str({
  core,
  setCore,
  k,
  label,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
  k: string;
  label: string;
}) {
  return (
    <Field label={label}>
      <Input
        value={String(core[k] ?? "")}
        onChange={(e) => setCore({ ...core, [k]: e.target.value })}
      />
    </Field>
  );
}

function Num({
  core,
  setCore,
  k,
  label,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
  k: string;
  label: string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={String(core[k] ?? 0)}
        onChange={(e) => setCore({ ...core, [k]: Number(e.target.value) })}
      />
    </Field>
  );
}

function Bool({
  core,
  setCore,
  k,
  label,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
  k: string;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={Boolean(core[k])} onCheckedChange={(v) => setCore({ ...core, [k]: v })} />
      {label}
    </label>
  );
}

function DownloadsPage({
  core,
  setCore,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Str core={core} setCore={setCore} k="download_location" label="Download to" />
      <Bool core={core} setCore={setCore} k="move_completed" label="Move completed downloads" />
      <Str core={core} setCore={setCore} k="move_completed_path" label="Move completed to" />
      <Bool core={core} setCore={setCore} k="copy_torrent_file" label="Copy .torrent files" />
      <Str core={core} setCore={setCore} k="torrentfiles_location" label="Copy .torrent to" />
      <Bool core={core} setCore={setCore} k="del_copy_torrent_file" label="Delete copy of torrent file" />
      <Bool core={core} setCore={setCore} k="add_paused" label="Add paused" />
      <Bool core={core} setCore={setCore} k="pre_allocate_storage" label="Pre-allocate disk space" />
      <Bool core={core} setCore={setCore} k="sequential_download" label="Sequential download" />
      <Bool
        core={core}
        setCore={setCore}
        k="prioritize_first_last_pieces"
        label="Prioritize first and last pieces"
      />
    </div>
  );
}

function NetworkPage({
  core,
  setCore,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
}) {
  const ports = (core.listen_ports as [number, number]) || [6881, 6891];
  return (
    <div className="grid gap-3">
      <Field label="Incoming port range">
        <div className="flex gap-2">
          <Input
            type="number"
            value={ports[0]}
            onChange={(e) => setCore({ ...core, listen_ports: [Number(e.target.value), ports[1]] })}
          />
          <Input
            type="number"
            value={ports[1]}
            onChange={(e) => setCore({ ...core, listen_ports: [ports[0], Number(e.target.value)] })}
          />
        </div>
      </Field>
      <Bool core={core} setCore={setCore} k="random_port" label="Use random ports" />
      <Str core={core} setCore={setCore} k="listen_interface" label="Listen interface" />
      <Str core={core} setCore={setCore} k="outgoing_interface" label="Outgoing interface" />
      <Bool core={core} setCore={setCore} k="dht" label="DHT" />
      <Bool core={core} setCore={setCore} k="lsd" label="Local peer discovery (LSD)" />
      <Bool core={core} setCore={setCore} k="utpex" label="Peer exchange (PEX)" />
      <Bool core={core} setCore={setCore} k="upnp" label="UPnP" />
      <Bool core={core} setCore={setCore} k="natpmp" label="NAT-PMP" />
    </div>
  );
}

function BandwidthPage({
  core,
  setCore,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Num core={core} setCore={setCore} k="max_download_speed" label="Max download (KiB/s, −1 ∞)" />
      <Num core={core} setCore={setCore} k="max_upload_speed" label="Max upload (KiB/s, −1 ∞)" />
      <Num
        core={core}
        setCore={setCore}
        k="max_download_speed_per_torrent"
        label="Per-torrent download"
      />
      <Num core={core} setCore={setCore} k="max_upload_speed_per_torrent" label="Per-torrent upload" />
      <Num core={core} setCore={setCore} k="max_connections_global" label="Global connections" />
      <Num core={core} setCore={setCore} k="max_connections_per_torrent" label="Per-torrent connections" />
      <Num core={core} setCore={setCore} k="max_upload_slots_global" label="Global upload slots" />
      <Num core={core} setCore={setCore} k="max_half_open_connections" label="Half-open connections" />
      <Bool core={core} setCore={setCore} k="ignore_limits_on_local_network" label="Ignore limits on LAN" />
      <Bool core={core} setCore={setCore} k="rate_limit_ip_overhead" label="Rate limit IP overhead" />
    </div>
  );
}

function QueuePage({
  core,
  setCore,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Bool core={core} setCore={setCore} k="queue_new_to_top" label="Queue new torrents to top" />
      <Num core={core} setCore={setCore} k="max_active_downloading" label="Active downloading" />
      <Num core={core} setCore={setCore} k="max_active_seeding" label="Active seeding" />
      <Num core={core} setCore={setCore} k="max_active_limit" label="Active total" />
      <Bool core={core} setCore={setCore} k="dont_count_slow_torrents" label="Do not count slow torrents" />
      <Bool core={core} setCore={setCore} k="stop_seed_at_ratio" label="Stop seeding at share ratio" />
      <Num core={core} setCore={setCore} k="stop_seed_ratio" label="Share ratio" />
      <Bool core={core} setCore={setCore} k="remove_seed_at_ratio" label="Remove at share ratio" />
      <Num core={core} setCore={setCore} k="seed_time_limit" label="Seed time limit (minutes)" />
    </div>
  );
}

function ProxyPage({
  core,
  setCore,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
}) {
  const proxy = (core.proxy as Record<string, unknown>) || {};
  function setProxy(next: Record<string, unknown>) {
    setCore({ ...core, proxy: next });
  }
  return (
    <div className="grid gap-3">
      <Field label="Type">
        <Select
          value={String(proxy.type ?? 0)}
          onValueChange={(v) => setProxy({ ...proxy, type: Number(v ?? 0) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">None</SelectItem>
            <SelectItem value="1">SOCKS4</SelectItem>
            <SelectItem value="2">SOCKS5</SelectItem>
            <SelectItem value="3">SOCKS5 + auth</SelectItem>
            <SelectItem value="4">HTTP</SelectItem>
            <SelectItem value="5">HTTP + auth</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Host">
        <Input
          value={String(proxy.hostname ?? "")}
          onChange={(e) => setProxy({ ...proxy, hostname: e.target.value })}
        />
      </Field>
      <Field label="Port">
        <Input
          type="number"
          value={String(proxy.port ?? 8080)}
          onChange={(e) => setProxy({ ...proxy, port: Number(e.target.value) })}
        />
      </Field>
      <Field label="Username">
        <Input
          value={String(proxy.username ?? "")}
          onChange={(e) => setProxy({ ...proxy, username: e.target.value })}
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          value={String(proxy.password ?? "")}
          onChange={(e) => setProxy({ ...proxy, password: e.target.value })}
        />
      </Field>
    </div>
  );
}

function CachePage({
  core,
  setCore,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Num core={core} setCore={setCore} k="cache_size" label="Cache size (16 KiB blocks)" />
      <Num core={core} setCore={setCore} k="cache_expiry" label="Cache expiry (seconds)" />
    </div>
  );
}

function DaemonPage({
  core,
  setCore,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Num core={core} setCore={setCore} k="daemon_port" label="Daemon port" />
      <Bool core={core} setCore={setCore} k="allow_remote" label="Allow remote connections" />
      <Bool core={core} setCore={setCore} k="new_release_check" label="Periodically check for new releases" />
    </div>
  );
}

function OtherPage({
  core,
  setCore,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <Str core={core} setCore={setCore} k="geoip_db_location" label="GeoIP database" />
      <Bool core={core} setCore={setCore} k="autoadd_enable" label="Enable classic autoadd folder" />
      <Str core={core} setCore={setCore} k="autoadd_location" label="Autoadd location" />
    </div>
  );
}

function InterfacePage({
  web,
  setWeb,
}: {
  web: Record<string, unknown>;
  setWeb: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-3">
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={isWebSidebarVisible(web)}
          onCheckedChange={(v) => {
            const next = { ...web, show_sidebar: v, sidebar: v };
            setWeb(next);
            void rpc("web.set_config", [{ show_sidebar: v, sidebar: v }]).catch((err: unknown) => {
              toast.error(err instanceof Error ? err.message : "Could not save sidebar preference");
            });
          }}
        />
        Show sidebar
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={Boolean(web.sidebar_show_zero)}
          onCheckedChange={(v) => setWeb({ ...web, sidebar_show_zero: v })}
        />
        Show filters with zero torrents
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={Boolean(web.show_session_speed ?? true)}
          onCheckedChange={(v) => setWeb({ ...web, show_session_speed: v })}
        />
        Show session speed in status bar
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={Boolean(web.auto_reconnect ?? true)}
          onCheckedChange={(v) => setWeb({ ...web, auto_reconnect: v })}
        />
        Auto-reconnect to daemon
      </label>
    </div>
  );
}

function PluginsPage({
  available,
  enabled,
  onChange,
}: {
  available: string[];
  enabled: string[];
  onChange: (name: string, on: boolean) => void;
}) {
  const set = new Set(enabled);
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">
        Enable plugins to show their preference pages in the sidebar.
      </p>
      {available.map((name) => (
        <label key={name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          {name}
          <Switch checked={set.has(name)} onCheckedChange={(v) => onChange(name, v)} />
        </label>
      ))}
    </div>
  );
}

function SchedulerPage() {
  const [cfg, setCfg] = useState<{
    low_down: number;
    low_up: number;
    low_active: number;
    button_state: number[][];
  } | null>(null);

  useEffect(() => {
    void rpc<typeof cfg>("scheduler.get_config").then(setCfg).catch(() => setCfg(null));
  }, []);

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading scheduler…</p>;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const colors = ["bg-emerald-500/70", "bg-amber-500/80", "bg-red-500/70"];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Low download (KiB/s)">
          <Input
            type="number"
            value={cfg.low_down}
            onChange={(e) => setCfg({ ...cfg, low_down: Number(e.target.value) })}
          />
        </Field>
        <Field label="Low upload (KiB/s)">
          <Input
            type="number"
            value={cfg.low_up}
            onChange={(e) => setCfg({ ...cfg, low_up: Number(e.target.value) })}
          />
        </Field>
        <Field label="Low active torrents">
          <Input
            type="number"
            value={cfg.low_active}
            onChange={(e) => setCfg({ ...cfg, low_active: Number(e.target.value) })}
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Click a cell to cycle Normal → Slow → Pause. Green is normal speed.
      </p>
      <div className="overflow-auto">
        <table className="text-[10px]">
          <thead>
            <tr>
              <th />
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="w-5 font-normal text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d, di) => (
              <tr key={d}>
                <td className="pr-2 text-muted-foreground">{d}</td>
                {cfg.button_state[di]?.map((v, hi) => (
                  <td key={hi}>
                    <button
                      type="button"
                      className={cn("size-4 rounded-sm", colors[v] || colors[0])}
                      onClick={() => {
                        const next = cfg.button_state.map((row) => [...row]);
                        next[di][hi] = ((next[di][hi] ?? 0) + 1) % 3;
                        setCfg({ ...cfg, button_state: next });
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        className="w-fit"
        onClick={() =>
          void rpc("scheduler.set_config", [cfg])
            .then(() => toast.success("Scheduler saved"))
            .catch((e: Error) => toast.error(e.message))
        }
      >
        Save scheduler
      </Button>
    </div>
  );
}

function ExtractorPage() {
  const [cfg, setCfg] = useState({ extract_path: "", use_name_folder: true });
  useEffect(() => {
    void rpc<typeof cfg>("extractor.get_config").then(setCfg);
  }, []);
  return (
    <div className="grid gap-3">
      <Field label="Extract to">
        <Input
          value={cfg.extract_path}
          onChange={(e) => setCfg({ ...cfg, extract_path: e.target.value })}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={cfg.use_name_folder}
          onCheckedChange={(v) => setCfg({ ...cfg, use_name_folder: v })}
        />
        Create folder named after the torrent
      </label>
      <Button
        className="w-fit"
        onClick={() =>
          void rpc("extractor.set_config", [cfg])
            .then(() => toast.success("Extractor saved"))
            .catch((e: Error) => toast.error(e.message))
        }
      >
        Save extractor
      </Button>
    </div>
  );
}

function ExecutePage() {
  const [commands, setCommands] = useState<ExecuteCommand[]>([]);
  const [event, setEvent] = useState("complete");
  const [command, setCommand] = useState("");

  async function load() {
    const rows = await rpc<[string, string, string][]>("execute.get_commands");
    setCommands((rows || []).map(([id, ev, cmd]) => ({ id, event: ev, command: cmd })));
  }
  useEffect(() => {
    void load().catch(() => setCommands([]));
  }, []);

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Run a command when a torrent event fires.</p>
      <ul className="grid gap-2">
        {commands.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>
              <span className="font-medium">{c.event}</span>
              <span className="ml-2 font-mono text-xs text-muted-foreground">{c.command}</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void rpc("execute.remove_command", [c.id]).then(() => void load())
              }
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={event} onValueChange={(v) => { if (v) setEvent(v); }}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="complete">complete</SelectItem>
            <SelectItem value="added">added</SelectItem>
            <SelectItem value="removed">removed</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="/path/to/script.sh"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
        <Button
          onClick={() =>
            void rpc("execute.add_command", [event, event, command]).then(() => {
              setCommand("");
              return load();
            })
          }
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function NotificationsPage() {
  const [cfg, setCfg] = useState<Record<string, unknown>>({});
  useEffect(() => {
    void rpc<Record<string, unknown>>("notifications.get_config").then(setCfg);
  }, []);
  return (
    <div className="grid gap-3">
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={Boolean(cfg.smtp_enabled)}
          onCheckedChange={(v) => setCfg({ ...cfg, smtp_enabled: v })}
        />
        Enable email notifications
      </label>
      <Field label="SMTP host">
        <Input value={String(cfg.smtp_host ?? "")} onChange={(e) => setCfg({ ...cfg, smtp_host: e.target.value })} />
      </Field>
      <Field label="SMTP port">
        <Input
          type="number"
          value={String(cfg.smtp_port ?? 587)}
          onChange={(e) => setCfg({ ...cfg, smtp_port: Number(e.target.value) })}
        />
      </Field>
      <Field label="Username">
        <Input value={String(cfg.smtp_user ?? "")} onChange={(e) => setCfg({ ...cfg, smtp_user: e.target.value })} />
      </Field>
      <Field label="From">
        <Input value={String(cfg.smtp_from ?? "")} onChange={(e) => setCfg({ ...cfg, smtp_from: e.target.value })} />
      </Field>
      <Field label="Recipients">
        <Input
          value={String(cfg.smtp_recipients ?? "")}
          onChange={(e) => setCfg({ ...cfg, smtp_recipients: e.target.value })}
        />
      </Field>
      <Button
        className="w-fit"
        onClick={() =>
          void rpc("notifications.set_config", [cfg])
            .then(() => toast.success("Notifications saved"))
            .catch((e: Error) => toast.error(e.message))
        }
      >
        Save notifications
      </Button>
    </div>
  );
}

function BlocklistPage() {
  const [cfg, setCfg] = useState<Record<string, unknown>>({});
  useEffect(() => {
    void rpc<Record<string, unknown>>("blocklist.get_status").then(setCfg);
  }, []);
  return (
    <div className="grid gap-3">
      <Field label="List URL">
        <Input value={String(cfg.url ?? "")} onChange={(e) => setCfg({ ...cfg, url: e.target.value })} />
      </Field>
      <Field label="Check after (days)">
        <Input
          type="number"
          value={String(cfg.check_after_days ?? 4)}
          onChange={(e) => setCfg({ ...cfg, check_after_days: Number(e.target.value) })}
        />
      </Field>
      <p className="text-sm text-muted-foreground">
        Last update: {String(cfg.last_update ?? "—")} · {String(cfg.size ?? 0)} IPs · blocked{" "}
        {String(cfg.num_blocked ?? 0)} · {String(cfg.state ?? "")}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() =>
            void rpc("blocklist.check_import")
              .then(() => rpc<Record<string, unknown>>("blocklist.get_status"))
              .then(setCfg)
              .then(() => toast.success("Blocklist imported"))
          }
        >
          Check / import now
        </Button>
        <Button
          onClick={() =>
            void rpc("blocklist.set_config", [cfg]).then(() => toast.success("Blocklist saved"))
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function AutoAddPage() {
  const [dirs, setDirs] = useState<Record<string, WatchDir>>({});
  const [path, setPath] = useState("/home/deluge/watch");

  async function load() {
    setDirs((await rpc<Record<string, WatchDir>>("autoadd.get_watchdirs")) || {});
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Watch folders for new .torrent files.</p>
      {Object.values(dirs).map((d) => (
        <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <div>
            <div className="font-medium">{d.path}</div>
            <div className="text-xs text-muted-foreground">
              {d.enabled ? "Enabled" : "Disabled"}
              {d.label ? ` · label ${d.label}` : ""}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void rpc(d.enabled ? "autoadd.disable_watchdir" : "autoadd.enable_watchdir", [d.id]).then(
                  load
                )
              }
            >
              {d.enabled ? "Disable" : "Enable"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void rpc("autoadd.remove", [d.id]).then(load)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={path} onChange={(e) => setPath(e.target.value)} />
        <Button
          onClick={() =>
            void rpc("autoadd.add", [{ path, enabled: true }]).then(() => {
              setPath("");
              return load();
            })
          }
        >
          Add watchdir
        </Button>
      </div>
    </div>
  );
}
