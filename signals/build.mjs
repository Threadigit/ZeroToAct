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
      <a href="/intelligence/" class="sig-nav-label">Intelligence</a>
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
    { loc: `${BASE}/intelligence/`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${BASE}/signals/`, priority: '0.9', changefreq: 'weekly' },
    ...signals.map((s) => ({ loc: editionUrl(s), priority: '0.8', changefreq: 'monthly', lastmod: s.date })),
    { loc: `${BASE}/africa-opportunity-map/`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${BASE}/nigeria-policy-tracker/`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${BASE}/annual-outlook/`, priority: '0.6', changefreq: 'monthly' },
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

// ── Intelligence hub + research product pages ──
const products = [
  {
    slug: 'signals', title: 'Weekly Signals', status: 'Live', href: '/signals/',
    blurb: 'Global economic, geopolitical and capital-markets analysis every week, ported into a peer cell so you act on it, not just read it.',
  },
  {
    slug: 'africa-opportunity-map', title: 'Africa Opportunity Map', status: 'Coming', href: '/africa-opportunity-map/',
    blurb: 'One country a week, all 54, through 2027. Built as one comparable dataset, not 54 disconnected essays.',
  },
  {
    slug: 'nigeria-policy-tracker', title: 'Nigeria Policy Tracker', status: 'Coming', href: '/nigeria-policy-tracker/',
    blurb: 'Federal policy dissected for what it means and what to do, split by who it hits.',
  },
  {
    slug: 'annual-outlook', title: 'Annual Outlook', status: 'Coming', href: '/annual-outlook/',
    blurb: "Grades last year's calls before making new ones, then tells you where to position for the next.",
  },
];

const briefCta = (label = 'Get the Free Brief') =>
  `<a class="sig-cta-btn" href="/#subscribe-section">${esc(label)}</a>`;

function hubPage() {
  const cards = products.map((p) => `
      <a class="hub-card${p.status === 'Live' ? ' hub-card--live' : ''}" href="${p.href}">
        <span class="hub-card-status">${esc(p.status)}</span>
        <h2 class="hub-card-title">${esc(p.title)}</h2>
        <p class="hub-card-blurb">${esc(p.blurb)}</p>
        <span class="hub-card-cta">${p.status === 'Live' ? 'Open' : 'Preview'} &rarr;</span>
      </a>`).join('\n');

  const body = `
  <main class="sig-wrap sig-index">
    <header class="sig-index-head">
      <p class="sig-eyebrow">The research operation</p>
      <h1 class="sig-index-title">Intelligence</h1>
      <p class="sig-index-sub">Weekly Signals, an annual Outlook, and living maps of the markets that matter. One research operation, four products, each built to end in a decision.</p>
    </header>
    <div class="hub-grid">${cards}
    </div>
    <div class="sig-cta-band">
      <div>
        <h2>Start with the free weekly brief.</h2>
        <p>The Signals are the entry point. One sharp read a week, no noise, unsubscribe anytime.</p>
      </div>
      ${briefCta()}
    </div>
  </main>`;

  return shell({
    title: 'Intelligence | ZeroToAct',
    desc: 'ZeroToAct’s research operation: weekly Signals, the Africa Opportunity Map, the Nigeria Policy Tracker, and the Annual Outlook, for operators building in Africa and beyond.',
    canonical: `${BASE}/intelligence/`, body,
  });
}

// Shared chrome for a single research-product page.
function productShell({ slug, title, desc, status, claim, sections, cta }) {
  const url = `${BASE}/${slug}/`;
  const body = `
  <main class="sig-wrap sig-article">
    <a href="/intelligence/" class="sig-back">&larr; Intelligence</a>
    <p class="sig-eyebrow">Intelligence &middot; ${esc(status)}</p>
    <h1 class="sig-title">${esc(title)}</h1>
    <p class="sig-claim">${esc(claim)}</p>
    ${sections}
    <div class="sig-cta-band">
      <div>
        <h2>${esc(cta.heading)}</h2>
        <p>${esc(cta.sub)}</p>
      </div>
      ${briefCta(cta.label)}
    </div>
  </main>`;
  return shell({ title: `${title} | ZeroToAct`, desc, canonical: url, body });
}

function africaMapPage() {
  const fields = [
    ['Macro snapshot', 'GDP, growth, inflation, and the currency regime, on one comparable scale.'],
    ['Capital access', 'Where equity, debt and DFI money is actually flowing, and which investors are active.'],
    ['Policy and regulation', 'The rules that help or block an operator, and the reforms that just changed them.'],
    ['Sectors in play', 'Where the near-term opportunity concentrates, and where it does not.'],
    ['Risks', 'Currency, political, liquidity, and capital-repatriation risk, stated plainly.'],
    ['The move', 'How an operator should position in this market now, not in five years.'],
  ].map(([h, p]) => `<li><strong>${esc(h)}.</strong> ${esc(p)}</li>`).join('\n        ');

  const sections = `
    <div class="sig-body">
      <p>Every week we publish one country file, working through all 54 by the end of 2027. Because every file carries the same fields in the same order, you can line countries up against each other and compare, instead of reading 54 disconnected essays.</p>
    </div>
    <div class="sig-block">
      <h2>What every country file carries</h2>
      <ul class="sig-fields">
        ${fields}
      </ul>
      <p class="sig-note">Working field set, being finalised. Tell us what a country file must answer for your decisions and it goes in.</p>
    </div>
    <div class="sig-block">
      <h2>Cadence</h2>
      <p>One country a week, in public, until all 54 are covered by the end of 2027.</p>
    </div>`;

  return productShell({
    slug: 'africa-opportunity-map',
    title: 'The Africa Opportunity Map',
    desc: 'One African country a week, all 54 through 2027, as one comparable dataset for operators deciding where to build.',
    status: 'Coming',
    claim: 'One country a week, all 54, through 2027. A comparable dataset, not 54 essays.',
    sections,
    cta: { heading: 'Get on the list.', sub: 'The weekly brief is where the Map ships first. Subscribe and you will not miss a country.', label: 'Join the waitlist' },
  });
}

function nigeriaTrackerPage() {
  const segs = [
    ['Upper income', 'What the policy does to capital, assets, tax exposure and cross-border options, and how to protect and position.'],
    ['Middle income', 'What it means for salaries, savings, credit and small-business costs, and the moves that still make sense.'],
    ['Base of the pyramid', 'What it changes in prices, transport, informal income and everyday costs, and where relief or pressure lands.'],
  ].map(([h, p]) => `<li><strong>${esc(h)}.</strong> ${esc(p)}</li>`).join('\n        ');

  const sections = `
    <div class="sig-body">
      <p>We take each significant federal policy move, a subsidy, an FX rule, a tax change, a rate decision, and translate it into what it means and what to do about it. No press-release summaries. What changed, who it hits, and the move.</p>
    </div>
    <div class="sig-block">
      <h2>Every read, split three ways</h2>
      <ul class="sig-fields">
        ${segs}
      </ul>
      <p class="sig-note">Because the same policy is an opportunity for one household and a squeeze for another, every read is segmented by income band.</p>
    </div>
    <div class="sig-block">
      <h2>Cadence</h2>
      <p>Published with each major federal policy move, with a standing monthly round-up. Final cadence to be confirmed.</p>
    </div>`;

  return productShell({
    slug: 'nigeria-policy-tracker',
    title: 'The Nigeria Policy Tracker',
    desc: 'Federal policy dissected for what it means and what to do, segmented by upper income, middle income and base of the pyramid.',
    status: 'Coming',
    claim: 'Federal policy, dissected for what it means and what to do, split by who it hits.',
    sections,
    cta: { heading: 'Get on the list.', sub: 'The Tracker ships to brief subscribers first. Subscribe to be there when it opens.', label: 'Join the waitlist' },
  });
}

function annualOutlookPage() {
  const sections = `
    <div class="sig-body">
      <p>Once a year, one publication reviews the year of Signals and tells you where to position for the next. It is the point where twelve months of weekly intelligence becomes a single, considered stance.</p>
    </div>
    <div class="sig-block sig-block--move">
      <h2>It grades its own calls</h2>
      <p>Before it makes a single new call, the Outlook publishes which of the year's Signals held and which did not. You see the track record before you read the forecast. Most outlooks quietly forget last year's; this one starts there.</p>
    </div>
    <div class="sig-block">
      <h2>It is built from the year's work</h2>
      <p>The Outlook is assembled, not invented. It draws on the year's Signals, the outcomes recorded inside the accountability cells, and the country files from the Africa Opportunity Map. It is the compounding of everything the operation already published.</p>
    </div>
    <div class="sig-block">
      <h2>It sets up the Summit</h2>
      <p>The Outlook is where the year's intelligence becomes a position. The <a href="/#summit-section">Annual Summit</a> is where you turn that position into a personal 12-month plan. The first Outlook lands alongside the 2027 Summit.</p>
    </div>`;

  return productShell({
    slug: 'annual-outlook',
    title: 'The Annual Outlook',
    desc: 'The year-ahead publication that grades last year’s calls before making new ones, built from the year’s Signals, cell outcomes and country files.',
    status: 'Annual',
    claim: "One publication a year that grades last year's calls, then tells you where to position for the next.",
    sections,
    cta: { heading: 'Be there for the first one.', sub: 'The first Annual Outlook lands with the 2027 Summit. Subscribe to the brief to get it.', label: 'Get the Free Brief' },
  });
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

write('intelligence/index.html', hubPage());
write('africa-opportunity-map/index.html', africaMapPage());
write('nigeria-policy-tracker/index.html', nigeriaTrackerPage());
write('annual-outlook/index.html', annualOutlookPage());

console.log(`\nGenerated ${signals.length} editions, the Intelligence hub, and 3 product pages.`);
