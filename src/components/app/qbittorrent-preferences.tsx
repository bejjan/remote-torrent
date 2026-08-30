"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrefNavIcon } from "@/components/app/pref-nav-icon";
import { PrefNum, PrefPage, PrefPath, PrefSection, PrefSwitch } from "@/components/app/pref-ui";
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

function bytesToKib(value: unknown): number {
  const n = asNumber(value, 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n / 1024;
}

export function QBittorrentPreferences({
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
  function setKibLimit(key: string, kib: number) {
    setNum(key, !Number.isFinite(kib) || kib <= 0 ? 0 : Math.round(kib * 1024));
  }

  const dlEnabled = asNumber(core.dl_limit, 0) > 0;
  const upEnabled = asNumber(core.up_limit, 0) > 0;

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 overflow-x-hidden overflow-y-auto border-r p-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                page === item.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
            >
              <PrefNavIcon pageId={item.id} />
              <span className="min-w-0 truncate">{item.label}</span>
            </button>
          ))}
        </nav>
        <ScrollArea className="min-w-0 flex-1 overflow-x-hidden">
          <div className="min-w-0 px-5 py-5">
            {page === "downloads" ? (
              <PrefPage title="Downloads" description="Where files are saved and how new torrents start.">
                <PrefSection title="Folders">
                  <PrefPath
                    label="Download directory"
                    mono
                    value={asString(core.save_path ?? core.download_location)}
                    onChange={(value) => {
                      setCore({ ...core, save_path: value, download_location: value });
                    }}
                  />
                  <PrefSwitch
                    label="Incomplete directory"
                    description="Keep unfinished files in a separate folder."
                    checked={asBool(core.temp_path_enabled)}
                    onChange={(v) => setOn("temp_path_enabled", v)}
                  />
                  <PrefPath
                    label="Incomplete path"
                    mono
                    disabled={!asBool(core.temp_path_enabled)}
                    value={asString(core.temp_path)}
                    onChange={(value) => setStr("temp_path", value)}
                  />
                </PrefSection>
                <PrefSection title="Options">
                  <PrefSwitch
                    label="Start torrents paused"
                    description="Add new torrents without starting them."
                    checked={asBool(core.start_paused_enabled)}
                    onChange={(v) => setOn("start_paused_enabled", v)}
                  />
                  <PrefSwitch
                    label="Append .!qB to incomplete files"
                    description="Mark files that are still downloading."
                    checked={asBool(core.incomplete_files_ext)}
                    onChange={(v) => setOn("incomplete_files_ext", v)}
                  />
                  <PrefSwitch
                    label="Pre-allocate disk space"
                    description="Reserve the full file size when a torrent is added."
                    checked={asBool(core.preallocate_all)}
                    onChange={(v) => setOn("preallocate_all", v)}
                  />
                </PrefSection>
              </PrefPage>
            ) : null}
            {page === "speed" ? (
              <PrefPage title="Speed" description="Normal and alternative transfer limits.">
                <PrefSection title="Limits">
                  <PrefSwitch
                    label="Limit download"
                    checked={dlEnabled}
                    onChange={(v) => setNum("dl_limit", v ? 2048 * 1024 : 0)}
                  />
                  <PrefNum
                    label="Download limit"
                    suffix="KiB/s"
                    disabled={!dlEnabled}
                    value={bytesToKib(core.dl_limit)}
                    onChange={(v) => setKibLimit("dl_limit", v)}
                  />
                  <PrefSwitch
                    label="Limit upload"
                    checked={upEnabled}
                    onChange={(v) => setNum("up_limit", v ? 512 * 1024 : 0)}
                  />
                  <PrefNum
                    label="Upload limit"
                    suffix="KiB/s"
                    disabled={!upEnabled}
                    value={bytesToKib(core.up_limit)}
                    onChange={(v) => setKibLimit("up_limit", v)}
                  />
                </PrefSection>
                <PrefSection
                  title="Alternative speeds"
                  description="A second set of limits you can switch to, for example during the day."
                >
                  <PrefSwitch
                    label="Enable scheduler"
                    checked={asBool(core.scheduler_enabled)}
                    onChange={(v) => setOn("scheduler_enabled", v)}
                  />
                  <PrefNum
                    label="Alt download"
                    suffix="KiB/s"
                    value={bytesToKib(core.alt_dl_limit)}
                    onChange={(v) => setKibLimit("alt_dl_limit", v)}
                  />
                  <PrefNum
                    label="Alt upload"
                    suffix="KiB/s"
                    value={bytesToKib(core.alt_up_limit)}
                    onChange={(v) => setKibLimit("alt_up_limit", v)}
                  />
                </PrefSection>
              </PrefPage>
            ) : null}
            {page === "queue" ? (
              <PrefPage title="Queue" description="How many torrents stay active and when seeding stops.">
                <PrefSection title="Downloads">
                  <PrefSwitch
                    label="Torrent queueing"
                    description="Limit how many torrents may be active at once."
                    checked={asBool(core.queueing_enabled)}
                    onChange={(v) => setOn("queueing_enabled", v)}
                  />
                  <PrefNum
                    label="Max active downloads"
                    disabled={!asBool(core.queueing_enabled)}
                    value={asNumber(core.max_active_downloads, 5)}
                    onChange={(v) => setNum("max_active_downloads", v)}
                  />
                  <PrefNum
                    label="Max active uploads"
                    disabled={!asBool(core.queueing_enabled)}
                    value={asNumber(core.max_active_uploads, 5)}
                    onChange={(v) => setNum("max_active_uploads", v)}
                  />
                  <PrefNum
                    label="Max active torrents"
                    disabled={!asBool(core.queueing_enabled)}
                    value={asNumber(core.max_active_torrents, 10)}
                    onChange={(v) => setNum("max_active_torrents", v)}
                  />
                </PrefSection>
                <PrefSection title="Seeding">
                  <PrefSwitch
                    label="Share ratio limit"
                    description="Stop seeding when a torrent reaches this share ratio."
                    checked={asBool(core.max_ratio_enabled)}
                    onChange={(v) => setOn("max_ratio_enabled", v)}
                  />
                  <PrefNum
                    label="Ratio"
                    disabled={!asBool(core.max_ratio_enabled)}
                    value={asNumber(core.max_ratio, 2)}
                    onChange={(v) => setNum("max_ratio", v)}
                  />
                  <PrefSwitch
                    label="Seeding time limit"
                    description="Stop seeding after this many minutes."
                    checked={asBool(core.max_seeding_time_enabled)}
                    onChange={(v) => setOn("max_seeding_time_enabled", v)}
                  />
                  <PrefNum
                    label="Seeding minutes"
                    suffix="min"
                    disabled={!asBool(core.max_seeding_time_enabled)}
                    value={asNumber(core.max_seeding_time, 0)}
                    onChange={(v) => setNum("max_seeding_time", v)}
                  />
                </PrefSection>
              </PrefPage>
            ) : null}
            {page === "network" ? (
              <PrefPage title="Network" description="Ports, peer limits, and how peers are discovered.">
                <PrefSection title="Port">
                  <PrefNum
                    label="Listen port"
                    value={asNumber(core.listen_port, 6881)}
                    onChange={(v) => setNum("listen_port", v)}
                  />
                  <PrefSwitch
                    label="Randomize port on start"
                    description="Pick a random incoming port each time qBittorrent starts."
                    checked={asBool(core.random_port)}
                    onChange={(v) => setOn("random_port", v)}
                  />
                  <PrefSwitch
                    label="UPnP / NAT-PMP"
                    description="Automatically forward the listen port."
                    checked={asBool(core.upnp)}
                    onChange={(v) => setOn("upnp", v)}
                  />
                </PrefSection>
                <PrefSection title="Peers">
                  <PrefNum
                    label="Global connection limit"
                    description="Maximum peers across the whole session."
                    value={asNumber(core.max_connec, 500)}
                    onChange={(v) => setNum("max_connec", v)}
                  />
                  <PrefNum
                    label="Connections per torrent"
                    value={asNumber(core.max_connec_per_torrent, 100)}
                    onChange={(v) => setNum("max_connec_per_torrent", v)}
                  />
                </PrefSection>
                <PrefSection title="Discovery">
                  <PrefSwitch
                    label="DHT"
                    description="Find peers without a tracker."
                    checked={core.dht !== false}
                    onChange={(v) => setOn("dht", v)}
                  />
                  <PrefSwitch
                    label="PEX"
                    description="Learn about peers from others in the swarm."
                    checked={core.pex !== false}
                    onChange={(v) => setOn("pex", v)}
                  />
                  <PrefSwitch
                    label="Local peer discovery"
                    description="Find peers on your local network."
                    checked={core.lsd !== false}
                    onChange={(v) => setOn("lsd", v)}
                  />
                  <PrefSwitch
                    label="Anonymous mode"
                    description="Hide identifying client information from trackers."
                    checked={asBool(core.anonymous_mode)}
                    onChange={(v) => setOn("anonymous_mode", v)}
                  />
                  <PrefNum
                    label="Encryption"
                    description="0 prefer, 1 require, 2 disable"
                    value={asNumber(core.encryption, 0)}
                    onChange={(v) => setNum("encryption", v)}
                  />
                </PrefSection>
              </PrefPage>
            ) : null}
            {page === "interface" ? (
              <PrefPage title="Interface" description="How torro looks while connected to qBittorrent.">
                <PrefSection title="Appearance">
                  <PrefSwitch
                    label="Show sidebar"
                    description="Show the filter sidebar on the left."
                    checked={isWebSidebarVisible(web)}
                    onChange={(v) => {
                      const next = { ...web, show_sidebar: v };
                      setWeb(next);
                      onWebConfigChange?.(next);
                      void rpc("web.set_config", [{ show_sidebar: v }]);
                    }}
                  />
                  <PrefSwitch
                    label="Show session speed"
                    description="Show download and upload speed in the title and status bar."
                    checked={isWebSessionSpeedVisible(web)}
                    onChange={(v) => {
                      const next = { ...web, show_session_speed: v };
                      setWeb(next);
                      onWebConfigChange?.(next);
                      void rpc("web.set_config", [{ show_session_speed: v }]);
                    }}
                  />
                  <PrefSwitch
                    label="Show empty filters"
                    description="Keep filter rows visible when they match zero torrents."
                    checked={asBool(web.sidebar_show_zero)}
                    onChange={(v) => {
                      const next = { ...web, sidebar_show_zero: v };
                      setWeb(next);
                      onWebConfigChange?.(next);
                    }}
                  />
                </PrefSection>
              </PrefPage>
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
