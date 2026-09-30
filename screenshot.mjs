import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "temporary screenshots");

const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] || "";
const width = Number(process.argv[4]) || 1440;
const height = Number(process.argv[5]) || 900;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const existing = fs
  .readdirSync(outDir)
  .map((f) => f.match(/^screenshot-(\d+)/))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const n = existing.length ? Math.max(...existing) + 1 : 1;
const fileName = `screenshot-${n}${label ? "-" + label : ""}.png`;
const outPath = path.join(outDir, fileName);

// Chrome's NSS/ALSA deps aren't installed system-wide here and apt needs root,
// so they live in a user-local dir that has to be on the loader path.
const localLibs = path.join(process.env.HOME, ".local", "chrome-libs");
const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  env: {
    ...process.env,
    LD_LIBRARY_PATH: [localLibs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
  },
});
const page = await browser.newPage();
await page.setViewport({ width, height });
await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Saved ${outPath}`);
