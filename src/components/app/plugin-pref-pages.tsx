"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { rpc } from "@/lib/deluge/client";
import { LABEL_RPC } from "@/lib/deluge/label-plugin";
import { loadLtConfig, saveLtConfig } from "@/lib/deluge/ltconfig";
import {
  LTCONFIG_CORE_KEYS,
  PLUGIN_STUB_NOTE,
  relatedCoreConfigEntries,
} from "@/lib/deluge/plugin-pages";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[16rem_1fr] sm:items-center">
      <Label className="text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

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
        value={Number.isFinite(value) ? String(value) : "0"}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  if (typeof value === "string") {
    return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <Input
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
    <div className="grid gap-3">
      <div>
        <h3 className="text-base font-medium">{name}</h3>
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Enabled</p>
      </div>
      <p className="text-sm text-muted-foreground">{PLUGIN_STUB_NOTE}</p>
      {related.length === 0 ? (
        <p className="text-sm text-muted-foreground">No related keys in core.get_config.</p>
      ) : (
        related.map(([key, value]) => (
          <Field key={key} label={key}>
            <SettingValueInput
              value={value}
              onChange={(next) => setCore({ ...core, [key]: next })}
            />
          </Field>
        ))
      )}
    </div>
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
    <div className="grid gap-3">
      <div>
        <h3 className="text-base font-medium">Label</h3>
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Enabled</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Labels are managed in the filter sidebar. Per-label options stay there.
      </p>
      {labels.length === 0 ? (
        <p className="text-sm text-muted-foreground">No labels defined.</p>
      ) : (
        <ul className="grid gap-1 text-sm">
          {labels.map((label) => (
            <li key={label} className="rounded-md border px-3 py-1.5 font-mono text-xs">
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
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
    <div className="grid gap-3">
      <div>
        <h3 className="text-base font-medium">{pluginName}</h3>
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Enabled</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Libtorrent session settings. Changing these can affect swarm behavior.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={applyOnStart === true} onCheckedChange={(v) => setApplyOnStart(v === true)} />
        Apply on start
      </label>
      <Field label="Filter settings">
        <Input
          value={filter}
          placeholder="connections_limit"
          onChange={(e) => setFilter(e.target.value)}
        />
      </Field>
      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching settings.</p>
      ) : (
        keys.map((key) => (
          <Field key={key} label={key}>
            <SettingValueInput
              value={settings[key]}
              onChange={(next) => setSettings({ ...settings, [key]: next })}
            />
          </Field>
        ))
      )}
      <Button
        className="w-fit"
        onClick={() =>
          void saveLtConfig((method, params) => rpc(method, params ?? []), setMethods, settings, applyOnStart)
            .then(() => toast.success(`${pluginName} saved`))
            .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Save failed"))
        }
      >
        Save {pluginName}
      </Button>
    </div>
  );
}
