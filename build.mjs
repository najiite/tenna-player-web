// Builds the site into ./dist: every page in src/pages is wrapped in src/layout.html, public/ is copied as it is, and
// sitemap.xml and robots.txt are written. No dependencies; Node 20 or newer.
//
//   SITE_URL   the address the site is served from (canonical links, sitemap), default from site.config.json
//   BASE_PATH  a folder the site lives in, e.g. /tenna-player-web on GitHub Pages ("" for a domain of its own)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
config.siteUrl = (process.env.SITE_URL ?? config.siteUrl).replace(/\/+$/, '');
config.basePath = (process.env.BASE_PATH ?? config.basePath).replace(/\/+$/, '');
const dist = join(root, 'dist');

// Navigation: what the header shows, and the footer's columns
const NAV = [
  { slug: 'features', label: 'Features' },
  { slug: 'download', label: 'Download' },
  { slug: 'faq', label: 'FAQ' },
];

const lookup = (path) => path.split('.').reduce((value, key) => (value == null ? value : value[key]), config);

// {{c:downloads.windows}} a value from site.config.json, {{icon:tv}} an icon from the sprite in the layout, {{base}} the base path,
// {{name}} any value given for the page; unknown names are left visible so a typo shows up in the check
function fill(text, values) {
  return text
    .replace(/\{\{icon:([a-z0-9-]+)\}\}/g, '<svg class="i" aria-hidden="true" focusable="false"><use href="#i-$1"></use></svg>')
    .replace(/\{\{c:([A-Za-z0-9_.]+)\}\}/g, (match, path) => String(lookup(path) ?? match))
    .replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, name) => (name in values ? String(values[name]) : match));
}

function parsePage(file) {
  const raw = readFileSync(file, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file}: a page starts with a --- front matter block`);
  const meta = {};
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(':');
    if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { meta, body: match[2] };
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'public'), dist, { recursive: true });

const layout = readFileSync(join(root, 'src', 'layout.html'), 'utf8');
const pagesDir = join(root, 'src', 'pages');
const pages = readdirSync(pagesDir).filter((f) => f.endsWith('.html')).map((f) => ({ file: f, ...parsePage(join(pagesDir, f)) }));

const sitemap = [];
for (const page of pages) {
  const slug = page.meta.slug ?? '';
  const isNotFound = page.meta.type === 'notfound';
  const path = slug ? `/${slug}/` : '/';
  const base = config.basePath;
  const shared = {
    base,
    title: page.meta.title ? `${page.meta.title} · ${config.name}` : `${config.name}: ${config.tagline}`,
    heading: page.meta.title ?? config.name,
    description: page.meta.description ?? config.description,
    canonical: `${config.siteUrl}${path}`,
    ogImage: `${config.siteUrl}/img/og.png`,
    year: new Date().getFullYear(),
    bodyClass: page.meta.bodyClass ?? '',
    robots: page.meta.robots ?? 'index,follow',
  };
  const nav = NAV.map((n) => `<a href="${base}/${n.slug}/"${n.slug === slug ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  const content = fill(page.body, shared);
  const html = fill(layout, { ...shared, nav, content });
  const out = isNotFound ? join(dist, '404.html') : join(dist, slug, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  if (!isNotFound && page.meta.sitemap !== 'no') sitemap.push({ loc: `${config.siteUrl}${path}`, priority: page.meta.priority ?? '0.5' });
}

writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
  .map((s) => `  <url><loc>${s.loc}</loc><priority>${s.priority}</priority></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${config.siteUrl}/sitemap.xml\n`);
if (!existsSync(join(dist, '.nojekyll'))) writeFileSync(join(dist, '.nojekyll'), '');
console.log(`Built ${pages.length} pages into dist/ (site ${config.siteUrl}${config.basePath || ''})`);
