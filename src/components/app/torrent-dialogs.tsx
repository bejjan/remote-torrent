"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { rpc, uploadTorrent } from "@/lib/deluge/client";
import type { AddTorrentOptions } from "@/lib/deluge/types";

export function AddTorrentDialog({
  open,
  onOpenChange,
  defaultPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPath: string;
}) {
  const [tab, setTab] = useState("file");
  const [file, setFile] = useState<File | null>(null);
  const [magnet, setMagnet] = useState("");
  const [downloadLocation, setDownloadLocation] = useState(defaultPath);
  const [addPaused, setAddPaused] = useState(false);
  const [sequential, setSequential] = useState(false);
  const [firstLast, setFirstLast] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const options: AddTorrentOptions = {
      download_location: downloadLocation,
      add_paused: addPaused,
      sequential_download: sequential,
      prioritize_first_last_pieces: firstLast,
    };
    try {
      if (tab === "file") {
        if (!file) {
          toast.error("Choose a .torrent file");
          return;
        }
        const path = await uploadTorrent(file);
        await rpc("web.add_torrents", [[{ path, options }]]);
      } else {
        const lines = magnet
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (!lines.length) {
          toast.error("Paste a magnet URI or HTTP URL");
          return;
        }
        for (const line of lines) {
          if (line.startsWith("magnet:")) {
            await rpc("core.add_torrent_magnet", [line, options]);
          } else {
            await rpc("core.add_torrent_url", [line, options]);
          }
        }
      }
      toast.success("Torrent added");
      onOpenChange(false);
      setFile(null);
      setMagnet("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add torrent</DialogTitle>
          <DialogDescription>Upload a torrent file or paste a magnet / URL.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="file">File</TabsTrigger>
            <TabsTrigger value="magnet">Magnet / URL</TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="pt-3">
            <Input
              type="file"
              accept=".torrent,application/x-bittorrent"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </TabsContent>
          <TabsContent value="magnet" className="pt-3">
            <Textarea
              rows={4}
              placeholder="magnet:?xt=urn:btih:… or https://example.com/file.torrent"
              value={magnet}
              onChange={(e) => setMagnet(e.target.value)}
            />
          </TabsContent>
        </Tabs>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Download location</Label>
            <Input value={downloadLocation} onChange={(e) => setDownloadLocation(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={addPaused} onCheckedChange={setAddPaused} />
            Add in paused state
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={sequential} onCheckedChange={setSequential} />
            Sequential download
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={firstLast} onCheckedChange={setFirstLast} />
            Prioritize first and last pieces
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void submit()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveTorrentDialog({
  open,
  onOpenChange,
  ids,
  onRemoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  onRemoved: () => void;
}) {
  const [removeData, setRemoveData] = useState(false);

  async function confirm() {
    try {
      if (ids.length === 1) {
        await rpc("core.remove_torrent", [ids[0], removeData]);
      } else {
        await rpc("core.remove_torrents", [ids, removeData]);
      }
      toast.success(ids.length > 1 ? "Torrents removed" : "Torrent removed");
      onRemoved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {ids.length} torrent{ids.length === 1 ? "" : "s"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes the torrent from Deluge. Downloaded files stay unless you choose to delete
            them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={removeData} onCheckedChange={(v) => setRemoveData(v === true)} />
          Also delete downloaded files
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void confirm()}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MoveTorrentDialog({
  open,
  onOpenChange,
  ids,
  currentPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  currentPath: string;
}) {
  const [path, setPath] = useState(currentPath);

  async function submit() {
    try {
      await rpc("core.move_storage", [ids, path]);
      toast.success("Moving storage");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Move failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move storage</DialogTitle>
          <DialogDescription>New download location for the selected torrents.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>Path</Label>
          <Input value={path} onChange={(e) => setPath(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
