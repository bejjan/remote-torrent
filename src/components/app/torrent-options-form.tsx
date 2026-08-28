"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { rpc } from "@/lib/deluge/client";
import { buildTorrentOptionsPayload } from "@/lib/deluge/torrent-options";
import type { TorrentStatus } from "@/lib/deluge/types";
import { cn } from "@/lib/utils";

export function OptionsForm({ torrentId, torrent }: { torrentId: string; torrent: TorrentStatus }) {
  const uid = useId();
  const [maxDown, setMaxDown] = useState(String(torrent.max_download_speed));
  const [maxUp, setMaxUp] = useState(String(torrent.max_upload_speed));
  const [maxConn, setMaxConn] = useState(String(torrent.max_connections));
  const [maxSlots, setMaxSlots] = useState(String(torrent.max_upload_slots));
  const [auto, setAuto] = useState(torrent.is_auto_managed);
  const [stopRatio, setStopRatio] = useState(torrent.stop_at_ratio);
  const [ratio, setRatio] = useState(String(torrent.stop_ratio));
  const [removeAt, setRemoveAt] = useState(torrent.remove_at_ratio);
  const [move, setMove] = useState(torrent.move_completed);
  const [movePath, setMovePath] = useState(torrent.move_completed_path);
  const [superSeed, setSuperSeed] = useState(torrent.super_seeding);
  const [firstLast, setFirstLast] = useState(torrent.prioritize_first_last);

  async function save() {
    try {
      await rpc("core.set_torrent_options", [
        [torrentId],
        buildTorrentOptionsPayload({
          maxDownloadSpeed: maxDown,
          maxUploadSpeed: maxUp,
          maxConnections: maxConn,
          maxUploadSlots: maxSlots,
          isAutoManaged: auto,
          stopAtRatio: stopRatio,
          stopRatio: ratio,
          removeAtRatio: removeAt,
          moveCompleted: move,
          moveCompletedPath: movePath,
          superSeeding: superSeed,
          prioritizeFirstLast: firstLast,
        }),
      ]);
      toast.success("Options saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <form
      className="grid grid-cols-1 gap-2.5 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <OptionSection title="Speed limits">
        <OptionRow htmlFor={`${uid}-down`} label="Max download">
          <NumInput
            id={`${uid}-down`}
            value={maxDown}
            onChange={setMaxDown}
            suffix="KiB/s"
            title="−1 unlimited"
          />
        </OptionRow>
        <OptionRow htmlFor={`${uid}-up`} label="Max upload">
          <NumInput
            id={`${uid}-up`}
            value={maxUp}
            onChange={setMaxUp}
            suffix="KiB/s"
            title="−1 unlimited"
          />
        </OptionRow>
        <OptionRow htmlFor={`${uid}-conn`} label="Connections">
          <NumInput
            id={`${uid}-conn`}
            value={maxConn}
            onChange={setMaxConn}
            title="−1 unlimited"
          />
        </OptionRow>
        <OptionRow htmlFor={`${uid}-slots`} label="Upload slots">
          <NumInput
            id={`${uid}-slots`}
            value={maxSlots}
            onChange={setMaxSlots}
            title="−1 unlimited"
          />
        </OptionRow>
      </OptionSection>

      <OptionSection title="Queue / ratio">
        <OptionRow htmlFor={`${uid}-stop`} label="Stop at ratio">
          <Switch id={`${uid}-stop`} size="sm" checked={stopRatio} onCheckedChange={setStopRatio} />
        </OptionRow>
        <OptionRow htmlFor={`${uid}-ratio`} label="Stop ratio">
          <NumInput
            id={`${uid}-ratio`}
            value={ratio}
            onChange={setRatio}
            disabled={!stopRatio}
          />
        </OptionRow>
        <OptionRow htmlFor={`${uid}-remove`} label="Remove at ratio">
          <Switch
            id={`${uid}-remove`}
            size="sm"
            checked={removeAt}
            onCheckedChange={setRemoveAt}
            disabled={!stopRatio}
          />
        </OptionRow>
      </OptionSection>

      <OptionSection title="Location">
        <OptionRow htmlFor={`${uid}-move`} label="Move completed">
          <Switch id={`${uid}-move`} size="sm" checked={move} onCheckedChange={setMove} />
        </OptionRow>
        <div className="grid gap-1">
          <Label htmlFor={`${uid}-move-path`} className="text-xs font-normal text-muted-foreground">
            Completed path
          </Label>
          <Input
            id={`${uid}-move-path`}
            value={movePath}
            disabled={!move}
            onChange={(e) => setMovePath(e.target.value)}
            className="h-7 font-mono text-xs"
          />
        </div>
      </OptionSection>

      <OptionSection title="Flags">
        <OptionRow htmlFor={`${uid}-auto`} label="Auto managed">
          <Switch id={`${uid}-auto`} size="sm" checked={auto} onCheckedChange={setAuto} />
        </OptionRow>
        <OptionRow htmlFor={`${uid}-private`} label="Private">
          <Switch id={`${uid}-private`} size="sm" checked={torrent.private} disabled />
        </OptionRow>
        <OptionRow htmlFor={`${uid}-super`} label="Super seeding">
          <Switch id={`${uid}-super`} size="sm" checked={superSeed} onCheckedChange={setSuperSeed} />
        </OptionRow>
        <OptionRow htmlFor={`${uid}-first-last`} label="Prioritize first/last">
          <Switch id={`${uid}-first-last`} size="sm" checked={firstLast} onCheckedChange={setFirstLast} />
        </OptionRow>
      </OptionSection>

      <div className="md:col-span-2">
        <Button type="submit" size="sm">
          Apply
        </Button>
      </div>
    </form>
  );
}

function OptionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-muted/40 p-2.5 dark:bg-muted/25">
      <h3 className="mb-2 text-sm font-medium text-foreground">{title}</h3>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function OptionRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
      <Label htmlFor={htmlFor} className="text-sm font-normal leading-snug">
        {label}
      </Label>
      {children}
    </div>
  );
}

function NumInput({
  id,
  value,
  onChange,
  suffix,
  title,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        id={id}
        value={value}
        title={title}
        disabled={disabled}
        inputMode="decimal"
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-7 w-[5.5rem] max-w-[5.5rem] tabular text-right")}
      />
      <span className="w-10 text-xs text-muted-foreground">{suffix ?? ""}</span>
    </div>
  );
}
