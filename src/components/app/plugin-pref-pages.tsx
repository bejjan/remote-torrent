"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PrefActions, PrefPage, PrefRow, PrefSection, PrefSwitch } from "@/components/app/pref-ui";
import { rpc } from "@/lib/deluge/client";
import { LABEL_RPC } from "@/lib/deluge/label-plugin";
import { loadLtConfig, saveLtConfig } from "@/lib/deluge/ltconfig";
import {
  LTCONFIG_CORE_KEYS,
  PLUGIN_STUB_NOTE,
  relatedCoreConfigEntries,
} from "@/lib/deluge/plugin-pages";

export function SettingValueInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  if (typeof value === "boolean") {
    return <Switch checked={value === true} onCheckedChange={(v) => onChange(v === true)} />;
  }
  if (typeof value === "number") {
    return (
      <Input
        type="number"
        className="max-w-28"
        value={Number.isFinite(value) ? String(value) : "0"}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  if (typeof value === "string") {
    return (
      <Input
        className="w-full min-w-0 @min-[32rem]:w-72"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <Input
      className="w-full min-w-0 @min-[32rem]:w-72"
      value={JSON.stringify(value)}
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value) as unknown);
        } catch {
          onChange(e.target.value);
        }
      }}
    />
  );
}

export function PluginStubPage({
  name,
  core,
  setCore,
  extraCoreKeys = [],
}: {
  name: string;
  core: Record<string, unknown>;
  setCore: (next: Record<string, unknown>) => void;
  extraCoreKeys?: readonly string[];
}) {
  const related = relatedCoreConfigEntries(name, core, extraCoreKeys);
  return (
    <PrefPage title={name} description={`${PLUGIN_STUB_NOTE} Related core settings are shown below.`}>
      <PrefSection title="Status">
        <PrefRow label="Plugin" description="This plugin is enabled on the daemon.">
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Enabled</span>
        </PrefRow>
      </PrefSection>
      <PrefSection title="Related settings">
        {related.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-muted-foreground">No related keys in core.get_config.</p>
        ) : (
          related.map(([key, value]) => (
            <PrefRow key={key} label={key}>
              <SettingValueInput
                value={value}
                onChange={(next) => setCore({ ...core, [key]: next })}
              />
            </PrefRow>
          ))
        )}
      </PrefSection>
    </PrefPage>
  );
}

export function LabelPrefPage() {
  const [labels, setLabels] = useState<string[]>([]);
  useEffect(() => {
    void rpc<string[]>(LABEL_RPC.getLabels)
      .then((rows) => setLabels(rows || []))
      .catch(() => setLabels([]));
  }, []);
  return (
    <PrefPage
      title="Label"
      description="Labels are managed in the filter sidebar. Per-label options stay there."
    >
      <PrefSection title="Status">
        <PrefRow label="Plugin" description="This plugin is enabled on the daemon.">
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Enabled</span>
        </PrefRow>
      </PrefSection>
      <PrefSection title="Labels">
        {labels.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-muted-foreground">No labels defined.</p>
        ) : (
          labels.map((label) => (
            <PrefRow key={label} label={label}>
              <span className="font-mono text-xs text-muted-foreground">{label}</span>
            </PrefRow>
          ))
        )}
      </PrefSection>
    </PrefPage>
  );
}

export function LtConfigPage({
  pluginName,
  core,
  setCore,
}: {
  pluginName: string;
  core: Record<string, unknown>;
  setCore: (next: Record<string, unknown>) => void;
}) {
  const [mode, setMode] = useState<"loading" | "rpc" | "stub">("loading");
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [applyOnStart, setApplyOnStart] = useState(false);
  const [setMethods, setSetMethods] = useState<string[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await loadLtConfig((method, params) => rpc(method, params ?? []), pluginName);
        if (cancelled) return;
        if (!loaded.ok) {
          setMode("stub");
          return;
        }
        setSettings(loaded.settings);
        setApplyOnStart(loaded.applyOnStart);
        setSetMethods(loaded.setMethods);
        setMode("rpc");
      } catch (err) {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Failed to load ltConfig");
        setMode("stub");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pluginName]);

  const keys = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return Object.keys(settings)
      .sort((a, b) => a.localeCompare(b))
      .filter((key) => !q || key.toLowerCase().includes(q));
  }, [settings, filter]);

  if (mode === "loading") {
    return <p className="text-sm text-muted-foreground">Loading {pluginName}…</p>;
  }
  if (mode === "stub") {
    return (
      <PluginStubPage
        name={pluginName}
        core={core}
        setCore={setCore}
        extraCoreKeys={LTCONFIG_CORE_KEYS}
      />
    );
  }

  return (
    <PrefPage
      title={pluginName}
      description="Libtorrent session settings. Changing these can affect swarm behavior."
    >
      <PrefSection title="Apply">
        <PrefSwitch
          label="Apply on start"
          description="Write these settings when the daemon starts."
          checked={applyOnStart === true}
          onChange={setApplyOnStart}
        />
        <PrefRow label="Filter settings" description="Show only keys that match this text.">
          <Input
            className="w-full min-w-0 @min-[32rem]:w-72"
            value={filter}
            placeholder="connections_limit"
            onChange={(e) => setFilter(e.target.value)}
          />
        </PrefRow>
      </PrefSection>
      <PrefSection title="Settings">
        {keys.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-muted-foreground">No matching settings.</p>
        ) : (
          keys.map((key) => (
            <PrefRow key={key} label={key}>
              <SettingValueInput
                value={settings[key]}
                onChange={(next) => setSettings({ ...settings, [key]: next })}
              />
            </PrefRow>
          ))
        )}
      </PrefSection>
      <PrefActions>
        <Button
          onClick={() =>
            void saveLtConfig((method, params) => rpc(method, params ?? []), setMethods, settings, applyOnStart)
              .then(() => toast.success(`${pluginName} saved`))
              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Save failed"))
          }
        >
          Save {pluginName}
        </Button>
      </PrefActions>
    </PrefPage>
  );
}
