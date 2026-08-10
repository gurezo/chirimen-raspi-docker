import { mkdir, readdir, readFile, writeFile, cp, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const siteRoot = path.join(root, '_site');
const docsRoot = path.join(root, 'docs');

const DOC_SECTIONS = ['guides', 'architecture'];

const sharedStyles = `
:root {
  color-scheme: light dark;
  --bg: #f6f8fa;
  --fg: #1f2328;
  --muted: #59636e;
  --link: #0969da;
  --border: #d1d9e0;
  --card: #ffffff;
  --code-bg: #f0f2f4;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #e6edf3;
    --muted: #9198a1;
    --link: #4493f8;
    --border: #3d444d;
    --card: #161b22;
    --code-bg: #21262d;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
}
main {
  max-width: 800px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
}
nav {
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}
nav a { color: var(--link); text-decoration: none; }
nav a:hover { text-decoration: underline; }
article h1 {
  margin: 0 0 1rem;
  font-size: 1.75rem;
  font-weight: 600;
}
article h2 {
  margin: 2rem 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.35rem;
}
article h3 {
  margin: 1.5rem 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
}
article a { color: var(--link); text-decoration: none; }
article a:hover { text-decoration: underline; }
article p, article ul, article ol, article table, article pre {
  margin: 0 0 1rem;
}
article ul, article ol { padding-left: 1.25rem; }
article li + li { margin-top: 0.25rem; }
article code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  background: var(--code-bg);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
article pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.9rem 1rem;
  overflow-x: auto;
}
article pre code {
  background: transparent;
  padding: 0;
}
article table {
  width: 100%;
  border-collapse: collapse;
  display: block;
  overflow-x: auto;
}
article th, article td {
  border: 1px solid var(--border);
  padding: 0.45rem 0.65rem;
  text-align: left;
}
article th { background: var(--card); }
article blockquote {
  margin: 0 0 1rem;
  padding: 0.25rem 0 0.25rem 1rem;
  border-left: 3px solid var(--border);
  color: var(--muted);
}
`.trim();

function rewriteMarkdownLinks(markdown) {
  return markdown.replace(
    /\]\(([^)]+?)\.md(#[^)]*)?\)/g,
    (_match, target, hash = '') => `](${target}.html${hash})`,
  );
}

function extractTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function renderPage({ title, bodyHtml, homeHref }) {
  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} · chirimen-raspi-docker</title>
    <style>
${sharedStyles}
    </style>
  </head>
  <body>
    <main>
      <nav><a href="${homeHref}">← Documentation</a></nav>
      <article>
${bodyHtml}
      </article>
    </main>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function convertSection(section) {
  const sourceDir = path.join(docsRoot, section);
  const outputDir = path.join(siteRoot, section);
  await mkdir(outputDir, { recursive: true });

  const entries = await readdir(sourceDir);
  const markdownFiles = entries.filter((name) => name.endsWith('.md'));

  for (const fileName of markdownFiles) {
    const sourcePath = path.join(sourceDir, fileName);
    const markdown = await readFile(sourcePath, 'utf8');
    const rewritten = rewriteMarkdownLinks(markdown);
    const title = extractTitle(markdown, fileName.replace(/\.md$/, ''));
    const bodyHtml = await marked.parse(rewritten);
    const html = renderPage({
      title,
      bodyHtml,
      homeHref: '../index.html',
    });
    const outName = fileName.replace(/\.md$/, '.html');
    await writeFile(path.join(outputDir, outName), html, 'utf8');
  }

  return markdownFiles.length;
}

async function main() {
  await mkdir(siteRoot, { recursive: true });

  const portalSource = path.join(docsRoot, 'site', 'index.html');
  await cp(portalSource, path.join(siteRoot, 'index.html'));
  await writeFile(path.join(siteRoot, '.nojekyll'), '', 'utf8');

  let converted = 0;
  for (const section of DOC_SECTIONS) {
    converted += await convertSection(section);
  }

  const apiSource = path.join(docsRoot, 'api');
  if (await pathExists(apiSource)) {
    await cp(apiSource, path.join(siteRoot, 'api'), { recursive: true });
  }

  console.log(
    `docs site built at ${path.relative(root, siteRoot)} (${converted} markdown pages)`,
  );
}

await main();
