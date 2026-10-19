// Runs the real build and checks its output: the version reaches both the page and
// version.txt, which is what the deploy health check compares against the commit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("build stamps the commit version into the page and version.txt", () => {
  const sha = "abc1234def5678";
  execFileSync(process.execPath, [join(ROOT, "scripts", "build.mjs")], {
    env: { ...process.env, GITHUB_SHA: sha },
    stdio: "pipe",
  });
  const page = readFileSync(join(ROOT, "dist", "index.html"), "utf8");
  assert.match(page, /Versão publicada: <code>abc1234<\/code>/);
  assert.doesNotMatch(page, /__APP_VERSION__|__BUILD_DATE__/);
  assert.equal(readFileSync(join(ROOT, "dist", "version.txt"), "utf8"), "abc1234\n");
});
