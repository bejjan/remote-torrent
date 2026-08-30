import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "screenshots");
const url = process.env.TORRO_URL ?? "http://127.0.0.1:43123";

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});

await context.addInitScript(() => {
  localStorage.setItem("theme", "light");
});

const page = await context.newPage();
page.setDefaultTimeout(20_000);
await page.goto(url, { waitUntil: "networkidle" });

const password = page.locator("#daemon-password");
if (await password.count()) {
  await password.fill("deluge");
  await page.getByRole("button", { name: /sign in/i }).click();
}

await page.locator("html").evaluate((el) => el.classList.remove("dark"));
await page.addStyleTag({
  content: "nextjs-portal, [data-nextjs-dev-overlay] { display: none !important; }",
});
await page.waitForSelector('[data-torrent-search], input[aria-label="Search torrents"]', {
  timeout: 20_000,
});
await page.waitForSelector("table tbody tr, [role='row']", { timeout: 20_000 }).catch(() => {});
await page.waitForTimeout(1500);

const firstRow = page.locator("table tbody tr, [role='row']").first();
if (await firstRow.count()) {
  await firstRow.click();
  await page.waitForTimeout(800);
}

await page.getByText("Signed in to demo mode").waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});

await page.screenshot({
  path: join(outDir, "dashboard.png"),
  type: "png",
  animations: "disabled",
});

if (await firstRow.count()) {
  await firstRow.dblclick();
  await page.getByRole("button", { name: "Close inspector" }).waitFor({ timeout: 8_000 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(outDir, "inspector.png"),
    type: "png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Close inspector" }).click();
  await page.waitForTimeout(400);
}

await page.getByRole("button", { name: "Menu" }).click();
await page.getByRole("menuitem", { name: /Preferences/ }).click();
await page.getByRole("heading", { name: "Preferences" }).waitFor();
await page.waitForTimeout(600);

await page.screenshot({
  path: join(outDir, "preferences.png"),
  type: "png",
  animations: "disabled",
});

await browser.close();
console.log("Wrote", join(outDir, "dashboard.png"), join(outDir, "inspector.png"), "and", join(outDir, "preferences.png"));
