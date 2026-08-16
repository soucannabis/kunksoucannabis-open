#!/usr/bin/env node
/**
 * Dev do website: sync contínuo de project-tools/docs + Astro com HMR.
 */
import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(__dirname, "..");
const docsRoot = path.resolve(websiteRoot, "../../project-tools/docs");
const syncScript = path.join(__dirname, "sync-docs.mjs");

function sync(reason = "start") {
  console.log(`[website:dev] sync-docs (${reason})`);
  const result = spawn(process.execPath, [syncScript], {
    cwd: websiteRoot,
    stdio: "inherit",
  });
  return new Promise((resolve, reject) => {
    result.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`sync-docs exited ${code}`));
    });
  });
}

await sync("initial");

let debounce;
watch(docsRoot, { recursive: true }, (_event, filename) => {
  if (!filename || !/\.md$/i.test(String(filename))) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    sync(String(filename)).catch((err) => {
      console.error("[website:dev]", err.message);
    });
  }, 250);
});
console.log(`[website:dev] watching ${path.relative(websiteRoot, docsRoot)}/**/*.md`);

const astro = spawn(
  "astro",
  ["dev", "--host", "0.0.0.0", "--port", "4260"],
  {
    cwd: websiteRoot,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: "1",
    },
  }
);

const stop = () => {
  astro.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

astro.on("exit", (code) => process.exit(code ?? 0));
