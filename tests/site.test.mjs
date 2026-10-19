// Static checks on the publishable site: every local asset referenced by index.html
// exists, every script parses, and the version placeholders the build relies on are present.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import vm from "node:vm";

const APP = fileURLToPath(new URL("../app/", import.meta.url));
const html = readFileSync(join(APP, "index.html"), "utf8");

test("every local asset referenced by index.html exists", () => {
  const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((ref) => !/^(?:[a-z]+:)?\/\//i.test(ref) && !ref.startsWith("#"));
  assert.ok(refs.length >= 10, `expected the stylesheet and scripts, found ${refs.length} refs`);
  const missing = refs.filter((ref) => !existsSync(join(APP, ref)));
  assert.deepEqual(missing, []);
});

test("every script in app/js parses", () => {
  const dir = join(APP, "js");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    assert.doesNotThrow(
      () => new vm.Script(readFileSync(join(dir, file), "utf8"), { filename: file }),
      `${file} has a syntax error`,
    );
  }
});

test("index.html keeps the placeholders stamped by the build", () => {
  assert.match(html, /__APP_VERSION__/);
  assert.match(html, /__BUILD_DATE__/);
});

test("the MIT license of the original project ships with the app", () => {
  const license = readFileSync(join(APP, "LICENSE.txt"), "utf8");
  assert.match(license, /The MIT License/);
  assert.match(license, /Gabriele Cirulli/);
});
