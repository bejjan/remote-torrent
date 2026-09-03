"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IntSelect, StringSelect } from "@/components/app/int-select";
import { LabelPrefPage, LtConfigPage, PluginStubPage } from "@/components/app/plugin-pref-pages";
import { ProxyTypeSelect } from "@/components/app/proxy-type-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LARGE_DIALOG_CLASS,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotifyTestButton } from "@/components/app/notify-test-button";
import { PrefNavIcon } from "@/components/app/pref-nav-icon";
import {
  PREF_DIALOG_NAV_CLASS,
  PREF_DIALOG_PAGE_CLASS,
  PREF_DIALOG_SPLIT_CLASS,
  PrefActions,
  PrefNum,
  PrefNumPair,
  PrefPage,
  PrefPath,
  PrefRow,
  PrefSection,
  PrefSwitch,
  prefNavButtonClass,
} from "@/components/app/pref-ui";
import { QBittorrentPreferences } from "@/components/app/qbittorrent-preferences";
import { TransmissionPreferences } from "@/components/app/transmission-preferences";
import { rpc, getStoredClientKind } from "@/lib/deluge/client";
import {
  ENC_LEVEL_OPTIONS,
  ENC_LEVEL_SELECT_ITEMS,
  ENC_POLICY_OPTIONS,
  ENC_POLICY_SELECT_ITEMS,
  canonicalizeEncLevel,
  canonicalizeEncPolicy,
} from "@/lib/deluge/enc-policy";
import {
  LTCONFIG_PAGE_ID,
  isUnknownPluginPage,
  pluginNavItemForPage,
  pluginPrefNavItems,
} from "@/lib/deluge/plugin-pages";
import { PLUGIN_RPC, pluginToggleErrorMessage, pluginToggleMethod } from "@/lib/deluge/plugins";
import {
  asBool,
  asNumber,
  asPortPair,
  asString,
  cloneConfig,
  dirtyConfig,
  hasConfigKey,
  isEmptyConfig,
  proxyRecord,
} from "@/lib/deluge/pref-config";
import type { ExecuteCommand, WatchDir } from "@/lib/deluge/types";
import { isWebSessionSpeedVisible, isWebSidebarVisible } from "@/lib/deluge/web-config";
import {
  WEB_LANGUAGE_METHODS,
  languageFromSelectValue,
  parseWebLanguages,
  selectValueForLanguage,
  webLanguageOptions,
  webLanguageSelectItems,
  type WebLanguage,
} from "@/lib/deluge/web-languages";
import { cn } from "@/lib/utils";

const CORE_NAV_GROUPS: { label: string; pages: { id: string; label: string }[] }[] = [
  { label: "Downloads", pages: [{ id: "downloads", label: "Downloads" }] },
  {
    label: "Network",
    pages: [
      { id: "network", label: "Network" },
      { id: "proxy", label: "Proxy" },
    ],
  },
  {
    label: "Bandwidth",
    pages: [
      { id: "bandwidth", label: "Bandwidth" },
      { id: "queue", label: "Queue" },
    ],
  },
  {
    label: "Daemon",
    pages: [
      { id: "cache", label: "Cache" },
      { id: "daemon", label: "Daemon" },
      { id: "other", label: "Other" },
    ],
  },
  {
    label: "Interface",
    pages: [
      { id: "interface", label: "Interface" },
      { id: "plugins", label: "Plugins" },
    ],
  },
];

async function fetchPluginLists(): Promise<{ available: string[]; enabled: string[] }> {
  try {
    const plugins = await rpc<{ available_plugins?: string[]; enabled_plugins?: string[] }>(
      PLUGIN_RPC.webGetPlugins
    );
    return {
      available: plugins?.available_plugins || [],
      enabled: plugins?.enabled_plugins || [],
    };
  } catch {
    const [available, enabled] = await Promise.all([
      rpc<string[]>(PLUGIN_RPC.getAvailable),
      rpc<string[]>(PLUGIN_RPC.getEnabled),
    ]);
    return { available: available || [], enabled: enabled || [] };
  }
}

async function fetchWebLanguages(): Promise<WebLanguage[] | null> {
  for (const method of WEB_LANGUAGE_METHODS) {
    try {
      const parsed = parseWebLanguages(await rpc<unknown>(method));
      if (parsed) return parsed;
    } catch {
      /* try next method */
    }
  }
  return null;
}

export function PreferencesDialog({
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
  const [web, setWeb] = useState<Record<string, unknown>>({});
  const [coreSaved, setCoreSaved] = useState<Record<string, unknown>>({});
  const [webSaved, setWebSaved] = useState<Record<string, unknown>>({});
  const [available, setAvailable] = useState<string[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [languages, setLanguages] = useState<WebLanguage[] | null>(null);

  function commitWeb(next: Record<string, unknown>) {
    setWeb(next);
    onWebConfigChange?.(next);
  }

  useEffect(() => {
    if (!open) return;
    if (getStoredClientKind() !== "deluge") return;
    void (async () => {
      try {
        const [c, w, plugins, langs] = await Promise.all([
          rpc<Record<string, unknown>>("core.get_config"),
          rpc<Record<string, unknown>>("web.get_config"),
          fetchPluginLists(),
          fetchWebLanguages(),
        ]);
        const nextCore = c || {};
        const nextWeb = w || {};
        setCore(nextCore);
        setCoreSaved(cloneConfig(nextCore));
        setWeb(nextWeb);
        setWebSaved(cloneConfig(nextWeb));
        onWebConfigChange?.(nextWeb);
        setAvailable(plugins.available);
        setEnabled(plugins.enabled);
        setLanguages(langs);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load preferences");
      }
    })();
  }, [open, onWebConfigChange]);

  async function saveCore() {
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

  const pluginNav = pluginPrefNavItems(enabled);
  const currentPlugin = pluginNavItemForPage(pluginNav, page);

  if (typeof window !== "undefined" && getStoredClientKind() === "transmission") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={LARGE_DIALOG_CLASS}>
          <DialogHeader className="shrink-0 border-b p-3 sm:p-4">
            <DialogTitle>Preferences</DialogTitle>
          </DialogHeader>
          <TransmissionPreferences
            open={open}
            onOpenChange={onOpenChange}
            onWebConfigChange={onWebConfigChange}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (typeof window !== "undefined" && getStoredClientKind() === "qbittorrent") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={LARGE_DIALOG_CLASS}>
          <DialogHeader className="shrink-0 border-b p-3 sm:p-4">
            <DialogTitle>Preferences</DialogTitle>
          </DialogHeader>
          <QBittorrentPreferences
            open={open}
            onOpenChange={onOpenChange}
            onWebConfigChange={onWebConfigChange}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={LARGE_DIALOG_CLASS}>
        <DialogHeader className="shrink-0 border-b p-3 sm:p-4">
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>
        <div className={PREF_DIALOG_SPLIT_CLASS}>
          <nav className={PREF_DIALOG_NAV_CLASS}>
            {CORE_NAV_GROUPS.map((group) => (
              <NavGroup
                key={group.label}
                title={group.label}
                hideTitle={group.pages.length === 1 && group.pages[0]?.label === group.label}
              >
                {group.pages.map((p) => (
                  <NavBtn key={p.id} pageId={p.id} active={page === p.id} onClick={() => setPage(p.id)}>
                    {p.label}
                  </NavBtn>
                ))}
              </NavGroup>
            ))}
            {pluginNav.length > 0 ? (
              <NavGroup title="Plugins">
                {pluginNav.map((p) => (
                  <NavBtn key={p.id} pageId={p.id} active={page === p.id} onClick={() => setPage(p.id)}>
                    {p.label}
                  </NavBtn>
                ))}
              </NavGroup>
            ) : null}
          </nav>
          <ScrollArea className="min-w-0 flex-1 overflow-x-hidden">
            <div className={PREF_DIALOG_PAGE_CLASS}>
              {page === "downloads" && <DownloadsPage core={core} setCore={setCore} />}
              {page === "network" && <NetworkPage core={core} setCore={setCore} />}
              {page === "bandwidth" && <BandwidthPage core={core} setCore={setCore} />}
              {page === "queue" && <QueuePage core={core} setCore={setCore} />}
              {page === "proxy" && <ProxyPage core={core} setCore={setCore} />}
              {page === "cache" && <CachePage core={core} setCore={setCore} />}
              {page === "daemon" && <DaemonPage core={core} setCore={setCore} />}
              {page === "other" && <OtherPage core={core} setCore={setCore} />}
              {page === "interface" && (
                <InterfacePage
                  web={web}
                  setWeb={commitWeb}
                  languages={languages}
                  onImmediateSave={(patch) => {
                    setWebSaved((prev) => ({ ...prev, ...patch }));
                  }}
                />
              )}
              {page === "plugins" && (
                <PluginsPage
                  available={available}
                  enabled={enabled}
                  onChange={async (name, on) => {
                    const method = pluginToggleMethod(on);
                    try {
                      await rpc(method, [name]);
                      const lists = await fetchPluginLists();
                      setAvailable(lists.available);
                      setEnabled(lists.enabled);
                      if (!on && !pluginPrefNavItems(lists.enabled).some((item) => item.id === page)) {
                        setPage("plugins");
                      }
                    } catch (err) {
                      toast.error(pluginToggleErrorMessage(method, err));
                    }
                  }}
                />
              )}
              {page === "label" && <LabelPrefPage />}
              {page === "scheduler" && <SchedulerPage />}
              {page === "extractor" && <ExtractorPage />}
              {page === "execute" && <ExecutePage />}
              {page === "notifications" && <NotificationsPage />}
              {page === "blocklist" && <BlocklistPage />}
              {page === "autoadd" && <AutoAddPage />}
              {page === LTCONFIG_PAGE_ID && currentPlugin && (
                <LtConfigPage pluginName={currentPlugin.plugin} core={core} setCore={setCore} />
              )}
              {isUnknownPluginPage(page) && currentPlugin && (
                <PluginStubPage name={currentPlugin.plugin} core={core} setCore={setCore} />
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="m-0 shrink-0 rounded-none p-3 sm:p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void saveCore()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NavGroup({
  title,
  hideTitle,
  children,
}: {
  title: string;
  hideTitle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-row gap-1 sm:mb-2 sm:block">
      {hideTitle ? null : (
        <p className="mb-1 hidden px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase sm:block">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function NavBtn({
  pageId,
  active,
  onClick,
  children,
}: {
  pageId: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={prefNavButtonClass(active)}
    >
      <PrefNavIcon pageId={pageId} />
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

function PrefFieldset({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <PrefSection title={title} description={hint}>
      {children}
    </PrefSection>
  );
}

function PathField({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <PrefPath label={label} description={hint} value={value} disabled={disabled} onChange={onChange} />
  );
}

function NumField({
  label,
  value,
  onChange,
  suffix,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <PrefNum
      label={label}
      description={hint}
      value={value}
      suffix={suffix}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return <PrefSwitch label={label} description={hint} checked={checked} onChange={onChange} />;
}

function CoreSwitch({
  core,
  setCore,
  k,
  label,
  hint,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
  k: string;
  label: string;
  hint?: string;
}) {
  return (
    <SwitchRow
      label={label}
      hint={hint}
      checked={asBool(core[k])}
      onChange={(v) => setCore({ ...core, [k]: v })}
    />
  );
}

function CorePath({
  core,
  setCore,
  k,
  label,
  disabled,
  hint,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
  k: string;
  label: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <PathField
      label={label}
      hint={hint}
      value={asString(core[k])}
      disabled={disabled}
      onChange={(v) => setCore({ ...core, [k]: v })}
    />
  );
}

function CoreNum({
  core,
  setCore,
  k,
  label,
  suffix,
  hint,
  disabled,
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
  k: string;
  label: string;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <NumField
      label={label}
      value={asNumber(core[k])}
      suffix={suffix}
      hint={hint}
      disabled={disabled}
      onChange={(v) => setCore({ ...core, [k]: v })}
    />
  );
}

type CoreProps = {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
};

function DownloadsPage({ core, setCore }: CoreProps) {
  return (
    <PrefPage title="Downloads" description="Where files are saved and how new torrents start.">
      <PrefFieldset title="Folders">
        <CorePath core={core} setCore={setCore} k="download_location" label="Download to" />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="move_completed"
          label="Move completed downloads"
          hint="Move files to another folder when a torrent finishes."
        />
        <CorePath
          core={core}
          setCore={setCore}
          k="move_completed_path"
          label="Move completed to"
          disabled={!asBool(core.move_completed)}
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="copy_torrent_file"
          label="Copy .torrent files"
          hint="Keep a copy of each added .torrent file."
        />
        <CorePath
          core={core}
          setCore={setCore}
          k="torrentfiles_location"
          label="Copy .torrent files to"
          disabled={!asBool(core.copy_torrent_file)}
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="del_copy_torrent_file"
          label="Delete copy of torrent file"
          hint="Remove the copied .torrent after the download completes."
        />
      </PrefFieldset>
      <PrefFieldset title="Options">
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="add_paused"
          label="Add torrents in paused state"
          hint="Newly added torrents wait until you start them."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="sequential_download"
          label="Sequential download"
          hint="Download pieces in order, useful for playing media while downloading."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="prioritize_first_last_pieces"
          label="Prioritize first and last pieces"
          hint="Fetch the start and end of files first so media can play sooner."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="pre_allocate_storage"
          label="Pre-allocate disk space"
          hint="Reserve the full file size on disk before downloading."
        />
        {hasConfigKey(core, "compact_allocation") ? (
          <CoreSwitch
            core={core}
            setCore={setCore}
            k="compact_allocation"
            label="Compact allocation"
            hint="Legacy sparse allocation used by older daemons."
          />
        ) : null}
      </PrefFieldset>
    </PrefPage>
  );
}

function NetworkPage({ core, setCore }: CoreProps) {
  const listen = asPortPair(core.listen_ports, [6881, 6891]);
  const outgoing = asPortPair(core.outgoing_ports, [0, 0]);
  const randomListen = asBool(core.random_port);
  const randomOutgoing = asBool(core.random_outgoing_ports);
  return (
    <PrefPage title="Network" description="Ports, encryption, and how peers are discovered.">
      <PrefFieldset title="Incoming">
        <CorePath
          core={core}
          setCore={setCore}
          k="listen_interface"
          label="Listen interface"
          hint="Network interface or IP to accept incoming connections on. Leave empty for all."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="random_port"
          label="Use random port"
          hint="Pick a random incoming port each time the daemon starts."
        />
        <PrefNumPair
          label="Port range"
          from={listen[0]}
          to={listen[1]}
          disabled={randomListen}
          onFrom={(v) => setCore({ ...core, listen_ports: [v, listen[1]] })}
          onTo={(v) => setCore({ ...core, listen_ports: [listen[0], v] })}
        />
      </PrefFieldset>
      <PrefFieldset title="Outgoing">
        <CorePath
          core={core}
          setCore={setCore}
          k="outgoing_interface"
          label="Outgoing interface"
          hint="Network interface used for outgoing connections. Leave empty for the default."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="random_outgoing_ports"
          label="Use random ports"
          hint="Let the daemon choose outgoing ports automatically."
        />
        <PrefNumPair
          label="Port range"
          from={outgoing[0]}
          to={outgoing[1]}
          disabled={randomOutgoing}
          onFrom={(v) => setCore({ ...core, outgoing_ports: [v, outgoing[1]] })}
          onTo={(v) => setCore({ ...core, outgoing_ports: [outgoing[0], v] })}
        />
      </PrefFieldset>
      <PrefFieldset title="Encryption">
        <PrefRow
          label="Incoming"
          description="How incoming peer connections should be encrypted."
        >
          <IntSelect
            value={canonicalizeEncPolicy(asNumber(core.enc_in_policy, 1))}
            onChange={(v) => setCore({ ...core, enc_in_policy: v })}
            options={ENC_POLICY_OPTIONS}
            items={ENC_POLICY_SELECT_ITEMS}
          />
        </PrefRow>
        <PrefRow
          label="Outgoing"
          description="How outgoing peer connections should be encrypted."
        >
          <IntSelect
            value={canonicalizeEncPolicy(asNumber(core.enc_out_policy, 1))}
            onChange={(v) => setCore({ ...core, enc_out_policy: v })}
            options={ENC_POLICY_OPTIONS}
            items={ENC_POLICY_SELECT_ITEMS}
          />
        </PrefRow>
        <PrefRow label="Level" description="How much of the stream is encrypted.">
          <IntSelect
            value={canonicalizeEncLevel(asNumber(core.enc_level, 2))}
            onChange={(v) => setCore({ ...core, enc_level: v })}
            options={ENC_LEVEL_OPTIONS}
            items={ENC_LEVEL_SELECT_ITEMS}
          />
        </PrefRow>
      </PrefFieldset>
      <PrefFieldset title="Discovery">
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="dht"
          label="DHT"
          hint="Find peers without a tracker."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="lsd"
          label="Local peer discovery"
          hint="Find peers on your local network (LSD)."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="utpex"
          label="Peer exchange"
          hint="Learn about peers from others in the swarm (PEX)."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="upnp"
          label="UPnP"
          hint="Automatically forward ports on compatible routers."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="natpmp"
          label="NAT-PMP"
          hint="Forward ports using NAT-PMP or PCP."
        />
        {hasConfigKey(core, "utp") ? (
          <CoreSwitch
            core={core}
            setCore={setCore}
            k="utp"
            label="µTP"
            hint="Use the Micro Transport Protocol to reduce impact on other traffic."
          />
        ) : null}
        {hasConfigKey(core, "enable_outgoing_utp") ? (
          <CoreSwitch core={core} setCore={setCore} k="enable_outgoing_utp" label="Outgoing µTP" />
        ) : null}
        {hasConfigKey(core, "enable_incoming_utp") ? (
          <CoreSwitch core={core} setCore={setCore} k="enable_incoming_utp" label="Incoming µTP" />
        ) : null}
      </PrefFieldset>
      {hasConfigKey(core, "peer_tos") ? (
        <PrefFieldset title="Type of service">
          <PathField
            label="Peer TOS byte"
            hint="Hexadecimal, for example 0x00."
            value={asString(core.peer_tos)}
            onChange={(v) => setCore({ ...core, peer_tos: v })}
          />
        </PrefFieldset>
      ) : null}
    </PrefPage>
  );
}

function BandwidthPage({ core, setCore }: CoreProps) {
  const perTorrent =
    hasConfigKey(core, "max_download_speed_per_torrent") ||
    hasConfigKey(core, "max_upload_speed_per_torrent") ||
    hasConfigKey(core, "max_connections_per_torrent") ||
    hasConfigKey(core, "max_upload_slots_per_torrent");
  return (
    <PrefPage title="Bandwidth" description="Speed and connection limits. Use −1 for unlimited.">
      <PrefFieldset title="Global limits" hint="Applies to the whole session. −1 is unlimited.">
        <CoreNum
          core={core}
          setCore={setCore}
          k="max_download_speed"
          label="Maximum download"
          suffix="KiB/s"
        />
        <CoreNum
          core={core}
          setCore={setCore}
          k="max_upload_speed"
          label="Maximum upload"
          suffix="KiB/s"
        />
        <CoreNum core={core} setCore={setCore} k="max_connections_global" label="Maximum connections" />
        <CoreNum core={core} setCore={setCore} k="max_upload_slots_global" label="Maximum upload slots" />
        <CoreNum
          core={core}
          setCore={setCore}
          k="max_half_open_connections"
          label="Half-open connections"
          hint="Connections that have started but not finished the handshake."
        />
        {hasConfigKey(core, "max_connections_per_second") ? (
          <CoreNum
            core={core}
            setCore={setCore}
            k="max_connections_per_second"
            label="Connection attempts per second"
          />
        ) : null}
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="ignore_limits_on_local_network"
          label="Ignore limits on local network"
          hint="Do not apply speed limits to peers on the same LAN."
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="rate_limit_ip_overhead"
          label="Rate limit IP overhead"
          hint="Count protocol overhead toward the rate limits."
        />
      </PrefFieldset>
      {perTorrent ? (
        <PrefFieldset title="Per torrent" hint="Defaults for new torrents. −1 is unlimited.">
          {hasConfigKey(core, "max_download_speed_per_torrent") ? (
            <CoreNum
              core={core}
              setCore={setCore}
              k="max_download_speed_per_torrent"
              label="Maximum download"
              suffix="KiB/s"
            />
          ) : null}
          {hasConfigKey(core, "max_upload_speed_per_torrent") ? (
            <CoreNum
              core={core}
              setCore={setCore}
              k="max_upload_speed_per_torrent"
              label="Maximum upload"
              suffix="KiB/s"
            />
          ) : null}
          {hasConfigKey(core, "max_connections_per_torrent") ? (
            <CoreNum
              core={core}
              setCore={setCore}
              k="max_connections_per_torrent"
              label="Maximum connections"
            />
          ) : null}
          {hasConfigKey(core, "max_upload_slots_per_torrent") ? (
            <CoreNum
              core={core}
              setCore={setCore}
              k="max_upload_slots_per_torrent"
              label="Maximum upload slots"
            />
          ) : null}
        </PrefFieldset>
      ) : null}
    </PrefPage>
  );
}

function QueuePage({ core, setCore }: CoreProps) {
  const stopAtRatio = asBool(core.stop_seed_at_ratio);
  return (
    <PrefPage title="Queue" description="How many torrents stay active and when seeding stops.">
      <PrefFieldset title="New torrents">
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="queue_new_to_top"
          label="Queue to top"
          hint="Place newly added torrents at the front of the queue."
        />
      </PrefFieldset>
      <PrefFieldset title="Active torrents" hint="How many torrents may run at once. −1 is unlimited.">
        <CoreNum core={core} setCore={setCore} k="max_active_limit" label="Total active" />
        <CoreNum core={core} setCore={setCore} k="max_active_downloading" label="Downloading" />
        <CoreNum core={core} setCore={setCore} k="max_active_seeding" label="Seeding" />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="dont_count_slow_torrents"
          label="Do not count slow torrents"
          hint="Slow torrents do not count against the active limits."
        />
        {hasConfigKey(core, "auto_manage_prefer_seeds") ? (
          <CoreSwitch
            core={core}
            setCore={setCore}
            k="auto_manage_prefer_seeds"
            label="Prefer seeding torrents"
            hint="Keep seeders active ahead of downloaders when rotating the queue."
          />
        ) : null}
      </PrefFieldset>
      <PrefFieldset title="Seeding rotation" hint="Share and time limits used to rotate seeders. −1 is unlimited.">
        {hasConfigKey(core, "share_ratio_limit") ? (
          <CoreNum core={core} setCore={setCore} k="share_ratio_limit" label="Share ratio" />
        ) : null}
        {hasConfigKey(core, "seed_time_ratio_limit") ? (
          <CoreNum core={core} setCore={setCore} k="seed_time_ratio_limit" label="Time ratio" />
        ) : null}
        <CoreNum core={core} setCore={setCore} k="seed_time_limit" label="Seed time" suffix="minutes" />
      </PrefFieldset>
      <PrefFieldset title="Share ratio reached">
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="stop_seed_at_ratio"
          label="Stop seeding at share ratio"
          hint="Pause seeding when the torrent reaches the ratio below."
        />
        <CoreNum
          core={core}
          setCore={setCore}
          k="stop_seed_ratio"
          label="Share ratio"
          disabled={!stopAtRatio}
        />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="remove_seed_at_ratio"
          label="Remove torrent at share ratio"
          hint="Remove the torrent from the list when the share ratio is reached."
        />
      </PrefFieldset>
    </PrefPage>
  );
}

function ProxyPage({ core, setCore }: CoreProps) {
  const proxy = proxyRecord(core);
  function setProxy(next: Record<string, unknown>) {
    setCore({ ...core, proxy: next });
  }
  return (
    <PrefPage title="Proxy" description="Route daemon traffic through a SOCKS or HTTP proxy.">
      <PrefFieldset title="Server">
        <PrefRow label="Type">
          <ProxyTypeSelect
            value={asNumber(proxy.type, 0)}
            onChange={(type) => setProxy({ ...proxy, type })}
            className="w-full min-w-0 max-w-56"
          />
        </PrefRow>
        <PathField
          label="Host"
          value={asString(proxy.hostname)}
          onChange={(hostname) => setProxy({ ...proxy, hostname })}
        />
        <NumField
          label="Port"
          value={asNumber(proxy.port, 8080)}
          onChange={(port) => setProxy({ ...proxy, port })}
        />
        <PathField
          label="Username"
          value={asString(proxy.username)}
          onChange={(username) => setProxy({ ...proxy, username })}
        />
        <PrefPath
          label="Password"
          type="password"
          value={asString(proxy.password)}
          onChange={(password) => setProxy({ ...proxy, password })}
        />
      </PrefFieldset>
      <PrefFieldset title="Use proxy for">
        {hasConfigKey(proxy, "proxy_hostnames") ? (
          <SwitchRow
            label="Hostname lookup"
            hint="Resolve DNS through the proxy."
            checked={asBool(proxy.proxy_hostnames)}
            onChange={(v) => setProxy({ ...proxy, proxy_hostnames: v })}
          />
        ) : null}
        {hasConfigKey(proxy, "proxy_peer_connections") ? (
          <SwitchRow
            label="Peer connections"
            checked={asBool(proxy.proxy_peer_connections)}
            onChange={(v) => setProxy({ ...proxy, proxy_peer_connections: v })}
          />
        ) : null}
        {hasConfigKey(proxy, "proxy_dht") || hasConfigKey(proxy, "proxy_dht_connections") ? (
          <SwitchRow
            label="DHT"
            checked={asBool(proxy.proxy_dht ?? proxy.proxy_dht_connections)}
            onChange={(v) =>
              setProxy({
                ...proxy,
                ...(hasConfigKey(proxy, "proxy_dht") ? { proxy_dht: v } : { proxy_dht_connections: v }),
              })
            }
          />
        ) : null}
        {hasConfigKey(proxy, "proxy_tracker_connections") ? (
          <SwitchRow
            label="Tracker connections"
            checked={asBool(proxy.proxy_tracker_connections)}
            onChange={(v) => setProxy({ ...proxy, proxy_tracker_connections: v })}
          />
        ) : null}
        {hasConfigKey(proxy, "force_proxy") ? (
          <SwitchRow
            label="Force use of proxy"
            hint="Block connections that cannot go through the proxy."
            checked={asBool(proxy.force_proxy)}
            onChange={(v) => setProxy({ ...proxy, force_proxy: v })}
          />
        ) : null}
        {hasConfigKey(proxy, "anonymous_mode") ? (
          <SwitchRow
            label="Hide client identity"
            hint="Avoid sending identifying client information."
            checked={asBool(proxy.anonymous_mode)}
            onChange={(v) => setProxy({ ...proxy, anonymous_mode: v })}
          />
        ) : null}
      </PrefFieldset>
    </PrefPage>
  );
}

function CachePage({ core, setCore }: CoreProps) {
  return (
    <PrefPage title="Cache" description="Disk cache used by the libtorrent session.">
      <PrefFieldset title="Settings">
        <CoreNum
          core={core}
          setCore={setCore}
          k="cache_size"
          label="Cache size"
          suffix="blocks"
          hint="Each block is 16 KiB."
        />
        <CoreNum core={core} setCore={setCore} k="cache_expiry" label="Cache expiry" suffix="seconds" />
      </PrefFieldset>
    </PrefPage>
  );
}

function DaemonPage({ core, setCore }: CoreProps) {
  return (
    <PrefPage title="Daemon" description="How the Deluge daemon listens and who may connect.">
      <PrefFieldset title="Listening">
        <CoreNum core={core} setCore={setCore} k="daemon_port" label="Daemon port" />
      </PrefFieldset>
      <PrefFieldset title="Access">
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="allow_remote"
          label="Allow remote connections"
          hint="Let other machines connect to this daemon."
        />
      </PrefFieldset>
      <PrefFieldset title="Updates">
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="new_release_check"
          label="Check for new releases"
          hint="Periodically look for a newer Deluge version."
        />
      </PrefFieldset>
    </PrefPage>
  );
}

function OtherPage({ core, setCore }: CoreProps) {
  return (
    <PrefPage title="Other" description="Less common daemon options.">
      {hasConfigKey(core, "geoip_db_location") ? (
        <PrefFieldset title="GeoIP database">
          <CorePath
            core={core}
            setCore={setCore}
            k="geoip_db_location"
            label="Database path"
            hint="Used to show peer countries in the inspector."
          />
        </PrefFieldset>
      ) : null}
      {hasConfigKey(core, "announce_ip") ? (
        <PrefFieldset title="Announce IP">
          <CorePath
            core={core}
            setCore={setCore}
            k="announce_ip"
            label="IP address"
            hint="Override the IP address announced to trackers."
          />
        </PrefFieldset>
      ) : null}
      {hasConfigKey(core, "send_info") ? (
        <PrefFieldset title="Privacy">
          <CoreSwitch
            core={core}
            setCore={setCore}
            k="send_info"
            label="Send anonymous statistics"
            hint="Python version, OS, and processor type only."
          />
        </PrefFieldset>
      ) : null}
      {hasConfigKey(core, "autoadd_enable") || hasConfigKey(core, "autoadd_location") ? (
        <PrefFieldset title="Classic autoadd">
          {hasConfigKey(core, "autoadd_enable") ? (
            <CoreSwitch
              core={core}
              setCore={setCore}
              k="autoadd_enable"
              label="Watch a folder for .torrent files"
              hint="Older built-in watch folder. Prefer the AutoAdd plugin when available."
            />
          ) : null}
          {hasConfigKey(core, "autoadd_location") ? (
            <CorePath
              core={core}
              setCore={setCore}
              k="autoadd_location"
              label="Watch folder"
              disabled={hasConfigKey(core, "autoadd_enable") && !asBool(core.autoadd_enable)}
            />
          ) : null}
        </PrefFieldset>
      ) : null}
      {hasConfigKey(core, "announce_to_all_tiers") ? (
        <PrefFieldset title="Trackers">
          <CoreSwitch
            core={core}
            setCore={setCore}
            k="announce_to_all_tiers"
            label="Announce to all tracker tiers"
            hint="Contact every tracker tier instead of stopping at the first working one."
          />
        </PrefFieldset>
      ) : null}
    </PrefPage>
  );
}

function InterfacePage({
  web,
  setWeb,
  languages,
  onImmediateSave,
}: {
  web: Record<string, unknown>;
  setWeb: (c: Record<string, unknown>) => void;
  languages: WebLanguage[] | null;
  onImmediateSave: (patch: Record<string, unknown>) => void;
}) {
  const languageOptions = webLanguageOptions(languages);
  return (
    <PrefPage title="Interface" description="How torro looks and how it talks to the daemon.">
      <PrefFieldset title="Appearance">
        <SwitchRow
          label="Show sidebar"
          hint="Show the filter sidebar on the left."
          checked={isWebSidebarVisible(web)}
          onChange={(v) => {
            const patch = { show_sidebar: v, sidebar: v };
            setWeb({ ...web, ...patch });
            void rpc("web.set_config", [patch])
              .then(() => onImmediateSave(patch))
              .catch((err: unknown) => {
                toast.error(err instanceof Error ? err.message : "Could not save sidebar preference");
              });
          }}
        />
        <SwitchRow
          label="Show empty filters"
          hint="Keep filter rows visible when they match zero torrents."
          checked={asBool(web.sidebar_show_zero)}
          onChange={(v) => setWeb({ ...web, sidebar_show_zero: v })}
        />
        <SwitchRow
          label="Show session speed"
          hint="Show download and upload speed in the title and status bar."
          checked={isWebSessionSpeedVisible(web)}
          onChange={(v) => {
            const patch = { show_session_speed: v };
            setWeb({ ...web, ...patch });
            void rpc("web.set_config", [patch])
              .then(() => onImmediateSave(patch))
              .catch((err: unknown) => {
                toast.error(
                  err instanceof Error ? err.message : "Could not save session speed preference"
                );
              });
          }}
        />
        {hasConfigKey(web, "sidebar_multiple_filters") ? (
          <SwitchRow
            label="Allow multiple filters"
            hint="Combine more than one filter at a time."
            checked={asBool(web.sidebar_multiple_filters)}
            onChange={(v) => setWeb({ ...web, sidebar_multiple_filters: v })}
          />
        ) : null}
      </PrefFieldset>
      <PrefFieldset
        title="Browser notifications"
        hint="Shown when a download you marked finishes. Use Test to fire the same watcher without waiting for a real file."
      >
        <PrefRow
          label="Test notification"
          description="Asks for permission if needed, then simulates a finished torrent."
        >
          <NotifyTestButton variant="outline" size="sm" />
        </PrefRow>
      </PrefFieldset>
      {hasConfigKey(web, "auto_reconnect") ? (
        <PrefFieldset title="Connection">
          <SwitchRow
            label="Auto-reconnect"
            hint="Reconnect automatically if the daemon drops."
            checked={asBool(web.auto_reconnect ?? true)}
            onChange={(v) => setWeb({ ...web, auto_reconnect: v })}
          />
        </PrefFieldset>
      ) : null}
      {languages ? (
        <PrefFieldset title="Language">
          <PrefRow label="Language" description="Language used by the Deluge web UI.">
            <StringSelect
              value={selectValueForLanguage(asString(web.language))}
              onChange={(value) => setWeb({ ...web, language: languageFromSelectValue(value) })}
              options={languageOptions}
              items={webLanguageSelectItems(languages)}
            />
          </PrefRow>
        </PrefFieldset>
      ) : null}
      {hasConfigKey(web, "https") || hasConfigKey(web, "port") || hasConfigKey(web, "base") ? (
        <PrefFieldset title="Web server">
          {hasConfigKey(web, "port") ? (
            <NumField
              label="Port"
              value={asNumber(web.port)}
              onChange={(port) => setWeb({ ...web, port })}
            />
          ) : null}
          {hasConfigKey(web, "base") ? (
            <PathField
              label="Base path"
              hint="URL prefix if the UI is served under a subpath."
              value={asString(web.base)}
              onChange={(base) => setWeb({ ...web, base })}
            />
          ) : null}
          {hasConfigKey(web, "https") ? (
            <SwitchRow
              label="HTTPS"
              hint="Serve the web UI over TLS."
              checked={asBool(web.https)}
              onChange={(v) => setWeb({ ...web, https: v })}
            />
          ) : null}
        </PrefFieldset>
      ) : null}
    </PrefPage>
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
  const set = new Set(enabled.map((name) => name.toLowerCase()));
  return (
    <PrefPage
      title="Plugins"
      description="Enable plugins to show their preference pages in the sidebar."
    >
      <PrefFieldset title="Installed">
        {available.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-muted-foreground">No plugins reported by the daemon.</p>
        ) : (
          available.map((name) => (
            <PrefSwitch
              key={name}
              label={name}
              checked={set.has(name.toLowerCase())}
              onChange={(on) => onChange(name, on)}
            />
          ))
        )}
      </PrefFieldset>
    </PrefPage>
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
    <PrefPage title="Scheduler" description="Limit bandwidth on a weekly schedule.">
      <PrefFieldset title="Slow period" hint="Used during hours marked Slow.">
        <PrefNum
          label="Download"
          suffix="KiB/s"
          value={cfg.low_down}
          onChange={(low_down) => setCfg({ ...cfg, low_down })}
        />
        <PrefNum
          label="Upload"
          suffix="KiB/s"
          value={cfg.low_up}
          onChange={(low_up) => setCfg({ ...cfg, low_up })}
        />
        <PrefNum
          label="Active torrents"
          value={cfg.low_active}
          onChange={(low_active) => setCfg({ ...cfg, low_active })}
        />
      </PrefFieldset>
      <PrefFieldset
        title="Weekly schedule"
        hint="Click a cell to cycle Normal → Slow → Pause. Green is normal speed."
      >
        <div className="overflow-auto px-3 py-3">
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
      </PrefFieldset>
      <PrefActions>
        <Button
          onClick={() =>
            void rpc("scheduler.set_config", [cfg])
              .then(() => toast.success("Scheduler saved"))
              .catch((e: Error) => toast.error(e.message))
          }
        >
          Save scheduler
        </Button>
      </PrefActions>
    </PrefPage>
  );
}

function ExtractorPage() {
  const [cfg, setCfg] = useState({ extract_path: "", use_name_folder: true });
  useEffect(() => {
    void rpc<typeof cfg>("extractor.get_config").then(setCfg);
  }, []);
  return (
    <PrefPage title="Extractor" description="Unpack archives after a torrent finishes.">
      <PrefFieldset title="Extraction">
        <PathField
          label="Extract to"
          value={cfg.extract_path}
          onChange={(extract_path) => setCfg({ ...cfg, extract_path })}
        />
        <SwitchRow
          label="Create a folder for each torrent"
          hint="Extract into a folder named after the torrent."
          checked={cfg.use_name_folder === true}
          onChange={(use_name_folder) => setCfg({ ...cfg, use_name_folder })}
        />
      </PrefFieldset>
      <PrefActions>
        <Button
          onClick={() =>
            void rpc("extractor.set_config", [cfg])
              .then(() => toast.success("Extractor saved"))
              .catch((e: Error) => toast.error(e.message))
          }
        >
          Save extractor
        </Button>
      </PrefActions>
    </PrefPage>
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
    <PrefPage title="Execute" description="Run a command when a torrent event fires.">
      <PrefFieldset title="Commands">
        {commands.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-muted-foreground">No commands yet.</p>
        ) : (
          commands.map((c) => (
            <PrefRow key={c.id} label={c.event} description={c.command}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void rpc("execute.remove_command", [c.id]).then(() => void load())}
              >
                Remove
              </Button>
            </PrefRow>
          ))
        )}
      </PrefFieldset>
      <PrefFieldset title="Add command">
        <PrefRow label="Event">
          <Select
            value={event}
            items={{ complete: "complete", added: "added", removed: "removed" }}
            onValueChange={(v) => {
              if (v) setEvent(v);
            }}
          >
            <SelectTrigger className="w-full min-w-0 max-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="complete">complete</SelectItem>
              <SelectItem value="added">added</SelectItem>
              <SelectItem value="removed">removed</SelectItem>
            </SelectContent>
          </Select>
        </PrefRow>
        <PrefPath
          label="Command"
          placeholder="/path/to/script.sh"
          mono
          value={command}
          onChange={setCommand}
        />
      </PrefFieldset>
      <PrefActions>
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
      </PrefActions>
    </PrefPage>
  );
}

function NotificationsPage() {
  const [cfg, setCfg] = useState<Record<string, unknown>>({});
  useEffect(() => {
    void rpc<Record<string, unknown>>("notifications.get_config").then(setCfg);
  }, []);
  return (
    <PrefPage title="Notifications" description="Send email when torrent events occur.">
      <PrefFieldset
        title="Browser"
        hint="Torro can show a desktop notification when a download you marked finishes. Use Test to fire the same watcher without waiting for a real file."
      >
        <PrefRow label="Test notification" description="Asks for permission if needed, then simulates a finished torrent.">
          <NotifyTestButton variant="outline" size="sm" />
        </PrefRow>
      </PrefFieldset>
      <PrefFieldset title="Email">
        <SwitchRow
          label="Enable email notifications"
          checked={asBool(cfg.smtp_enabled)}
          onChange={(smtp_enabled) => setCfg({ ...cfg, smtp_enabled })}
        />
        <PathField
          label="SMTP host"
          value={asString(cfg.smtp_host)}
          onChange={(smtp_host) => setCfg({ ...cfg, smtp_host })}
        />
        <NumField
          label="SMTP port"
          value={asNumber(cfg.smtp_port, 587)}
          onChange={(smtp_port) => setCfg({ ...cfg, smtp_port })}
        />
        <PathField
          label="Username"
          value={asString(cfg.smtp_user)}
          onChange={(smtp_user) => setCfg({ ...cfg, smtp_user })}
        />
        <PathField
          label="From"
          value={asString(cfg.smtp_from)}
          onChange={(smtp_from) => setCfg({ ...cfg, smtp_from })}
        />
        <PathField
          label="Recipients"
          hint="Comma-separated email addresses."
          value={asString(cfg.smtp_recipients)}
          onChange={(smtp_recipients) => setCfg({ ...cfg, smtp_recipients })}
        />
      </PrefFieldset>
      <PrefActions>
        <Button
          onClick={() =>
            void rpc("notifications.set_config", [cfg])
              .then(() => toast.success("Notifications saved"))
              .catch((e: Error) => toast.error(e.message))
          }
        >
          Save notifications
        </Button>
      </PrefActions>
    </PrefPage>
  );
}

function BlocklistPage() {
  const [cfg, setCfg] = useState<Record<string, unknown>>({});
  useEffect(() => {
    void rpc<Record<string, unknown>>("blocklist.get_status").then(setCfg);
  }, []);
  return (
    <PrefPage title="Blocklist" description="Block peers from published IP lists.">
      <PrefFieldset title="List">
        <PathField label="List URL" value={asString(cfg.url)} onChange={(url) => setCfg({ ...cfg, url })} />
        <NumField
          label="Check after"
          suffix="days"
          hint="How often to refresh the list."
          value={asNumber(cfg.check_after_days, 4)}
          onChange={(check_after_days) => setCfg({ ...cfg, check_after_days })}
        />
      </PrefFieldset>
      <PrefFieldset title="Status">
        <PrefRow label="Last update" description={`${asString(cfg.size, "0")} IPs · blocked ${asString(cfg.num_blocked, "0")} · ${asString(cfg.state)}`}>
          <span className="text-sm text-muted-foreground">{asString(cfg.last_update, "—")}</span>
        </PrefRow>
      </PrefFieldset>
      <PrefActions>
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
      </PrefActions>
    </PrefPage>
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

  const watchdirs = Object.values(dirs);
  return (
    <PrefPage title="AutoAdd" description="Watch folders for new .torrent files.">
      <PrefFieldset title="Watch folders">
        {watchdirs.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-muted-foreground">No watch folders yet.</p>
        ) : (
          watchdirs.map((d) => (
            <PrefRow
              key={d.id}
              label={d.path}
              description={d.enabled ? (d.label ? `Enabled · label ${d.label}` : "Enabled") : "Disabled"}
            >
              <div className="flex flex-wrap gap-1">
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
            </PrefRow>
          ))
        )}
      </PrefFieldset>
      <PrefFieldset title="Add folder">
        <PrefPath label="Folder" mono value={path} onChange={setPath} />
      </PrefFieldset>
      <PrefActions>
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
      </PrefActions>
    </PrefPage>
  );
}
