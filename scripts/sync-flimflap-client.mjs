import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const flimflapClientRoot = path.resolve(repoRoot, "../game2/packages/client");
const flimflapDistRoot = path.join(flimflapClientRoot, "dist");
const flimflapPublicRoot = path.join(flimflapClientRoot, "public");
const targetPublicRoot = path.join(repoRoot, "apps/web/public/flimflap");
const manifestPath = path.join(repoRoot, "apps/web/src/lib/flimflap-client-manifest.ts");

const captureSingle = (html, pattern, label) => {
  const match = html.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Could not find ${label} in FlimFlap build output.`);
  }
  return match[1];
};

const captureMany = (html, pattern) => Array.from(html.matchAll(pattern), (match) => match[1]);

await rm(targetPublicRoot, { recursive: true, force: true });
await mkdir(targetPublicRoot, { recursive: true });

await cp(flimflapPublicRoot, targetPublicRoot, { recursive: true });
await cp(path.join(flimflapDistRoot, "assets"), path.join(targetPublicRoot, "assets"), {
  recursive: true,
});

const indexHtml = await readFile(path.join(flimflapDistRoot, "index.html"), "utf8");
const manifest = {
  script: captureSingle(indexHtml, /<script[^>]+src="([^"]+)"/i, "module script"),
  stylesheets: captureMany(indexHtml, /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/gi),
  modulePreloads: captureMany(indexHtml, /<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/gi),
};

const manifestSource = `export const FLIMFLAP_CLIENT_ASSET_MANIFEST = ${JSON.stringify(
  manifest,
  null,
  2,
)} as const;\n`;

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, manifestSource, "utf8");

console.log("Synced FlimFlap client assets into apps/web/public/flimflap");
console.log(`Script: ${manifest.script}`);
