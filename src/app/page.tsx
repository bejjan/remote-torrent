import { Suspense } from "react";

import { TorrentDashboard } from "@/components/torrent-dashboard";

export default function Home() {
  return (
    <Suspense>
      <TorrentDashboard />
    </Suspense>
  );
}
