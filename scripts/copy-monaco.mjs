// Self-host Monaco editor assets.
//
// By default @monaco-editor/loader pulls monaco from cdn.jsdelivr.net, which is
// unreliable / blocked on some networks (notably mainland China) — the editor then
// hangs forever on "Loading...". We copy the minified `vs` bundle into
// public/monaco/vs and point the loader at that same-origin path instead.
//
// Runs on predev / prebuild; output is gitignored and regenerated from node_modules.

import { createRequire } from "node:module";
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// monaco-editor is a transitive dependency of @monaco-editor/react and pnpm does
// not hoist it to the top-level node_modules, so resolve it relative to the react
// wrapper (which does declare it) rather than from this script's location.
const reactRequire = createRequire(require.resolve("@monaco-editor/react/package.json"));
const monacoPkg = reactRequire.resolve("monaco-editor/package.json");
const sourceVs = path.join(path.dirname(monacoPkg), "min", "vs");
const targetVs = path.join(projectRoot, "public", "monaco", "vs");

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(sourceVs))) {
  console.error(`[copy-monaco] source not found: ${sourceVs}`);
  process.exit(1);
}

// Skip if already in place (keeps dev startup fast).
if (await exists(path.join(targetVs, "loader.js"))) {
  console.log("[copy-monaco] public/monaco/vs already present, skipping.");
  process.exit(0);
}

await rm(path.join(projectRoot, "public", "monaco"), { recursive: true, force: true });
await mkdir(path.dirname(targetVs), { recursive: true });
await cp(sourceVs, targetVs, { recursive: true });

console.log(`[copy-monaco] copied Monaco assets -> ${path.relative(projectRoot, targetVs)}`);
