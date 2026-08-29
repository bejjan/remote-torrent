"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { rpc } from "@/lib/deluge/client";
import { asBool, asNumber, asString, cloneConfig, dirtyConfig, isEmptyConfig } from "@/lib/deluge/pref-config";
import { isWebSessionSpeedVisible, isWebSidebarVisible } from "@/lib/deluge/web-config";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "downloads", label: "Downloads" },
  { id: "speed", label: "Speed" },
  { id: "queue", label: "Queue" },
  { id: "network", label: "Network" },
  { id: "interface", label: "Interface" },
];

export function TransmissionPreferences({
  open,
  onOpenChange,
  onWebConfigChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWebConfigChange?: (web: Record<string, unknown>) => void;
}) {
  const [page, setPage] = useState("downloads");
  const [core, setCore] = useState<Record<string, unknown>>({});
  const [coreSaved, setCoreSaved] = useState<Record<string, unknown>>({});
  const [web, setWeb] = useState<Record<string, unknown>>({});
  const [webSaved, setWebSaved] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [c, w] = await Promise.all([
          rpc<Record<string, unknown>>("core.get_config"),
          rpc<Record<string, unknown>>("web.get_config"),
        ]);
        const nextCore = c || {};
        const nextWeb = w || {};
        setCore(nextCore);
        setCoreSaved(cloneConfig(nextCore));
        setWeb(nextWeb);
        setWebSaved(cloneConfig(nextWeb));
        onWebConfigChange?.(nextWeb);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load preferences");
      }
    })();
  }, [open, onWebConfigChange]);

  async function save() {
    try {
      const coreDirty = dirtyConfig(coreSaved, core);
      const webDirty = dirtyConfig(webSaved, web);
      if (!isEmptyConfig(coreDirty)) await rpc("core.set_config", [coreDirty]);
      if (!isEmptyConfig(webDirty)) await rpc("web.set_config", [webDirty]);
      setCoreSaved(cloneConfig(core));
      setWebSaved(cloneConfig(web));
      onWebConfigChange?.(web);
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  function setNum(key: string, value: number) {
    setCore({ ...core, [key]: value });
  }
  function setStr(key: string, value: string) {
    setCore({ ...core, [key]: value });
  }
  function setOn(key: string, value: boolean) {
    setCore({ ...core, [key]: value });
  }

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <nav className="w-44 shrink-0 overflow-x-hidden overflow-y-auto border-r p-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={cn(
                "flex w-full rounded-md px-2 py-1.5 text-left text-sm",
                page === item.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <ScrollArea className="min-w-0 flex-1 overflow-x-hidden">
          <div className="grid min-w-0 gap-6 p-4">
            {page === "downloads" ? (
              <>
                <h3 className="text-base font-medium">Downloads</h3>
                <Field label="Download directory">
                  <Input
                    className="w-full min-w-0 font-mono text-sm"
                    value={asString(core["download-dir"] ?? core.download_location)}
                    onChange={(e) => {
                      setCore({ ...core, "download-dir": e.target.value, download_location: e.target.value });
                    }}
                  />
                </Field>
                <SwitchRow
                  label="Incomplete directory"
                  checked={asBool(core["incomplete-dir-enabled"])}
                  onChange={(v) => setOn("incomplete-dir-enabled", v)}
                />
                <Field label="Incomplete path">
                  <Input
                    className="w-full min-w-0 font-mono text-sm"
                    disabled={!asBool(core["incomplete-dir-enabled"])}
                    value={asString(core["incomplete-dir"])}
                    onChange={(e) => setStr("incomplete-dir", e.target.value)}
                  />
                </Field>
                <SwitchRow
                  label="Start added torrents"
                  checked={core["start-added-torrents"] !== false}
                  onChange={(v) => setOn("start-added-torrents", v)}
                />
                <SwitchRow
                  label="Rename partial files"
                  checked={asBool(core["rename-partial-files"])}
                  onChange={(v) => setOn("rename-partial-files", v)}
                />
              </>
            ) : null}
            {page === "speed" ? (
              <>
                <h3 className="text-base font-medium">Speed</h3>
                <SwitchRow
                  label="Limit download"
                  checked={asBool(core["speed-limit-down-enabled"])}
                  onChange={(v) => setOn("speed-limit-down-enabled", v)}
                />
                <Num
                  label="Download limit"
                  suffix="KiB/s"
                  disabled={!asBool(core["speed-limit-down-enabled"])}
                  value={asNumber(core["speed-limit-down"], 0)}
                  onChange={(v) => setNum("speed-limit-down", v)}
                />
                <SwitchRow
                  label="Limit upload"
                  checked={asBool(core["speed-limit-up-enabled"])}
                  onChange={(v) => setOn("speed-limit-up-enabled", v)}
                />
                <Num
                  label="Upload limit"
                  suffix="KiB/s"
                  disabled={!asBool(core["speed-limit-up-enabled"])}
                  value={asNumber(core["speed-limit-up"], 0)}
                  onChange={(v) => setNum("speed-limit-up", v)}
                />
                <SwitchRow
                  label="Alternative speed limits"
                  checked={asBool(core["alt-speed-enabled"])}
                  onChange={(v) => setOn("alt-speed-enabled", v)}
                />
                <Num
                  label="Alt download"
                  suffix="KiB/s"
                  value={asNumber(core["alt-speed-down"], 0)}
                  onChange={(v) => setNum("alt-speed-down", v)}
                />
                <Num
                  label="Alt upload"
                  suffix="KiB/s"
                  value={asNumber(core["alt-speed-up"], 0)}
                  onChange={(v) => setNum("alt-speed-up", v)}
                />
              </>
            ) : null}
            {page === "queue" ? (
              <>
                <h3 className="text-base font-medium">Queue</h3>
                <SwitchRow
                  label="Download queue"
                  checked={asBool(core["download-queue-enabled"])}
                  onChange={(v) => setOn("download-queue-enabled", v)}
                />
                <Num
                  label="Max active downloads"
                  value={asNumber(core["download-queue-size"], 5)}
                  onChange={(v) => setNum("download-queue-size", v)}
                />
                <SwitchRow
                  label="Seed queue"
                  checked={asBool(core["seed-queue-enabled"])}
                  onChange={(v) => setOn("seed-queue-enabled", v)}
                />
                <Num
                  label="Max active seeds"
                  value={asNumber(core["seed-queue-size"], 5)}
                  onChange={(v) => setNum("seed-queue-size", v)}
                />
                <SwitchRow
                  label="Seed ratio limit"
                  checked={asBool(core["ratio-limit-enabled"])}
                  onChange={(v) => setOn("ratio-limit-enabled", v)}
                />
                <Num
                  label="Ratio"
                  value={asNumber(core["ratio-limit"], 2)}
                  onChange={(v) => setNum("ratio-limit", v)}
                />
                <SwitchRow
                  label="Idle seeding limit"
                  checked={asBool(core["idle-seeding-limit-enabled"])}
                  onChange={(v) => setOn("idle-seeding-limit-enabled", v)}
                />
                <Num
                  label="Idle minutes"
                  suffix="min"
                  value={asNumber(core["idle-seeding-limit"], 30)}
                  onChange={(v) => setNum("idle-seeding-limit", v)}
                />
              </>
            ) : null}
            {page === "network" ? (
              <>
                <h3 className="text-base font-medium">Network</h3>
                <Num
                  label="Peer port"
                  value={asNumber(core["peer-port"], 51413)}
                  onChange={(v) => setNum("peer-port", v)}
                />
                <SwitchRow
                  label="Randomize port on start"
                  checked={asBool(core["peer-port-random-on-start"])}
                  onChange={(v) => setOn("peer-port-random-on-start", v)}
                />
                <SwitchRow
                  label="Port forwarding (UPnP / NAT-PMP)"
                  checked={asBool(core["port-forwarding-enabled"])}
                  onChange={(v) => setOn("port-forwarding-enabled", v)}
                />
                <Num
                  label="Peer limit (global)"
                  value={asNumber(core["peer-limit-global"], 200)}
                  onChange={(v) => setNum("peer-limit-global", v)}
                />
                <Num
                  label="Peer limit (per torrent)"
                  value={asNumber(core["peer-limit-per-torrent"], 60)}
                  onChange={(v) => setNum("peer-limit-per-torrent", v)}
                />
                <SwitchRow
                  label="DHT"
                  checked={core["dht-enabled"] !== false}
                  onChange={(v) => setOn("dht-enabled", v)}
                />
                <SwitchRow
                  label="PEX"
                  checked={core["pex-enabled"] !== false}
                  onChange={(v) => setOn("pex-enabled", v)}
                />
                <SwitchRow
                  label="Local peer discovery"
                  checked={core["lpd-enabled"] !== false}
                  onChange={(v) => setOn("lpd-enabled", v)}
                />
                <SwitchRow
                  label="µTP"
                  checked={core["utp-enabled"] !== false}
                  onChange={(v) => setOn("utp-enabled", v)}
                />
                <Field label="Encryption">
                  <Input
                    className="max-w-40"
                    value={asString(core.encryption) || "preferred"}
                    onChange={(e) => setStr("encryption", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">required, preferred, or tolerated</p>
                </Field>
              </>
            ) : null}
            {page === "interface" ? (
              <>
                <h3 className="text-base font-medium">Interface</h3>
                <SwitchRow
                  label="Show filter sidebar"
                  checked={isWebSidebarVisible(web)}
                  onChange={(v) => {
                    const next = { ...web, show_sidebar: v };
                    setWeb(next);
                    onWebConfigChange?.(next);
                    void rpc("web.set_config", [{ show_sidebar: v }]);
                  }}
                />
                <SwitchRow
                  label="Show session speed"
                  checked={isWebSessionSpeedVisible(web)}
                  onChange={(v) => {
                    const next = { ...web, show_session_speed: v };
                    setWeb(next);
                    onWebConfigChange?.(next);
                    void rpc("web.set_config", [{ show_session_speed: v }]);
                  }}
                />
                <SwitchRow
                  label="Show empty filter rows"
                  checked={asBool(web.sidebar_show_zero)}
                  onChange={(v) => {
                    const next = { ...web, sidebar_show_zero: v };
                    setWeb(next);
                    onWebConfigChange?.(next);
                  }}
                />
              </>
            ) : null}
          </div>
        </ScrollArea>
      </div>
      <div className="flex justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button onClick={() => void save()}>Save</Button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="flex min-w-0 items-center gap-2">
        <Input
          type="number"
          className="max-w-28"
          disabled={disabled}
          value={Number.isFinite(value) ? String(value) : ""}
          onChange={(e) => onChange(asNumber(e.target.value, value))}
        />
        {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked === true} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}
