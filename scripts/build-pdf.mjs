// Joins docs/*.md (in file-name order) into a single PDF: trabalho-devops.pdf.
//
// Markdown -> HTML with `marked`; ```mermaid blocks become diagrams rendered by
// Mermaid inside a headless Chromium/Edge (puppeteer-core), which then prints the PDF.
//
// Evidence still to be collected is written in the chapters as a blockquote that
// starts with **PENDENTE:**. Those blocks and images whose file does not exist yet
// are highlighted in red, and `npm run pending` lists them without building.
//
// Browser: set CHROME_PATH, or the script tries the usual Edge/Chrome locations.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Marked } from "marked";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DOCS = join(ROOT, "docs");
const BUILD = join(ROOT, "build");
const OUTPUT = join(ROOT, "trabalho-devops.pdf");
const PENDING_MARK = "PENDENTE:";

const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

function chapterFiles() {
  return readdirSync(DOCS)
    .filter((f) => /^\d{2}-.+\.md$/.test(f))
    .sort();
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Lists what is still missing: PENDENTE blocks and images whose file is absent.
function findPending(files) {
  const pending = [];
  for (const file of files) {
    const lines = readFileSync(join(DOCS, file), "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (line.includes(`**${PENDING_MARK}**`)) {
        pending.push(`${file}:${i + 1}  ${line.replace(/^>\s*/, "").trim()}`);
      }
      for (const [, src] of line.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
        if (!/^https?:/.test(src) && !existsSync(resolve(DOCS, src))) {
          pending.push(`${file}:${i + 1}  imagem ausente: ${src}`);
        }
      }
    });
  }
  return pending;
}

function renderMarkdown(files) {
  const headings = [];
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const id = slugify(text);
        if (depth <= 2) headings.push({ depth, text, id });
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      code({ text, lang }) {
        // Escaped in both cases: Mermaid reads textContent, which undoes the escaping.
        const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (lang === "mermaid") return `<pre class="mermaid">${escaped}</pre>\n`;
        return `<pre><code class="language-${lang ?? "text"}">${escaped}</code></pre>\n`;
      },
      image({ href, title, text }) {
        const local = !/^https?:/.test(href);
        const absolute = local ? resolve(DOCS, href) : href;
        if (local && !existsSync(absolute)) {
          return `<span class="missing-image">Imagem pendente: <code>${href}</code><br>${text}</span>`;
        }
        const src = local ? pathToFileURL(absolute).href : href;
        const caption = text ? `<figcaption>${text}</figcaption>` : "";
        return `<figure><img src="${src}" alt="${text}"${title ? ` title="${title}"` : ""}>${caption}</figure>`;
      },
      blockquote({ tokens }) {
        const body = this.parser.parse(tokens);
        const cls = body.includes(`<strong>${PENDING_MARK}</strong>`) ? ' class="pending"' : "";
        return `<blockquote${cls}>\n${body}</blockquote>\n`;
      },
    },
  });

  const sections = files.map((file) => {
    const md = readFileSync(join(DOCS, file), "utf8");
    const cls = file.startsWith("00-") ? "cover" : "chapter";
    return `<section class="${cls}">\n${marked.parse(md)}</section>`;
  });

  const toc = headings
    .filter((h) => h.depth === 1 && !h.id.startsWith("da-pesquisa"))
    .map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`)
    .join("\n");

  return { sections, toc };
}

function pageHtml({ sections, toc }) {
  const css = readFileSync(join(ROOT, "scripts", "pdf.css"), "utf8");
  const mermaid = pathToFileURL(join(ROOT, "node_modules", "mermaid", "dist", "mermaid.min.js")).href;
  const [cover, ...chapters] = sections;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Trabalho DevOps</title>
<style>${css}</style></head>
<body>
${cover}
<section class="toc"><h1 id="sumario">Sumário</h1><ol>${toc}</ol></section>
${chapters.join("\n")}
<script src="${mermaid}"></script>
<script>
  mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
  window.__mermaidDone = mermaid.run({ querySelector: "pre.mermaid" })
    .then(() => "ok")
    .catch((e) => "mermaid error: " + (e?.message ?? e?.str ?? JSON.stringify(e)));
</script>
</body></html>`;
}

async function printPdf(htmlPath) {
  const { default: puppeteer } = await import("puppeteer-core");
  const executablePath = BROWSER_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error("no Chrome/Edge found; set CHROME_PATH");
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });
    await page.waitForFunction("window.__mermaidDone !== undefined");
    const diagrams = await page.evaluate("window.__mermaidDone");
    if (diagrams !== "ok") throw new Error(diagrams);
    await page.pdf({
      path: OUTPUT,
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="font-size:8px;width:100%;text-align:center;color:#666;">Trabalho DevOps · página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
    });
  } finally {
    await browser.close();
  }
}

const files = chapterFiles();
const pending = findPending(files);

if (process.argv.includes("--pending-only")) {
  console.log(pending.length ? pending.join("\n") : "Nada pendente.");
  console.log(`\n${pending.length} pendência(s).`);
  process.exit(0);
}

mkdirSync(BUILD, { recursive: true });
const htmlPath = join(BUILD, "trabalho-devops.html");
writeFileSync(htmlPath, pageHtml(renderMarkdown(files)));
await printPdf(htmlPath);
console.log(`PDF gerado: ${OUTPUT} (${files.length} arquivos, ${pending.length} pendência(s))`);
if (pending.length) console.log("Rode `npm run pending` para ver a lista.");
