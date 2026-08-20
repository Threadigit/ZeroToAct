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

// Shared site chrome, matched to index.html so every page navigates identically.
const SITE_NAV = `  <nav id="nav" role="navigation" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="/" class="nav-logo" aria-label="ZeroToAct Home"><img src="/favicon-v2.png" alt="" width="36" height="36" /></a>
      <ul class="nav-links" role="list">
        <li class="nav-dropdown">
          <button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">Intelligence<span class="nav-caret" aria-hidden="true">&#9662;</span></button>
          <div class="nav-dropdown-panel" role="menu" aria-label="Intelligence products">
            <a href="/signals/" class="nav-dd-item" role="menuitem">
              <span class="nav-dd-title">Weekly Signals <span class="nav-dd-badge">Live</span></span>
              <span class="nav-dd-desc">Global economic, geopolitical and capital-markets analysis, every week.</span>
            </a>
            <a href="/africa-opportunity-map/" class="nav-dd-item" role="menuitem">
              <span class="nav-dd-title">Africa Opportunity Map</span>
              <span class="nav-dd-desc">One country a week, all 54, as one comparable dataset.</span>
            </a>
            <a href="/annual-outlook/" class="nav-dd-item" role="menuitem">
              <span class="nav-dd-title">Annual Outlook</span>
              <span class="nav-dd-desc">Grades last year's calls, then sets where to position next.</span>
            </a>
            <a href="/nigeria-policy-tracker/" class="nav-dd-item" role="menuitem">
              <span class="nav-dd-title">Nigeria Policy Tracker</span>
              <span class="nav-dd-desc">Federal policy, what it means and what to do.</span>
            </a>
          </div>
        </li>
        <li><a href="/#summit-section" class="nav-link">Summit</a></li>
        <li><a href="/#community-section" class="nav-link">Community</a></li>
      </ul>
      <button type="button" class="nav-cta join-cta-trigger" data-intent="brief">Get the Free Brief</button>
      <button type="button" class="nav-hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
    </div>
    <div class="nav-mobile-menu" id="mobile-menu" aria-hidden="true">
      <span class="mobile-group-label">Intelligence</span>
      <a href="/signals/" class="mobile-link mobile-sublink">Weekly Signals</a>
      <a href="/africa-opportunity-map/" class="mobile-link mobile-sublink">Africa Opportunity Map</a>
      <a href="/annual-outlook/" class="mobile-link mobile-sublink">Annual Outlook</a>
      <a href="/nigeria-policy-tracker/" class="mobile-link mobile-sublink">Nigeria Policy Tracker</a>
      <a href="/#summit-section" class="mobile-link">Summit</a>
      <a href="/#community-section" class="mobile-link">Community</a>
      <button type="button" class="mobile-link mobile-link-cta join-cta-trigger" data-intent="brief">Get the Free Brief</button>
    </div>
  </nav>`;

const SITE_FOOTER = `  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="/" class="footer-logo" aria-label="ZeroToAct Home"><img src="/favicon-v2.png" alt="" width="48" height="48" loading="lazy" decoding="async" /></a>
          <p class="footer-tagline">A weekly intelligence operation that moves operators<br />from knowing to doing.</p>
        </div>
        <nav class="footer-nav" aria-label="Footer navigation">
          <div class="footer-nav-group">
            <p class="footer-nav-label">Intelligence</p>
            <a href="/signals/" class="footer-nav-link">Weekly Signals</a>
            <a href="/africa-opportunity-map/" class="footer-nav-link">Africa Opportunity Map</a>
            <a href="/annual-outlook/" class="footer-nav-link">Annual Outlook</a>
            <a href="/nigeria-policy-tracker/" class="footer-nav-link">Nigeria Policy Tracker</a>
          </div>
          <div class="footer-nav-group">
            <p class="footer-nav-label">Explore</p>
            <a href="/#summit-section" class="footer-nav-link">Summit</a>
            <a href="/#community-section" class="footer-nav-link">Community</a>
            <a href="/#faq" class="footer-nav-link">FAQ</a>
            <a href="https://adetuyi.com" target="_blank" rel="noopener noreferrer" class="footer-nav-link">Convener</a>
          </div>
        </nav>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">&copy; ${new Date().getFullYear()} ZeroToAct. All rights reserved. Convened by <a href="${AUTHOR.url}" target="_blank" rel="noopener noreferrer" class="footer-convener-link">${AUTHOR.name}</a>.</p>
        <a href="https://instagram.com/zerotoact" class="footer-instagram" target="_blank" rel="noopener noreferrer" aria-label="ZeroToAct on Instagram"><svg class="footer-insta-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>@zerotoact</a>
      </div>
    </div>
  </footer>`;

const JOIN_MODAL = `  <div id="join-modal" class="join-modal" aria-hidden="true" aria-modal="true" role="dialog" aria-label="Join ZeroToAct">
    <div class="join-modal-overlay" id="join-modal-overlay"></div>
    <div class="join-modal-container">
      <button type="button" class="join-modal-close" id="join-modal-close" aria-label="Close application form">&times;</button>
      <div class="join-modal-content" id="join-modal-form-panel">
        <h3 class="join-modal-title" id="join-modal-title">Get the Weekly Brief</h3>
        <p class="join-modal-desc">One email is all it takes. Your first intelligence brief is next.</p>
        <form id="join-application-form" novalidate>
          <div class="form-group" data-field="name" hidden><label for="join-name" class="form-label">Full Name</label><input type="text" id="join-name" name="name" class="form-input" placeholder="Your full name" /><span class="form-error" id="error-name"></span></div>
          <div class="form-group" data-field="email"><label for="join-email" class="form-label">Email Address</label><input type="email" id="join-email" name="email" class="form-input" placeholder="Your email address" required /><span class="form-error" id="error-email"></span></div>
          <div class="form-group" data-field="phone" hidden><label for="join-phone" class="form-label">Phone Number</label><input type="tel" id="join-phone" name="phone" class="form-input" placeholder="Your phone number" /><span class="phone-format-caption" id="phone-format-caption">Format +1 201 555 0123</span><span class="form-error" id="error-phone"></span></div>
          <div class="form-group" data-field="description" hidden><label for="join-description" class="form-label">What do you do</label><textarea id="join-description" name="description" class="form-textarea" placeholder="A brief description of what you do"></textarea><span class="form-error" id="error-description"></span></div>
          <button type="submit" class="btn-submit" id="join-submit-btn"><span class="btn-text">Subscribe Free</span><span class="btn-spinner"></span></button>
        </form>
      </div>
      <div class="join-modal-content join-success-panel" id="join-modal-success-panel" style="display: none;">
        <div class="success-icon-container"><svg class="success-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <h3 class="join-modal-title">You&rsquo;re on the list</h3>
        <p class="join-modal-desc">Your first Weekly Intelligence Brief will be delivered by email.</p>
        <a href="https://chat.whatsapp.com/L6NcsuQXSAs0dpbKbhhsil" class="btn-whatsapp-success" id="join-whatsapp-success-btn" target="_blank" rel="noopener noreferrer" style="display:none;">Join the Community</a>
      </div>
    </div>
  </div>`;

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
${SITE_NAV}
  ${body}
${SITE_FOOTER}
${JOIN_MODAL}
  <script src="/main.js"></script>
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

// ── Research product pages ──
// Intelligence is expressed as a nav dropdown (see SITE_NAV), not a hub page.
const briefCta = (label = 'Get the Free Brief') =>
  `<button type="button" class="sig-cta-btn join-cta-trigger" data-intent="brief">${esc(label)}</button>`;

// Shared chrome for a single research-product page.
function productShell({ slug, title, desc, status, claim, sections, cta }) {
  const url = `${BASE}/${slug}/`;
  const body = `
  <main class="sig-wrap sig-article">
    <a href="/" class="sig-back">&larr; ZeroToAct</a>
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
    ['For investors, local and global', 'What the opportunity looks like to naira capital and to dollar capital, side by side, and where the entry window sits.'],
    ['The move', 'How an operator should position in this market now, not in five years.'],
  ].map(([h, p]) => `<li><strong>${esc(h)}.</strong> ${esc(p)}</li>`).join('\n        ');

  const sections = `
    <div class="sig-body">
      <p>Every week we publish one country file, working through all 54 by the end of 2027. Each file is built for the people who move on a market: operators deciding where to build, and investors, local and global, deciding where to allocate. And because every file carries the same fields in the same order, you can line countries up against each other and compare, instead of reading 54 disconnected essays.</p>
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
    desc: 'One African country a week, all 54 through 2027: the case for each market, as one comparable dataset for local and global investors and the operators deciding where to build.',
    status: 'Coming',
    claim: 'One country a week, all 54, through 2027. The case for every African market, for operators and investors alike.',
    sections,
    cta: { heading: 'Get on the list.', sub: 'The weekly brief is where the Map ships first. Subscribe and you will not miss a country.', label: 'Join the waitlist' },
  });
}

function nigeriaTrackerPage() {
  const li = ([h, p]) => `<li><strong>${esc(h)}.</strong> ${esc(p)}</li>`;
  const households = [
    ['Upper income', 'What the policy does to capital, assets, tax exposure and cross-border options, and how to protect and position.'],
    ['Middle income', 'What it means for salaries, savings, credit and small-business costs, and the moves that still make sense.'],
    ['Base of the pyramid', 'What it changes in prices, transport, informal income and everyday costs, and where relief or pressure lands.'],
  ].map(li).join('\n        ');
  const investors = [
    ['Local investor', 'What it changes for naira-denominated capital: yields, entry points, and the sectors to lean into or step back from.'],
    ['Global investor', 'What it changes for dollar-denominated capital: FX and repatriation risk, hedged returns, and whether the entry window widens or narrows.'],
  ].map(li).join('\n        ');

  const sections = `
    <div class="sig-body">
      <p>We take each significant federal policy move, a subsidy, an FX rule, a tax change, a rate decision, and translate it into what it means and what to do about it. No press-release summaries. What changed, who it hits, and the move.</p>
    </div>
    <div class="sig-block">
      <h2>For households, by income band</h2>
      <ul class="sig-fields">
        ${households}
      </ul>
    </div>
    <div class="sig-block">
      <h2>For investors, local and global</h2>
      <ul class="sig-fields">
        ${investors}
      </ul>
      <p class="sig-note">The same policy is an opportunity for one reader and a squeeze for another. Every read is broken down by income band and by investor.</p>
    </div>
    <div class="sig-block">
      <h2>Cadence</h2>
      <p>Published with each major federal policy move, with a standing monthly round-up. Final cadence to be confirmed.</p>
    </div>`;

  return productShell({
    slug: 'nigeria-policy-tracker',
    title: 'The Nigeria Policy Tracker',
    desc: 'Federal policy dissected for what it means and what to do, for households by income band and for local and global investors.',
    status: 'Coming',
    claim: 'Federal policy, dissected for what it means and what to do, for every household and every investor.',
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
      <p>The Outlook is assembled, not invented. It draws on the year's Signals, the outcomes recorded inside the accountability cells, and global opportunity. It is the compounding of everything the operation already published.</p>
    </div>
    <div class="sig-block">
      <h2>It sets up the Summit</h2>
      <p>The Outlook is where the year's intelligence becomes a position. The <a href="/#summit-section">Annual Summit</a> is where you turn that position into a personal 12-month plan. The first Outlook lands alongside the New Year Summit.</p>
    </div>`;

  return productShell({
    slug: 'annual-outlook',
    title: 'The Annual Outlook',
    desc: 'The year-ahead publication that grades last year’s calls before making new ones, built from the year’s Signals, cell outcomes and country files.',
    status: 'Annual',
    claim: "One publication a year that grades last year's calls, then tells you where to position for the next.",
    sections,
    cta: { heading: 'Be there for the first one.', sub: 'The first Annual Outlook lands with the New Year Summit. Subscribe to the brief to get it.', label: 'Get the Free Brief' },
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

write('africa-opportunity-map/index.html', africaMapPage());
write('nigeria-policy-tracker/index.html', nigeriaTrackerPage());
write('annual-outlook/index.html', annualOutlookPage());

console.log(`\nGenerated ${signals.length} editions and 3 product pages.`);
