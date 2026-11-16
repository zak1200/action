import { cp, mkdir, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
if (dirname(output) !== root)
  throw new Error("Build output must stay inside the project");
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const f of [
  "index.html",
  "style.css",
  "app.js",
  "assets",
  "robots.txt",
  "site.webmanifest",
])
  await cp(resolve(root, f), resolve(output, f), { recursive: true });
console.log("Static demo built in dist/");
