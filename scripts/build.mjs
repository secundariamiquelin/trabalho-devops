// Builds the publishable copy of the app: app/ -> dist/.
// The only transformation is stamping the version (commit SHA) and build date
// into index.html and writing dist/version.txt, which the deploy health check reads.
import { cpSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "app");
const OUT = join(ROOT, "dist");

function resolveVersion() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "local";
  }
}

const version = resolveVersion();
const buildDate = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, { recursive: true });

const indexPath = join(OUT, "index.html");
const html = readFileSync(indexPath, "utf8");
if (!html.includes("__APP_VERSION__") || !html.includes("__BUILD_DATE__")) {
  throw new Error("index.html lost the __APP_VERSION__/__BUILD_DATE__ placeholders");
}
writeFileSync(
  indexPath,
  html.replaceAll("__APP_VERSION__", version).replaceAll("__BUILD_DATE__", buildDate),
);
writeFileSync(join(OUT, "version.txt"), `${version}\n`);

console.log(`build ok: dist/ version=${version} date=${buildDate}`);
