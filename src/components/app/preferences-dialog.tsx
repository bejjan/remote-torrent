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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
    if (getStoredClientKind() === "transmission") return;
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
        <DialogContent className="flex h-[min(40rem,90vh)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b p-4">
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(40rem,90vh)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-4">
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <nav className="w-44 shrink-0 overflow-x-hidden overflow-y-auto border-r p-2">
            {CORE_NAV_GROUPS.map((group) => (
              <NavGroup
                key={group.label}
                title={group.label}
                hideTitle={group.pages.length === 1 && group.pages[0]?.label === group.label}
              >
                {group.pages.map((p) => (
                  <NavBtn key={p.id} active={page === p.id} onClick={() => setPage(p.id)}>
                    {p.label}
                  </NavBtn>
                ))}
              </NavGroup>
            ))}
            {pluginNav.length > 0 ? (
              <NavGroup title="Plugins">
                {pluginNav.map((p) => (
                  <NavBtn key={p.id} active={page === p.id} onClick={() => setPage(p.id)}>
                    {p.label}
                  </NavBtn>
                ))}
              </NavGroup>
            ) : null}
          </nav>
          <ScrollArea className="min-w-0 flex-1 overflow-x-hidden">
            <div className="min-w-0 p-4">
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
    <div className="mb-2">
      {hideTitle ? null : (
        <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </p>
      )}
      {children}
    </div>
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

function PrefPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-6">
      <h3 className="text-base font-medium">{title}</h3>
      {children}
    </div>
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
    <section className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <h4 className="text-sm font-medium">{title}</h4>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function NumPair({ children }: { children: React.ReactNode }) {
  return <div className="grid min-w-0 gap-3 sm:grid-cols-2">{children}</div>;
}

function PathField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      <Input
        className="w-full min-w-0"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
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
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
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
  return (
    <div className="grid gap-1">
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={checked === true} onCheckedChange={(v) => onChange(v === true)} />
        {label}
      </label>
      {hint ? <p className="pl-10 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
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
}: {
  core: Record<string, unknown>;
  setCore: (c: Record<string, unknown>) => void;
  k: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <PathField
      label={label}
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
    <PrefPage title="Downloads">
      <PrefFieldset title="Folders">
        <CorePath core={core} setCore={setCore} k="download_location" label="Download to" />
        <CoreSwitch core={core} setCore={setCore} k="move_completed" label="Move completed downloads" />
        <CorePath
          core={core}
          setCore={setCore}
          k="move_completed_path"
          label="Move completed to"
          disabled={!asBool(core.move_completed)}
        />
        <CoreSwitch core={core} setCore={setCore} k="copy_torrent_file" label="Copy of .torrent files" />
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
        />
      </PrefFieldset>
      <PrefFieldset title="Options">
        <CoreSwitch core={core} setCore={setCore} k="add_paused" label="Add torrents in paused state" />
        <CoreSwitch core={core} setCore={setCore} k="sequential_download" label="Sequential download" />
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="prioritize_first_last_pieces"
          label="Prioritize first and last pieces"
        />
        <CoreSwitch core={core} setCore={setCore} k="pre_allocate_storage" label="Pre-allocate disk space" />
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
    <PrefPage title="Network">
      <PrefFieldset title="Incoming">
        <CorePath core={core} setCore={setCore} k="listen_interface" label="Listen interface" />
        <CoreSwitch core={core} setCore={setCore} k="random_port" label="Use random port" />
        <NumPair>
          <NumField
            label="From"
            value={listen[0]}
            disabled={randomListen}
            onChange={(v) => setCore({ ...core, listen_ports: [v, listen[1]] })}
          />
          <NumField
            label="To"
            value={listen[1]}
            disabled={randomListen}
            onChange={(v) => setCore({ ...core, listen_ports: [listen[0], v] })}
          />
        </NumPair>
      </PrefFieldset>
      <PrefFieldset title="Outgoing">
        <CorePath core={core} setCore={setCore} k="outgoing_interface" label="Outgoing interface" />
        <CoreSwitch core={core} setCore={setCore} k="random_outgoing_ports" label="Use random ports" />
        <NumPair>
          <NumField
            label="From"
            value={outgoing[0]}
            disabled={randomOutgoing}
            onChange={(v) => setCore({ ...core, outgoing_ports: [v, outgoing[1]] })}
          />
          <NumField
            label="To"
            value={outgoing[1]}
            disabled={randomOutgoing}
            onChange={(v) => setCore({ ...core, outgoing_ports: [outgoing[0], v] })}
          />
        </NumPair>
      </PrefFieldset>
      <PrefFieldset title="Encryption">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground">Incoming</Label>
            <IntSelect
              value={canonicalizeEncPolicy(asNumber(core.enc_in_policy, 1))}
              onChange={(v) => setCore({ ...core, enc_in_policy: v })}
              options={ENC_POLICY_OPTIONS}
              items={ENC_POLICY_SELECT_ITEMS}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground">Outgoing</Label>
            <IntSelect
              value={canonicalizeEncPolicy(asNumber(core.enc_out_policy, 1))}
              onChange={(v) => setCore({ ...core, enc_out_policy: v })}
              options={ENC_POLICY_OPTIONS}
              items={ENC_POLICY_SELECT_ITEMS}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-muted-foreground">Level</Label>
          <IntSelect
            value={canonicalizeEncLevel(asNumber(core.enc_level, 2))}
            onChange={(v) => setCore({ ...core, enc_level: v })}
            options={ENC_LEVEL_OPTIONS}
            items={ENC_LEVEL_SELECT_ITEMS}
          />
        </div>
      </PrefFieldset>
      <PrefFieldset title="Network extras">
        <CoreSwitch core={core} setCore={setCore} k="dht" label="DHT" />
        <CoreSwitch core={core} setCore={setCore} k="lsd" label="Local peer discovery (LSD)" />
        <CoreSwitch core={core} setCore={setCore} k="utpex" label="Peer exchange (PEX)" />
        <CoreSwitch core={core} setCore={setCore} k="upnp" label="UPnP" />
        <CoreSwitch core={core} setCore={setCore} k="natpmp" label="NAT-PMP" />
        {hasConfigKey(core, "utp") ? (
          <CoreSwitch core={core} setCore={setCore} k="utp" label="µTP" />
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
            value={asString(core.peer_tos)}
            onChange={(v) => setCore({ ...core, peer_tos: v })}
          />
          <p className="text-xs text-muted-foreground">Hexadecimal, for example 0x00.</p>
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
    <PrefPage title="Bandwidth">
      <PrefFieldset title="Global" hint="−1 is unlimited.">
        <NumPair>
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
        </NumPair>
        <NumPair>
          <CoreNum core={core} setCore={setCore} k="max_connections_global" label="Maximum connections" />
          <CoreNum core={core} setCore={setCore} k="max_upload_slots_global" label="Maximum upload slots" />
        </NumPair>
        <NumPair>
          <CoreNum
            core={core}
            setCore={setCore}
            k="max_half_open_connections"
            label="Half-open connections"
          />
          {hasConfigKey(core, "max_connections_per_second") ? (
            <CoreNum
              core={core}
              setCore={setCore}
              k="max_connections_per_second"
              label="Connection attempts per second"
            />
          ) : null}
        </NumPair>
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="ignore_limits_on_local_network"
          label="Ignore limits on local network"
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
          <NumPair>
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
          </NumPair>
          <NumPair>
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
          </NumPair>
        </PrefFieldset>
      ) : null}
    </PrefPage>
  );
}

function QueuePage({ core, setCore }: CoreProps) {
  const stopAtRatio = asBool(core.stop_seed_at_ratio);
  return (
    <PrefPage title="Queue">
      <PrefFieldset title="New torrents">
        <CoreSwitch core={core} setCore={setCore} k="queue_new_to_top" label="Queue to top" />
      </PrefFieldset>
      <PrefFieldset title="Active torrents" hint="−1 is unlimited.">
        <NumPair>
          <CoreNum core={core} setCore={setCore} k="max_active_limit" label="Total active" />
          <CoreNum core={core} setCore={setCore} k="max_active_downloading" label="Downloading" />
        </NumPair>
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
          />
        ) : null}
      </PrefFieldset>
      <PrefFieldset title="Seeding rotation" hint="−1 is unlimited.">
        <NumPair>
          {hasConfigKey(core, "share_ratio_limit") ? (
            <CoreNum core={core} setCore={setCore} k="share_ratio_limit" label="Share ratio" />
          ) : null}
          {hasConfigKey(core, "seed_time_ratio_limit") ? (
            <CoreNum core={core} setCore={setCore} k="seed_time_ratio_limit" label="Time ratio" />
          ) : null}
        </NumPair>
        <CoreNum core={core} setCore={setCore} k="seed_time_limit" label="Seed time" suffix="minutes" />
      </PrefFieldset>
      <PrefFieldset title="Share ratio reached">
        <CoreSwitch core={core} setCore={setCore} k="stop_seed_at_ratio" label="Stop seeding at share ratio" />
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
    <PrefPage title="Proxy">
      <PrefFieldset title="Server">
        <div className="grid gap-1.5">
          <Label className="text-muted-foreground">Type</Label>
          <ProxyTypeSelect
            value={asNumber(proxy.type, 0)}
            onChange={(type) => setProxy({ ...proxy, type })}
            className="w-56"
          />
        </div>
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
        <div className="grid min-w-0 gap-1.5">
          <Label className="text-muted-foreground">Password</Label>
          <Input
            type="password"
            className="w-full min-w-0 max-w-xs"
            value={asString(proxy.password)}
            onChange={(e) => setProxy({ ...proxy, password: e.target.value })}
          />
        </div>
      </PrefFieldset>
      <PrefFieldset title="Use proxy for">
        {hasConfigKey(proxy, "proxy_hostnames") ? (
          <SwitchRow
            label="Hostname lookup"
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
            checked={asBool(proxy.force_proxy)}
            onChange={(v) => setProxy({ ...proxy, force_proxy: v })}
          />
        ) : null}
        {hasConfigKey(proxy, "anonymous_mode") ? (
          <SwitchRow
            label="Hide client identity"
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
    <PrefPage title="Cache">
      <PrefFieldset title="Settings">
        <NumPair>
          <CoreNum
            core={core}
            setCore={setCore}
            k="cache_size"
            label="Cache size"
            suffix="blocks"
            hint="Each block is 16 KiB."
          />
          <CoreNum core={core} setCore={setCore} k="cache_expiry" label="Cache expiry" suffix="seconds" />
        </NumPair>
      </PrefFieldset>
    </PrefPage>
  );
}

function DaemonPage({ core, setCore }: CoreProps) {
  return (
    <PrefPage title="Daemon">
      <PrefFieldset title="Port">
        <CoreNum core={core} setCore={setCore} k="daemon_port" label="Daemon port" />
      </PrefFieldset>
      <PrefFieldset title="Connections">
        <CoreSwitch core={core} setCore={setCore} k="allow_remote" label="Allow remote connections" />
      </PrefFieldset>
      <PrefFieldset title="Updates">
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="new_release_check"
          label="Periodically check for new releases"
        />
      </PrefFieldset>
    </PrefPage>
  );
}

function OtherPage({ core, setCore }: CoreProps) {
  return (
    <PrefPage title="Other">
      {hasConfigKey(core, "geoip_db_location") ? (
        <PrefFieldset title="GeoIP database">
          <CorePath core={core} setCore={setCore} k="geoip_db_location" label="Path" />
        </PrefFieldset>
      ) : null}
      {hasConfigKey(core, "announce_ip") ? (
        <PrefFieldset title="Announce IP">
          <CorePath core={core} setCore={setCore} k="announce_ip" label="IP address" />
        </PrefFieldset>
      ) : null}
      {hasConfigKey(core, "send_info") ? (
        <PrefFieldset title="System information">
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
            />
          ) : null}
          {hasConfigKey(core, "autoadd_location") ? (
            <CorePath
              core={core}
              setCore={setCore}
              k="autoadd_location"
              label="Autoadd location"
              disabled={hasConfigKey(core, "autoadd_enable") && !asBool(core.autoadd_enable)}
            />
          ) : null}
        </PrefFieldset>
      ) : null}
      {hasConfigKey(core, "announce_to_all_tiers") ? (
        <CoreSwitch
          core={core}
          setCore={setCore}
          k="announce_to_all_tiers"
          label="Announce to all tracker tiers"
        />
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
    <PrefPage title="Interface">
      <PrefFieldset title="Display">
        <SwitchRow
          label="Show sidebar"
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
          label="Show filters with zero torrents"
          checked={asBool(web.sidebar_show_zero)}
          onChange={(v) => setWeb({ ...web, sidebar_show_zero: v })}
        />
        <SwitchRow
          label="Show session speed in title and status bar"
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
            label="Allow multiple filters at once"
            checked={asBool(web.sidebar_multiple_filters)}
            onChange={(v) => setWeb({ ...web, sidebar_multiple_filters: v })}
          />
        ) : null}
        {hasConfigKey(web, "auto_reconnect") ? (
          <SwitchRow
            label="Auto-reconnect to daemon"
            checked={asBool(web.auto_reconnect ?? true)}
            onChange={(v) => setWeb({ ...web, auto_reconnect: v })}
          />
        ) : null}
      </PrefFieldset>
      {languages ? (
        <PrefFieldset title="Language">
          <StringSelect
            value={selectValueForLanguage(asString(web.language))}
            onChange={(value) => setWeb({ ...web, language: languageFromSelectValue(value) })}
            options={languageOptions}
            items={webLanguageSelectItems(languages)}
          />
        </PrefFieldset>
      ) : null}
      {hasConfigKey(web, "https") || hasConfigKey(web, "port") || hasConfigKey(web, "base") ? (
        <PrefFieldset title="Server">
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
              value={asString(web.base)}
              onChange={(base) => setWeb({ ...web, base })}
            />
          ) : null}
          {hasConfigKey(web, "https") ? (
            <SwitchRow
              label="HTTPS"
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
    <PrefPage title="Plugins">
      <p className="text-sm text-muted-foreground">
        Enable plugins to show their preference pages in the sidebar.
      </p>
      <div className="grid gap-2">
        {available.map((name) => (
          <label
            key={name}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            {name}
            <Switch checked={set.has(name.toLowerCase())} onCheckedChange={(v) => onChange(name, v === true)} />
          </label>
        ))}
      </div>
    </PrefPage>
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
      <h3 className="text-base font-medium">Scheduler</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Low download (KiB/s)">
          <Input
            type="number"
            className="max-w-28"
            value={cfg.low_down}
            onChange={(e) => setCfg({ ...cfg, low_down: Number(e.target.value) })}
          />
        </Field>
        <Field label="Low upload (KiB/s)">
          <Input
            type="number"
            className="max-w-28"
            value={cfg.low_up}
            onChange={(e) => setCfg({ ...cfg, low_up: Number(e.target.value) })}
          />
        </Field>
        <Field label="Low active torrents">
          <Input
            type="number"
            className="max-w-28"
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
    <PrefPage title="Extractor">
      <PathField
        label="Extract to"
        value={cfg.extract_path}
        onChange={(extract_path) => setCfg({ ...cfg, extract_path })}
      />
      <SwitchRow
        label="Create folder named after the torrent"
        checked={cfg.use_name_folder === true}
        onChange={(use_name_folder) => setCfg({ ...cfg, use_name_folder })}
      />
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
    <PrefPage title="Execute">
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
              onClick={() => void rpc("execute.remove_command", [c.id]).then(() => void load())}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Select
          value={event}
          items={{ complete: "complete", added: "added", removed: "removed" }}
          onValueChange={(v) => {
            if (v) setEvent(v);
          }}
        >
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
          className="min-w-0"
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
    </PrefPage>
  );
}

function NotificationsPage() {
  const [cfg, setCfg] = useState<Record<string, unknown>>({});
  useEffect(() => {
    void rpc<Record<string, unknown>>("notifications.get_config").then(setCfg);
  }, []);
  return (
    <PrefPage title="Notifications">
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
        value={asString(cfg.smtp_recipients)}
        onChange={(smtp_recipients) => setCfg({ ...cfg, smtp_recipients })}
      />
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
    </PrefPage>
  );
}

function BlocklistPage() {
  const [cfg, setCfg] = useState<Record<string, unknown>>({});
  useEffect(() => {
    void rpc<Record<string, unknown>>("blocklist.get_status").then(setCfg);
  }, []);
  return (
    <PrefPage title="Blocklist">
      <PathField label="List URL" value={asString(cfg.url)} onChange={(url) => setCfg({ ...cfg, url })} />
      <NumField
        label="Check after"
        suffix="days"
        value={asNumber(cfg.check_after_days, 4)}
        onChange={(check_after_days) => setCfg({ ...cfg, check_after_days })}
      />
      <p className="text-sm text-muted-foreground">
        Last update: {asString(cfg.last_update, "—")} · {asString(cfg.size, "0")} IPs · blocked{" "}
        {asString(cfg.num_blocked, "0")} · {asString(cfg.state)}
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

  return (
    <PrefPage title="AutoAdd">
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
      <div className="flex min-w-0 gap-2">
        <Input className="min-w-0" value={path} onChange={(e) => setPath(e.target.value)} />
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
    </PrefPage>
  );
}
