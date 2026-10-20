// Checks the built site: every internal link and image points at a file that exists, every page has a title, description and one h1,
// and no {{placeholder}} was left unfilled. Run after a build: npm run check
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const base = (process.env.BASE_PATH ?? config.basePath).replace(/\/+$/, '');

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const pages = walk(dist).filter((f) => f.endsWith('.html'));
const problems = [];
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const htmlByPath = new Map(pages.map((p) => [p, readFileSync(p, 'utf8')]));

const resolve = (href) => {
  let path = href.split('#')[0].split('?')[0];
  if (base && path.startsWith(base + '/')) path = path.slice(base.length);
  else if (base && path === base) path = '/';
  const file = join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) return join(file, 'index.html');
  return file;
};

for (const [page, html] of htmlByPath) {
  const name = page.replace(dist, '');
  if (/\{\{[^}]+\}\}/.test(html)) problems.push(`${name}: an unfilled {{placeholder}}: ${html.match(/\{\{[^}]+\}\}/)[0]}`);
  if (!/<title>[^<]{5,}<\/title>/.test(html)) problems.push(`${name}: no title`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) problems.push(`${name}: no description`);
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) problems.push(`${name}: ${h1s} h1 elements (want 1)`);
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(url)) continue;
    if (url.startsWith('#')) { if (!idsOf(html).has(url.slice(1))) problems.push(`${name}: #${url.slice(1)} is not on the page`); continue; }
    const file = resolve(url);
    if (!existsSync(file)) { problems.push(`${name}: ${url} → missing`); continue; }
    const hash = url.split('#')[1];
    if (hash && file.endsWith('.html') && !idsOf(readFileSync(file, 'utf8')).has(hash)) problems.push(`${name}: ${url} → #${hash} is not on that page`);
  }
  for (const m of html.matchAll(/<img[^>]*>/g)) if (!/\salt=/.test(m[0])) problems.push(`${name}: an image with no alt: ${m[0].slice(0, 60)}`);
}
if (problems.length) { console.error(`${problems.length} problem(s):\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log(`Checked ${pages.length} pages: links, anchors, titles, descriptions, headings and images are fine.`);
