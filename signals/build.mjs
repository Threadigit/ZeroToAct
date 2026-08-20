// ZeroToAct Signal archive generator.
// Usage: node signals/build.mjs
// Reads signals/signals.json and writes the archive index, one page per
// edition (signals/<slug>/index.html), signals/feed.xml, and refreshes the
// root sitemap.xml. Output is committed so GitHub Pages serves static HTML.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE = 'https://zerotoact.com';
const OG_IMAGE = `${BASE}/og-image-v2.png`;
const AUTHOR = { name: 'Tolu Adetuyi', url: 'https://adetuyi.com' };

const data = JSON.parse(readFileSync(resolve(__dirname, 'signals.json'), 'utf8'));
const signals = [...data.signals].sort((a, b) => b.date.localeCompare(a.date));
const themes = data.meta.themes;

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const longDate = (iso) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

const rfc822 = (iso) => new Date(iso + 'T12:00:00Z').toUTCString();
const editionPath = (s) => `/signals/${s.slug}/`;        // root-relative, for on-site links
const editionUrl = (s) => `${BASE}${editionPath(s)}`;    // absolute, for canonical/OG/RSS/sitemap/citation
const label = (s) => (s.number ? `Signal ${s.number}` : 'Signal');
const citation = (s) =>
  `ZeroToAct, ${s.number ? `Signal ${s.number}, ` : ''}${s.title}, ${longDate(s.date)}, ${editionUrl(s)}`;

const shell = ({ title, desc, canonical, head = '', body }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${canonical}" />
  <link rel="icon" type="image/png" href="/favicon-v2.png" />
  <meta name="theme-color" content="#0a0a0a" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <link rel="alternate" type="application/rss+xml" title="ZeroToAct Signals" href="/signals/feed.xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400;1,700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css" />
  <link rel="stylesheet" href="/signals/signals.css" />
${head}</head>
<body>
  <nav class="sig-nav">
    <div class="sig-nav-inner">
      <a href="/" class="sig-nav-logo" aria-label="ZeroToAct home"><img src="/favicon-v2.png" alt="" width="32" height="32" /></a>
      <a href="/signals/" class="sig-nav-label">The Signal Archive</a>
      <a href="/#subscribe-section" class="sig-nav-cta">Get the Free Brief</a>
    </div>
  </nav>
  ${body}
  <footer class="sig-footer">
    <div class="sig-wrap">
      <p>A weekly intelligence operation that moves operators from knowing to doing.</p>
      <p class="sig-footer-meta">&copy; ${new Date().getFullYear()} ZeroToAct. Convened by <a href="${AUTHOR.url}" target="_blank" rel="noopener noreferrer">${AUTHOR.name}</a>. &middot; <a href="/signals/feed.xml">RSS</a></p>
    </div>
  </footer>
</body>
</html>
`;

// ── Per-edition page ──
function editionPage(s) {
  const url = editionUrl(s);
  const eyebrowBits = [s.theme, longDate(s.date)];
  if (s.number) eyebrowBits.unshift(`Signal ${s.number}`);

  const article = s.written
    ? s.written.map((p) => `<p>${esc(p)}</p>`).join('\n        ')
    : `<p class="sig-pending">The written brief for this Signal is being prepared from the video above. Watch the Signal in the meantime, or <a href="/#subscribe-section">get the weekly brief by email</a>.</p>`;

  const draftBanner = s.status === 'draft' && s.written
    ? `<p class="sig-draft-note" role="note">Draft for review. Not yet published.</p>`
    : '';

  const method = s.method
    ? `<div class="sig-block"><h2>Method</h2><p>${esc(s.method)}</p></div>` : '';
  const sources = s.sources || [];
  const source = s.written
    ? `<div class="sig-block"><h2>Source</h2>${
        sources.length
          ? `<ul class="sig-sources">${sources.map((src) =>
              `<li><a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(src.label)}</a></li>`).join('')}</ul>`
          : `<p><span class="sig-flag">Source link pending.</span></p>`
      }</div>`
    : '';
  const proveWrong = s.proveWrong
    ? `<div class="sig-block"><h2>What would prove this wrong</h2><p>${esc(s.proveWrong)}</p></div>` : '';
  const nextMove = s.nextMove
    ? `<div class="sig-block sig-block--move"><h2>Next move</h2><p>${esc(s.nextMove)}</p></div>` : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: s.title,
    description: s.headlineClaim,
    datePublished: s.date,
    image: OG_IMAGE,
    author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
    publisher: {
      '@type': 'Organization', name: 'ZeroToAct',
      logo: { '@type': 'ImageObject', url: `${BASE}/favicon-v2.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isPartOf: { '@type': 'CreativeWorkSeries', name: 'ZeroToAct Weekly Signal' },
  };

  const body = `
  <main class="sig-wrap sig-article">
    <a href="/signals/" class="sig-back">&larr; The Signal Archive</a>
    <p class="sig-eyebrow">${eyebrowBits.map(esc).join(' &middot; ')}</p>
    <h1 class="sig-title">${esc(s.title)}</h1>
    <p class="sig-claim">${esc(s.headlineClaim)}</p>
    ${draftBanner}
    <div class="sig-video">
      <iframe src="https://www.youtube-nocookie.com/embed/${esc(s.videoId)}" title="${esc(s.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>
    <div class="sig-body">
        ${article}
    </div>
    ${method}
    ${source}
    ${proveWrong}
    ${nextMove}
    <div class="sig-cite">
      <h2>Cite this Signal</h2>
      <p class="sig-cite-text">${esc(citation(s))}</p>
    </div>
    <div class="sig-byline">
      <span>By <a href="${AUTHOR.url}" target="_blank" rel="noopener noreferrer">${AUTHOR.name}</a>, Convener, ZeroToAct</span>
    </div>
  </main>`;

  const head = `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n`;
  return shell({
    title: `${s.title} | ZeroToAct ${label(s)}`,
    desc: s.headlineClaim, canonical: url, head, body,
  });
}

// ── Archive index ──
function indexPage() {
  const filters = [`<button class="sig-filter is-active" data-theme="all" type="button">All</button>`]
    .concat(themes.map((t) => `<button class="sig-filter" data-theme="${esc(t)}" type="button">${esc(t)}</button>`))
    .join('\n        ');

  const cards = signals.map((s) => `
      <article class="sig-card" data-theme="${esc(s.theme)}">
        <a class="sig-card-link" href="${editionPath(s)}">
          <div class="sig-card-meta"><span>${s.number ? `Signal ${s.number} &middot; ` : ''}${esc(longDate(s.date))}</span><span class="sig-card-theme">${esc(s.theme)}</span></div>
          <h2 class="sig-card-title">${esc(s.title)}</h2>
          <p class="sig-card-claim">${esc(s.headlineClaim)}</p>
          <span class="sig-card-cta">Read the Signal &rarr;</span>
        </a>
      </article>`).join('\n');

  const body = `
  <main class="sig-wrap sig-index">
    <header class="sig-index-head">
      <p class="sig-eyebrow">Weekly intelligence, on the record</p>
      <h1 class="sig-index-title">The Signal Archive</h1>
      <p class="sig-index-sub">Every weekly Signal, kept as a dated, citable record. Capital, policy, technology, and the global shifts that change what an operator should do next. <a href="/signals/feed.xml">Subscribe by RSS</a>.</p>
    </header>
    <div class="sig-filters" role="group" aria-label="Filter by theme">
        ${filters}
    </div>
    <div class="sig-grid">${cards}
    </div>
  </main>
  <script>
    (function () {
      var btns = document.querySelectorAll('.sig-filter');
      var cards = document.querySelectorAll('.sig-card');
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          btns.forEach(function (x) { x.classList.remove('is-active'); });
          b.classList.add('is-active');
          var t = b.getAttribute('data-theme');
          cards.forEach(function (c) {
            c.style.display = (t === 'all' || c.getAttribute('data-theme') === t) ? '' : 'none';
          });
        });
      });
    }());
  </script>`;

  return shell({
    title: 'The Signal Archive | ZeroToAct',
    desc: 'Every weekly ZeroToAct Signal, kept as a dated, citable record of capital, policy, and global shifts for operators building in Africa and beyond.',
    canonical: `${BASE}/signals/`, body,
  });
}

// ── RSS ──
function feed() {
  const items = signals.map((s) => `    <item>
      <title>${esc(s.title)}</title>
      <link>${editionUrl(s)}</link>
      <guid isPermaLink="true">${editionUrl(s)}</guid>
      <pubDate>${rfc822(s.date)}</pubDate>
      <description>${esc(s.headlineClaim)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ZeroToAct Signals</title>
    <link>${BASE}/signals/</link>
    <description>Weekly intelligence on capital, policy, and global markets for operators building in Africa and beyond.</description>
    <language>en</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${BASE}/signals/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

// ── Sitemap (home + archive + editions) ──
function sitemap() {
  const urls = [
    { loc: `${BASE}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${BASE}/signals/`, priority: '0.9', changefreq: 'weekly' },
    ...signals.map((s) => ({ loc: editionUrl(s), priority: '0.8', changefreq: 'monthly', lastmod: s.date })),
  ];
  const body = urls.map((u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

// ── Write everything ──
const write = (rel, content) => {
  const full = resolve(ROOT, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  console.log('wrote', rel);
};

write('signals/index.html', indexPage());
write('signals/feed.xml', feed());
write('sitemap.xml', sitemap());
for (const s of signals) write(`signals/${s.slug}/index.html`, editionPage(s));
console.log(`\nGenerated ${signals.length} editions.`);
