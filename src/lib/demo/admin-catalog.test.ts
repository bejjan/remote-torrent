import assert from "node:assert/strict";
import {
  ADMIN_DEMO_DEFAULT_COUNT,
  ADMIN_DEMO_MAX_COUNT,
  SYNTHETIC_TRACKERS,
  adminDemoCacheKey,
  clampAdminDemoConfig,
  encodeAdminDemoHeader,
  generateSyntheticTorrentSpecs,
  parseAdminDemoHeader,
} from "./admin-catalog";
import { storageKey } from "../storage";

assert.equal(storageKey("admin-demo"), "nova:admin-demo");

{
  const cfg = clampAdminDemoConfig({
    enabled: true,
    count: 50_000,
    seed: 3.2,
    seedingPct: 120,
    downloadingPct: -4,
    pausedPct: 10,
  });
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.count, ADMIN_DEMO_MAX_COUNT);
  assert.equal(cfg.seed, 3);
  assert.equal(cfg.seedingPct, 100);
  assert.equal(cfg.downloadingPct, 0);
  assert.equal(cfg.pausedPct, 10);
}

{
  const header = encodeAdminDemoHeader({
    enabled: true,
    count: 2000,
    seed: 1,
    seedingPct: 55,
    downloadingPct: 30,
    pausedPct: 10,
  });
  const parsed = parseAdminDemoHeader(header);
  assert.ok(parsed);
  assert.equal(parsed.count, ADMIN_DEMO_DEFAULT_COUNT);
  assert.equal(parseAdminDemoHeader(null), null);
  assert.equal(parseAdminDemoHeader(encodeAdminDemoHeader({ ...parsed!, enabled: false })), null);
}

{
  const specs = generateSyntheticTorrentSpecs({
    enabled: true,
    count: 80,
    seed: 7,
    seedingPct: 50,
    downloadingPct: 30,
    pausedPct: 15,
  });
  assert.equal(specs.length, 80);
  assert.equal(new Set(specs.map((s) => s.hash)).size, 80);
  assert.equal(new Set(specs.map((s) => s.name)).size, 80);
  assert.ok(specs.some((s) => s.name.includes("&") && !s.name.includes("&amp;")));
  assert.ok(specs.some((s) => s.state === "Downloading"));
  assert.ok(specs.some((s) => s.state === "Seeding"));
  assert.ok(specs.some((s) => s.state === "Paused"));
  const hosts = new Set(specs.map((s) => s.tracker));
  assert.ok(hosts.size <= SYNTHETIC_TRACKERS.length);
  assert.ok(hosts.size >= 8);
}

{
  const a = generateSyntheticTorrentSpecs({
    enabled: true,
    count: 40,
    seed: 99,
    seedingPct: 55,
    downloadingPct: 30,
    pausedPct: 10,
  });
  const b = generateSyntheticTorrentSpecs({
    enabled: true,
    count: 40,
    seed: 99,
    seedingPct: 55,
    downloadingPct: 30,
    pausedPct: 10,
  });
  assert.deepEqual(
    a.map((s) => [s.hash, s.name, s.state]),
    b.map((s) => [s.hash, s.name, s.state])
  );
  const cfg = {
    enabled: true,
    count: 40,
    seed: 99,
    seedingPct: 55,
    downloadingPct: 30,
    pausedPct: 10,
  };
  assert.equal(adminDemoCacheKey(cfg), adminDemoCacheKey({ ...cfg, enabled: false }));
}

console.log("admin-catalog tests passed");
