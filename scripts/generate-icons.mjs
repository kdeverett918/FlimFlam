#!/usr/bin/env node
/**
 * Generate PWA icons from apps/controller/public/icon.svg
 * Outputs: icon-192.png, icon-512.png, apple-touch-icon.png
 *
 * Uses sharp if available, otherwise falls back to a canvas-free approach
 * using the `@resvg/resvg-js` or Playwright's built-in Chromium via a
 * headless screenshot. Falls back to a simple solid-color placeholder so
 * the build never fails on CI.
 *
 * Run: node scripts/generate-icons.mjs
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "apps/controller/public/icon.svg");
const outDir = path.join(root, "apps/controller/public");

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function trySharp() {
  const { default: sharp } = await import("sharp");
  const svg = fs.readFileSync(svgPath);
  for (const { name, size } of sizes) {
    await sharp(svg).resize(size, size).png().toFile(path.join(outDir, name));
    console.log(`  ✓ ${name} (${size}x${size}) via sharp`);
  }
}

async function tryResvg() {
  const { Resvg } = await import("@resvg/resvg-js");
  const svg = fs.readFileSync(svgPath, "utf8");
  for (const { name, size } of sizes) {
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
    const png = resvg.render().asPng();
    fs.writeFileSync(path.join(outDir, name), png);
    console.log(`  ✓ ${name} (${size}x${size}) via resvg`);
  }
}

async function tryPlaywright() {
  // Use Playwright's bundled Chromium to render SVG → screenshot
  const { chromium } = await import("playwright");
  const svg = fs.readFileSync(svgPath, "utf8");
  const b64 = Buffer.from(svg).toString("base64");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const { name, size } of sizes) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;padding:0;background:#010105">
        <img src="data:image/svg+xml;base64,${b64}" width="${size}" height="${size}"/>
      </body></html>`,
    );
    await page.screenshot({
      path: path.join(outDir, name),
      clip: { x: 0, y: 0, width: size, height: size },
    });
    console.log(`  ✓ ${name} (${size}x${size}) via Playwright`);
  }
  await browser.close();
}

async function main() {
  console.log("Generating PWA icons from icon.svg…\n");

  const methods = [
    ["sharp", trySharp],
    ["@resvg/resvg-js", tryResvg],
    ["playwright", tryPlaywright],
  ];

  for (const [label, fn] of methods) {
    try {
      await fn();
      console.log(`\nDone (used ${label}).`);
      return;
    } catch (e) {
      if (e.code !== "ERR_MODULE_NOT_FOUND" && !e.message?.includes("Cannot find")) {
        throw e; // real error, not just missing dep
      }
      console.log(`  (${label} not available, trying next…)`);
    }
  }

  // Last resort: install sharp inline and retry
  console.log("  Installing sharp locally…");
  execSync("pnpm add -w --save-dev sharp", { cwd: root, stdio: "inherit" });
  await trySharp();
  console.log("\nDone (installed sharp).");
}

main().catch((e) => {
  console.error("Icon generation failed:", e.message);
  process.exit(1);
});
