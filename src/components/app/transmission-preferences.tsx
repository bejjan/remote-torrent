"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrefNavIcon } from "@/components/app/pref-nav-icon";
import {
  PREF_DIALOG_NAV_CLASS,
  PREF_DIALOG_PAGE_CLASS,
  PREF_DIALOG_SPLIT_CLASS,
  PrefNum,
  PrefPage,
  PrefPath,
  PrefSection,
  PrefSwitch,
  prefNavButtonClass,
} from "@/components/app/pref-ui";
import { rpc } from "@/lib/deluge/client";
import { asBool, asNumber, asString, cloneConfig, dirtyConfig, isEmptyConfig } from "@/lib/deluge/pref-config";
import { isWebSessionSpeedVisible, isWebSidebarVisible } from "@/lib/deluge/web-config";

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
      <div className={PREF_DIALOG_SPLIT_CLASS}>
        <nav className={PREF_DIALOG_NAV_CLASS}>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={prefNavButtonClass(page === item.id)}
            >
              <PrefNavIcon pageId={item.id} />
              <span className="min-w-0 truncate">{item.label}</span>
            </button>
          ))}
        </nav>
        <ScrollArea className="min-w-0 flex-1 overflow-x-hidden">
          <div className={PREF_DIALOG_PAGE_CLASS}>
            {page === "downloads" ? (
              <PrefPage title="Downloads" description="Where files are saved and how new torrents start.">
                <PrefSection title="Folders">
                  <PrefPath
                    label="Download directory"
                    mono
                    value={asString(core["download-dir"] ?? core.download_location)}
                    onChange={(value) => {
                      setCore({ ...core, "download-dir": value, download_location: value });
                    }}
                  />
                  <PrefSwitch
                    label="Incomplete directory"
                    description="Keep unfinished files in a separate folder."
                    checked={asBool(core["incomplete-dir-enabled"])}
                    onChange={(v) => setOn("incomplete-dir-enabled", v)}
                  />
                  <PrefPath
                    label="Incomplete path"
                    mono
                    disabled={!asBool(core["incomplete-dir-enabled"])}
                    value={asString(core["incomplete-dir"])}
                    onChange={(value) => setStr("incomplete-dir", value)}
                  />
                </PrefSection>
                <PrefSection title="Options">
                  <PrefSwitch
                    label="Start added torrents"
                    description="Begin downloading as soon as a torrent is added."
                    checked={core["start-added-torrents"] !== false}
                    onChange={(v) => setOn("start-added-torrents", v)}
                  />
                  <PrefSwitch
                    label="Rename partial files"
                    description="Append .part to files that are still downloading."
                    checked={asBool(core["rename-partial-files"])}
                    onChange={(v) => setOn("rename-partial-files", v)}
                  />
                </PrefSection>
              </PrefPage>
            ) : null}
            {page === "speed" ? (
              <PrefPage title="Speed" description="Normal and alternative transfer limits.">
                <PrefSection title="Limits">
                  <PrefSwitch
                    label="Limit download"
                    checked={asBool(core["speed-limit-down-enabled"])}
                    onChange={(v) => setOn("speed-limit-down-enabled", v)}
                  />
                  <PrefNum
                    label="Download limit"
                    suffix="KiB/s"
                    disabled={!asBool(core["speed-limit-down-enabled"])}
                    value={asNumber(core["speed-limit-down"], 0)}
                    onChange={(v) => setNum("speed-limit-down", v)}
                  />
                  <PrefSwitch
                    label="Limit upload"
                    checked={asBool(core["speed-limit-up-enabled"])}
                    onChange={(v) => setOn("speed-limit-up-enabled", v)}
                  />
                  <PrefNum
                    label="Upload limit"
                    suffix="KiB/s"
                    disabled={!asBool(core["speed-limit-up-enabled"])}
                    value={asNumber(core["speed-limit-up"], 0)}
                    onChange={(v) => setNum("speed-limit-up", v)}
                  />
                </PrefSection>
                <PrefSection
                  title="Alternative speeds"
                  description="A second set of limits you can switch to, for example during the day."
                >
                  <PrefSwitch
                    label="Use alternative speeds"
                    checked={asBool(core["alt-speed-enabled"])}
                    onChange={(v) => setOn("alt-speed-enabled", v)}
                  />
                  <PrefNum
                    label="Alt download"
                    suffix="KiB/s"
                    value={asNumber(core["alt-speed-down"], 0)}
                    onChange={(v) => setNum("alt-speed-down", v)}
                  />
                  <PrefNum
                    label="Alt upload"
                    suffix="KiB/s"
                    value={asNumber(core["alt-speed-up"], 0)}
                    onChange={(v) => setNum("alt-speed-up", v)}
                  />
                </PrefSection>
              </PrefPage>
            ) : null}
            {page === "queue" ? (
              <PrefPage title="Queue" description="How many torrents stay active and when seeding stops.">
                <PrefSection title="Downloads">
                  <PrefSwitch
                    label="Download queue"
                    description="Limit how many torrents may download at once."
                    checked={asBool(core["download-queue-enabled"])}
                    onChange={(v) => setOn("download-queue-enabled", v)}
                  />
                  <PrefNum
                    label="Max active downloads"
                    disabled={!asBool(core["download-queue-enabled"])}
                    value={asNumber(core["download-queue-size"], 5)}
                    onChange={(v) => setNum("download-queue-size", v)}
                  />
                </PrefSection>
                <PrefSection title="Seeding">
                  <PrefSwitch
                    label="Seed queue"
                    description="Limit how many torrents may seed at once."
                    checked={asBool(core["seed-queue-enabled"])}
                    onChange={(v) => setOn("seed-queue-enabled", v)}
                  />
                  <PrefNum
                    label="Max active seeds"
                    disabled={!asBool(core["seed-queue-enabled"])}
                    value={asNumber(core["seed-queue-size"], 5)}
                    onChange={(v) => setNum("seed-queue-size", v)}
                  />
                  <PrefSwitch
                    label="Seed ratio limit"
                    description="Stop seeding when a torrent reaches this share ratio."
                    checked={asBool(core["ratio-limit-enabled"])}
                    onChange={(v) => setOn("ratio-limit-enabled", v)}
                  />
                  <PrefNum
                    label="Ratio"
                    disabled={!asBool(core["ratio-limit-enabled"])}
                    value={asNumber(core["ratio-limit"], 2)}
                    onChange={(v) => setNum("ratio-limit", v)}
                  />
                  <PrefSwitch
                    label="Idle seeding limit"
                    description="Stop seeding after a period with no upload activity."
                    checked={asBool(core["idle-seeding-limit-enabled"])}
                    onChange={(v) => setOn("idle-seeding-limit-enabled", v)}
                  />
                  <PrefNum
                    label="Idle minutes"
                    suffix="min"
                    disabled={!asBool(core["idle-seeding-limit-enabled"])}
                    value={asNumber(core["idle-seeding-limit"], 30)}
                    onChange={(v) => setNum("idle-seeding-limit", v)}
                  />
                </PrefSection>
              </PrefPage>
            ) : null}
            {page === "network" ? (
              <PrefPage title="Network" description="Ports, peer limits, and how peers are discovered.">
                <PrefSection title="Port">
                  <PrefNum
                    label="Peer port"
                    value={asNumber(core["peer-port"], 51413)}
                    onChange={(v) => setNum("peer-port", v)}
                  />
                  <PrefSwitch
                    label="Randomize port on start"
                    description="Pick a random incoming port each time Transmission starts."
                    checked={asBool(core["peer-port-random-on-start"])}
                    onChange={(v) => setOn("peer-port-random-on-start", v)}
                  />
                  <PrefSwitch
                    label="Port forwarding"
                    description="Automatically forward the peer port with UPnP or NAT-PMP."
                    checked={asBool(core["port-forwarding-enabled"])}
                    onChange={(v) => setOn("port-forwarding-enabled", v)}
                  />
                </PrefSection>
                <PrefSection title="Peers">
                  <PrefNum
                    label="Peer limit"
                    description="Maximum peers across the whole session."
                    value={asNumber(core["peer-limit-global"], 200)}
                    onChange={(v) => setNum("peer-limit-global", v)}
                  />
                  <PrefNum
                    label="Peers per torrent"
                    value={asNumber(core["peer-limit-per-torrent"], 60)}
                    onChange={(v) => setNum("peer-limit-per-torrent", v)}
                  />
                </PrefSection>
                <PrefSection title="Discovery">
                  <PrefSwitch
                    label="DHT"
                    description="Find peers without a tracker."
                    checked={core["dht-enabled"] !== false}
                    onChange={(v) => setOn("dht-enabled", v)}
                  />
                  <PrefSwitch
                    label="PEX"
                    description="Learn about peers from others in the swarm."
                    checked={core["pex-enabled"] !== false}
                    onChange={(v) => setOn("pex-enabled", v)}
                  />
                  <PrefSwitch
                    label="Local peer discovery"
                    description="Find peers on your local network."
                    checked={core["lpd-enabled"] !== false}
                    onChange={(v) => setOn("lpd-enabled", v)}
                  />
                  <PrefSwitch
                    label="µTP"
                    description="Use the Micro Transport Protocol to reduce impact on other traffic."
                    checked={core["utp-enabled"] !== false}
                    onChange={(v) => setOn("utp-enabled", v)}
                  />
                  <PrefPath
                    label="Encryption"
                    description="required, preferred, or tolerated"
                    value={asString(core.encryption) || "preferred"}
                    onChange={(value) => setStr("encryption", value)}
                  />
                </PrefSection>
              </PrefPage>
            ) : null}
            {page === "interface" ? (
              <PrefPage title="Interface" description="How torro looks while connected to Transmission.">
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
      <div className="flex shrink-0 justify-end gap-2 border-t p-3 sm:p-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button onClick={() => void save()}>Save</Button>
      </div>
    </>
  );
}
