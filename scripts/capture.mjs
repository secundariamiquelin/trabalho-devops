// Screenshot helper for public pages used as evidence in the chapters.
// Usage:
//   node scripts/capture.mjs <url> <output.png> [--width=1366] [--height=900]
//        [--scroll-to="css selector"] [--scroll-text="phrase"] [--hide="css1, css2"] [--full]
// --hide only sets display:none on overlays (cookie banners); it never clicks them.
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const [url, out, ...flags] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node scripts/capture.mjs <url> <output.png> [flags]");
  process.exit(2);
}
const opt = Object.fromEntries(
  flags.map((f) => {
    const [k, ...v] = f.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const executablePath = [
  process.env.CHROME_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
].find((p) => p && existsSync(p));

const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(opt.width ?? 1366), height: Number(opt.height ?? 900) });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
  if (opt.hide) {
    await page.addStyleTag({ content: `${opt.hide} { display: none !important; }` });
  }
  if (opt["scroll-to"]) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`selector not found: ${sel}`);
      el.scrollIntoView({ block: "start" });
      window.scrollBy(0, -16);
    }, opt["scroll-to"]);
  }
  if (opt["scroll-text"]) {
    // Scrolls to the innermost element whose own text contains the given phrase.
    await page.evaluate((phrase) => {
      const match = [...document.querySelectorAll("h1,h2,h3,h4,p,li,td,dt,span,strong")]
        .find((el) => el.textContent.includes(phrase));
      if (!match) throw new Error(`text not found: ${phrase}`);
      match.scrollIntoView({ block: "start" });
      window.scrollBy(0, -24);
    }, opt["scroll-text"]);
  }
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: out, fullPage: Boolean(opt.full) });
  console.log(`saved ${out}`);
} finally {
  await browser.close();
}
