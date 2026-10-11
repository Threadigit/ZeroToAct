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

// Reusable schema.org entities for structured data.
const PERSON = {
  '@type': 'Person',
  '@id': `${AUTHOR.url}/#person`,
  name: AUTHOR.name,
  givenName: 'Tolu',
  familyName: 'Adetuyi',
  url: AUTHOR.url,
  sameAs: [AUTHOR.url, 'https://prembly.com'],
  jobTitle: 'Founder and Convener',
  description: 'Founder and convener of ZeroToAct, the weekly intelligence publication on the shifts in money, government policy and the world economy. Co-founder and Chief Innovation Officer of Prembly, building identity and compliance infrastructure.',
  knowsAbout: [
    'Capital markets', 'Monetary policy', 'African fintech', 'Identity infrastructure',
    'Payments regulation', 'Geopolitics', 'Emerging market currencies',
  ],
  worksFor: { '@id': `${BASE}/#organization` },
  founderOf: { '@id': `${BASE}/#organization` },
};
const PUBLISHER = {
  '@type': 'Organization',
  '@id': `${BASE}/#organization`,
  name: 'ZeroToAct',
  url: `${BASE}/`,
  logo: { '@type': 'ImageObject', url: `${BASE}/favicon-v2.png` },
  founder: { '@id': `${AUTHOR.url}/#person` },
  foundingDate: '2026',
  description: 'Weekly intelligence on the shifts in money, government policy and the world economy that change your next move.',
  sameAs: ['https://instagram.com/zerotoact'],
};
// Breadcrumb JSON-LD from an ordered list of [name, url] pairs.
const breadcrumb = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({
    '@type': 'ListItem', position: i + 1, name, item: url,
  })),
});
const jsonLdScript = (obj) =>
  `  <script type="application/ld+json">${JSON.stringify(obj)}</script>\n`;

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
// Counts the prose a reader actually reads, at 230 wpm, rounded to the nearest minute.
const readMinutes = (s) => {
  const parts = [...(s.written || []).map((x) => (typeof x === 'string' ? x : x.h || '')),
                 s.method || '', s.proveWrong || '', ...(s.nextMove || []).map((m) => m.do)];
  return Math.max(1, Math.round(parts.join(' ').trim().split(/\s+/).length / 230));
};
// Titles may end in a full stop, which would read as "Nigeria., 13 September" in a citation.
const citeTitle = (s) => s.title.replace(/\.$/, '');
const citation = (s) =>
  `ZeroToAct, ${s.number ? `Signal ${s.number}, ` : ''}${citeTitle(s)}, ${longDate(s.date)}, ${editionUrl(s)}`;

// Reading progress. Any page built around a single column of prose gets one.
const READING_PROGRESS = `<div class="sig-progress" id="sig-progress" role="presentation"></div>
  <script>
    (function () {
      var bar = document.getElementById('sig-progress');
      var article = document.querySelector('.sig-article, .why-page');
      if (!bar || !article) return;
      var tick = function () {
        var span = article.offsetHeight - window.innerHeight;
        var pct = span > 0 ? (window.scrollY - article.offsetTop) / span : 1;
        bar.style.width = Math.max(0, Math.min(1, pct)) * 100 + '%';
      };
      addEventListener('scroll', tick, { passive: true });
      addEventListener('resize', tick);
      tick();
    }());
  </script>`;

// Shared site chrome, matched to index.html so every page navigates identically.
const SITE_NAV = `  <a class="skip-link" href="#main">Skip to content</a>
  <nav id="nav" role="navigation" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="/" class="nav-logo" aria-label="ZeroToAct Home"><img src="/favicon-v2.png" alt="" width="36" height="36" /></a>
      <ul class="nav-links" role="list">
        <li><a href="/why/" class="nav-link">Why</a></li>
        <li class="nav-dropdown">
          <button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">Intelligence<span class="nav-caret" aria-hidden="true">&#9662;</span></button>
          <div class="nav-dropdown-panel" role="menu" aria-label="Intelligence products">
            <a href="/signals/" class="nav-dd-item" role="menuitem">
              <span class="nav-dd-title">Weekly Signals <span class="nav-dd-badge">Live</span></span>
              <span class="nav-dd-desc">One read a week on what is shifting and what it changes for you.</span>
            </a>
            <a href="/annual-outlook/" class="nav-dd-item" role="menuitem">
              <span class="nav-dd-title">Annual Outlook</span>
              <span class="nav-dd-desc">Grades last year's calls, then says where to position next.</span>
            </a>
          </div>
        </li>
        <li><a href="/#summit-section" class="nav-link">Summit</a></li>
        <li><a href="/#community-section" class="nav-link">Community</a></li>
      </ul>
      <button type="button" class="nav-cta join-cta-trigger" data-intent="brief">Get the Free Signal</button>
      <button type="button" class="nav-hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
    </div>
    <div class="nav-mobile-menu" id="mobile-menu" aria-hidden="true">
      <a href="/why/" class="mobile-link">Why</a>
      <span class="mobile-group-label">Intelligence</span>
      <a href="/signals/" class="mobile-link mobile-sublink">Weekly Signals</a>
      <a href="/annual-outlook/" class="mobile-link mobile-sublink">Annual Outlook</a>
      <a href="/#summit-section" class="mobile-link">Summit</a>
      <a href="/#community-section" class="mobile-link">Community</a>
      <button type="button" class="mobile-link mobile-link-cta join-cta-trigger" data-intent="brief">Get the Free Signal</button>
    </div>
  </nav>`;

const SITE_FOOTER = `  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="/" class="footer-logo" aria-label="ZeroToAct Home"><img src="/favicon-v2.png" alt="" width="48" height="48" loading="lazy" decoding="async" /></a>
          <p class="footer-tagline">Intelligence that moves you<br />from knowing to doing.</p>
        </div>
        <nav class="footer-nav" aria-label="Footer navigation">
          <div class="footer-nav-group">
            <p class="footer-nav-label">Intelligence</p>
            <a href="/signals/" class="footer-nav-link">Weekly Signals</a>
            <a href="/annual-outlook/" class="footer-nav-link">Annual Outlook</a>
          </div>
          <div class="footer-nav-group">
            <p class="footer-nav-label">Explore</p>
            <a href="/why/" class="footer-nav-link">Why</a>
            <a href="/#summit-section" class="footer-nav-link">Summit</a>
            <a href="/#community-section" class="footer-nav-link">Community</a>
            <a href="/#faq" class="footer-nav-link">FAQ</a>
            <a href="/#founder" class="footer-nav-link">Founder</a>
          </div>
        </nav>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">&copy; ${new Date().getFullYear()} ZeroToAct. All rights reserved.</p>
        <a href="https://instagram.com/zerotoact" class="footer-instagram" target="_blank" rel="noopener noreferrer" aria-label="ZeroToAct on Instagram"><svg class="footer-insta-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>@zerotoact</a>
      </div>
    </div>
  </footer>`;

const JOIN_MODAL = `  <div id="join-modal" class="join-modal" aria-hidden="true" aria-modal="true" role="dialog" aria-label="Join ZeroToAct">
    <div class="join-modal-overlay" id="join-modal-overlay"></div>
    <div class="join-modal-container">
      <button type="button" class="join-modal-close" id="join-modal-close" aria-label="Close application form">&times;</button>
      <div class="join-modal-content" id="join-modal-form-panel">
        <h3 class="join-modal-title" id="join-modal-title">Get the Free Signal</h3>
        <p class="join-modal-desc">One email is all it takes. Your first Weekly Signal is next.</p>
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
        <p class="join-modal-desc">Your first Weekly Signal will be delivered by email.</p>
        <a href="https://chat.whatsapp.com/L6NcsuQXSAs0dpbKbhhsil" class="btn-whatsapp-success" id="join-whatsapp-success-btn" target="_blank" rel="noopener noreferrer" style="display:none;">Join the Community</a>
      </div>
    </div>
  </div>`;

const shell = ({ title, desc, canonical, head = '', body, ogType = 'website', articleMeta = '', keywords = '', noindex = false }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
${keywords ? `  <meta name="keywords" content="${esc(keywords)}" />\n` : ''}  <meta name="author" content="${esc(AUTHOR.name)}" />
${canonical ? `  <link rel="canonical" href="${canonical}" />\n` : ''}
  <link rel="author" href="${AUTHOR.url}" />
  <meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />
  <link rel="icon" type="image/png" href="/favicon-v2.png" />
  <meta name="theme-color" content="#0a0a0a" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="ZeroToAct" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
${articleMeta}  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@zerotoact" />
  <meta name="twitter:creator" content="@zerotoact" />
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

// [text](/path) becomes an internal link. Applied after escaping, and the path is
// restricted to site-relative, so neither the text nor the href can inject markup.
const linkify = (html) =>
  html.replace(/\[([^\]]+)\]\((\/[A-Za-z0-9\-._~\/#]*)\)/g, '<a href="$2">$1</a>');
// ── Charts ──────────────────────────────────────────────────────────────
// A publication this full of figures should show them. Three forms, no more:
// a line for change over time, columns for magnitude, a split bar for
// part-to-whole. Encoding is monochrome and ordinal, so identity comes from
// lightness, position and labels rather than hue. Every chart ships a table
// twin, which is both the accessible equivalent and what goes into the feed.

const INK = { lead: 'var(--white-pure)', context: 'var(--grey-500)', faint: 'var(--grey-600)' };

const niceTicks = (lo, hi, count = 4) => {
  const span = hi - lo || Math.abs(hi) || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  const start = Math.floor(lo / step) * step;
  const out = [];
  for (let v = start; v <= hi + step / 2; v += step) out.push(Number(v.toFixed(10)));
  return out;
};

const fmt = (v, unit = '') => {
  const a = Math.abs(v);
  let s;
  const trim = (n, dp) => String(Number(n.toFixed(dp)));
  if (a >= 1e12) s = trim(v / 1e12, 2) + 'tn';
  else if (a >= 1e9) s = trim(v / 1e9, a >= 1e10 ? 0 : 2) + 'bn';
  else if (a >= 1e6) s = trim(v / 1e6, 1) + 'm';
  else if (a >= 1000) s = v.toLocaleString('en-GB');
  else s = String(Number(v.toFixed(2)));
  return unit === '%' ? s + '%' : unit ? unit + s : s;
};

// Table twin. Carries every value, so no number is gated behind a hover.
const chartTable = (c) => {
  // A split bar is read as a share, so the share belongs in the table too.
  // Nothing the chart or its tooltip shows may be missing here.
  if (c.form === 'split') {
    const total = c.series.reduce((a, s) => a + s.values[0], 0);
    const rows = c.series.map(s =>
      `<tr><th scope="row">${esc(s.name)}</th><td>${esc(fmt(s.values[0], c.unit))}</td><td>${Math.round((s.values[0] / total) * 100)}%</td></tr>`).join('');
    return `<details class="sig-chart-data"><summary>Table of values</summary><table><caption>${esc(c.title)}</caption><thead><tr><th scope="col">${esc(c.xLabel || '')}</th><th scope="col">Amount</th><th scope="col">Share</th></tr></thead><tbody>${rows}</tbody></table></details>`;
  }
  const head = `<tr><th scope="col">${esc(c.xLabel || '')}</th>${c.series.map(s => `<th scope="col">${esc(s.name)}</th>`).join('')}</tr>`;
  const rows = c.x.map((x, i) =>
    `<tr><th scope="row">${esc(x)}</th>${c.series.map(s => `<td>${esc(fmt(s.values[i], c.unit))}</td>`).join('')}</tr>`
  ).join('');
  return `<details class="sig-chart-data"><summary>Table of values</summary><table><caption>${esc(c.title)}</caption><thead>${head}</thead><tbody>${rows}</tbody></table></details>`;
};

const barPath = (x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h);
  return `M${x} ${y + h}V${y + rr}a${rr} ${rr} 0 0 1 ${rr} ${-rr}h${w - 2 * rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${y + h}Z`;
};

function chartSvg(c, id) {
  const W = 680, PAD = { t: 18, r: 18, b: 34, l: 46 };
  const multi = c.series.length > 1;
  const all = c.series.flatMap(s => s.values);
  const H = c.form === 'split' ? 76 : 250;

  if (c.form === 'split') {
    const total = all.reduce((a, b) => a + b, 0);
    const innerW = W - PAD.l - PAD.r, y = 22, bh = 32, gap = 2;
    let x = PAD.l, segs = '', labels = '';
    c.series.forEach((s, i) => {
      const w = Math.max(0, (s.values[0] / total) * innerW - (i < c.series.length - 1 ? gap : 0));
      const fill = i === 0 ? INK.lead : i === 1 ? INK.context : INK.faint;
      const pct = Math.round((s.values[0] / total) * 100);
      segs += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${bh}" rx="2" fill="${fill}" tabindex="0" role="img" aria-label="${esc(s.name)}, ${esc(fmt(s.values[0], c.unit))}, ${pct} percent" data-l="${esc(s.name)}" data-v="${esc(fmt(s.values[0], c.unit))} · ${pct}%"><title>${esc(s.name)}: ${esc(fmt(s.values[0], c.unit))}</title></rect>`;
      // Only label inside the segment when the text comfortably fits.
      if (w > 64) labels += `<text x="${(x + 8).toFixed(1)}" y="${y + bh / 2 + 4}" class="sig-chart-inlabel" fill="${i === 0 ? 'var(--black)' : 'var(--black)'}">${pct}%</text>`;
      x += w + gap;
    });
    const key = c.series.map((s, i) =>
      `<span class="sig-chart-key"><i style="background:${i === 0 ? INK.lead : i === 1 ? INK.context : INK.faint}"></i>${esc(s.name)} ${esc(fmt(s.values[0], c.unit))}</span>`).join('');
    return { svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t" preserveAspectRatio="xMidYMid meet"><title id="${id}-t">${esc(c.title)}</title>${segs}${labels}</svg>`, key };
  }

  const lo = Math.min(...all), hi = Math.max(...all);
  const zeroBased = c.form === 'bar';
  const ticks = niceTicks(zeroBased ? 0 : lo, hi);
  const yMin = zeroBased ? 0 : Math.min(ticks[0], lo), yMax = Math.max(ticks[ticks.length - 1], hi);
  const px = i => PAD.l + (c.x.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i / (c.x.length - 1)) * (W - PAD.l - PAD.r));
  const py = v => PAD.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b);

  const grid = ticks.map(t =>
    `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${py(t).toFixed(1)}" y2="${py(t).toFixed(1)}" class="sig-chart-grid" />` +
    `<text x="${PAD.l - 10}" y="${(py(t) + 4).toFixed(1)}" class="sig-chart-tick" text-anchor="end">${esc(fmt(t, c.unit))}</text>`).join('');

  const bandW = (W - PAD.l - PAD.r) / c.x.length;
  const labelX = i => c.form === 'bar' ? PAD.l + bandW * i + bandW / 2 : px(i);
  const xLabels = c.x.map((x, i) =>
    `<text x="${labelX(i).toFixed(1)}" y="${H - 12}" class="sig-chart-tick" text-anchor="${c.form === 'bar' ? 'middle' : i === 0 ? 'start' : i === c.x.length - 1 ? 'end' : 'middle'}">${esc(x)}</text>`).join('');

  let marks = '', hits = '';
  if (c.form === 'bar') {
    const band = (W - PAD.l - PAD.r) / c.x.length;
    const thick = Math.min(24, Math.max(8, (band - 10) / c.series.length - 2));
    c.series.forEach((s, si) => {
      const fill = si === 0 ? INK.lead : si === 1 ? INK.context : INK.faint;
      s.values.forEach((v, i) => {
        const groupW = c.series.length * thick + (c.series.length - 1) * 2;
        const x0 = PAD.l + band * i + (band - groupW) / 2 + si * (thick + 2);
        const y0 = py(v), h = py(yMin) - y0;
        marks += `<path d="${barPath(x0, y0, thick, h, 4)}" fill="${fill}" tabindex="0" role="img" aria-label="${esc(c.x[i])}, ${esc(s.name)}, ${esc(fmt(v, c.unit))}" data-l="${esc(c.x[i])} · ${esc(s.name)}" data-v="${esc(fmt(v, c.unit))}"><title>${esc(c.x[i])} ${esc(s.name)}: ${esc(fmt(v, c.unit))}</title></path>`;
        if (si === 0) marks += `<text x="${(x0 + thick / 2).toFixed(1)}" y="${(y0 - 7).toFixed(1)}" class="sig-chart-val" text-anchor="middle">${esc(fmt(v, c.unit))}</text>`;
      });
    });
  } else {
    c.series.forEach((s, si) => {
      const stroke = si === 0 ? INK.lead : si === 1 ? INK.context : INK.faint;
      const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');
      marks += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
      const li = s.values.length - 1;
      // Selective labels only: the endpoint, and the extreme when it is not the endpoint.
      const exi = s.values.indexOf(Math.max(...s.values));
      [li, ...(exi !== li && si === 0 ? [exi] : [])].forEach(i => {
        marks += `<circle cx="${px(i).toFixed(1)}" cy="${py(s.values[i]).toFixed(1)}" r="4" fill="${stroke}" stroke="var(--black)" stroke-width="2" />`;
        marks += `<text x="${px(i).toFixed(1)}" y="${(py(s.values[i]) - 12).toFixed(1)}" class="sig-chart-val" text-anchor="${i === li ? 'end' : 'middle'}">${esc(fmt(s.values[i], c.unit))}</text>`;
      });
    });
    // Crosshair hit bands: the reader aims at an x position, never at a 2px line.
    const band = (W - PAD.l - PAD.r) / Math.max(1, c.x.length - 1);
    hits = c.x.map((x, i) => {
      const rows = c.series.map(s => `${s.name} ${fmt(s.values[i], c.unit)}`).join(' · ');
      return `<rect x="${(px(i) - band / 2).toFixed(1)}" y="${PAD.t}" width="${Math.max(24, band).toFixed(1)}" height="${H - PAD.t - PAD.b}" fill="transparent" tabindex="0" role="img" aria-label="${esc(x)}, ${esc(rows)}" data-l="${esc(x)}" data-v="${esc(rows)}" data-x="${px(i).toFixed(1)}" />`;
    }).join('');
  }

  const key = multi ? c.series.map((s, i) =>
    `<span class="sig-chart-key"><i class="${c.form === 'line' ? 'is-line' : ''}" style="background:${i === 0 ? INK.lead : i === 1 ? INK.context : INK.faint}"></i>${esc(s.name)}</span>`).join('') : '';

  return {
    svg: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t" preserveAspectRatio="xMidYMid meet"><title id="${id}-t">${esc(c.title)}</title>${grid}<line class="sig-chart-grid" x1="${PAD.l}" x2="${W - PAD.r}" y1="${py(yMin).toFixed(1)}" y2="${py(yMin).toFixed(1)}" />${marks}${xLabels}<g class="sig-chart-cross" aria-hidden="true"><line y1="${PAD.t}" y2="${H - PAD.b}" /></g>${hits}</svg>`,
    key,
  };
}


// Chart hover and keyboard readout. Only emitted on pages that have a chart.
const CHART_SCRIPT = `<script>
    (function () {
      document.querySelectorAll('.sig-chart').forEach(function (fig) {
        var plot = fig.querySelector('.sig-chart-plot');
        var tip = fig.querySelector('.sig-chart-tip');
        var svg = fig.querySelector('svg');
        var cross = fig.querySelector('.sig-chart-cross');
        if (!plot || !tip || !svg) return;
        function hide() { tip.hidden = true; if (cross) cross.classList.remove('is-on'); }
        function show(el) {
          var v = el.getAttribute('data-v'), l = el.getAttribute('data-l');
          if (!v) return;
          tip.textContent = '';
          var b = document.createElement('b'); b.textContent = v;
          var sp = document.createElement('span'); sp.textContent = l || '';
          tip.appendChild(b); tip.appendChild(sp);
          var r = el.getBoundingClientRect(), p = plot.getBoundingClientRect();
          tip.hidden = false;
          tip.style.left = Math.round(r.left - p.left + r.width / 2) + 'px';
          tip.style.top = Math.round(r.top - p.top) - 8 + 'px';
          var x = el.getAttribute('data-x');
          if (cross && x) {
            var ln = cross.querySelector('line');
            ln.setAttribute('x1', x); ln.setAttribute('x2', x);
            cross.classList.add('is-on');
          }
        }
        svg.querySelectorAll('[data-v]').forEach(function (el) {
          el.addEventListener('pointerenter', function () { show(el); });
          el.addEventListener('focus', function () { show(el); });
          el.addEventListener('blur', hide);
        });
        plot.addEventListener('pointerleave', hide);
      });
    }());
  <\/script>`;

let chartSeq = 0;
function renderChart(c) {
  const id = `chart-${++chartSeq}`;
  const { svg, key } = chartSvg(c, id);
  return `<figure class="sig-chart" id="${id}">
      <figcaption class="sig-chart-head"><span class="sig-chart-title">${esc(c.title)}</span>${c.note ? `<span class="sig-chart-note">${esc(c.note)}</span>` : ''}</figcaption>
      ${key ? `<div class="sig-chart-legend">${key}</div>` : ''}
      <div class="sig-chart-plot">${svg}<div class="sig-chart-tip" hidden></div></div>
      ${c.source ? `<p class="sig-chart-source">${esc(c.source)}</p>` : ''}
      ${chartTable(c)}
    </figure>`;
}

const renderBlock = (item) =>
  typeof item === 'string' ? `<p>${linkify(esc(item))}</p>`
    : (item && item.h) ? `<h2 class="sig-subhead">${esc(item.h)}</h2>`
    : (item && item.chart) ? renderChart(item.chart) : '';

// The feed gets the table instead of the SVG. Readers render inline SVG
// inconsistently, and the table carries every value anyway.
const renderBlockForFeed = (item) =>
  (item && item.chart) ? feedTable(item.chart) : renderBlock(item);

const feedTable = (c) => {
  if (c.form === 'split') {
    const total = c.series.reduce((a, x) => a + x.values[0], 0);
    const rows = c.series.map(x =>
      `<tr><th>${esc(x.name)}</th><td>${esc(fmt(x.values[0], c.unit))}</td><td>${Math.round((x.values[0] / total) * 100)}%</td></tr>`).join('');
    return `<figure><table><caption>${esc(c.title)}${c.note ? '. ' + esc(c.note) : ''}</caption><thead><tr><th>${esc(c.xLabel || '')}</th><th>Amount</th><th>Share</th></tr></thead><tbody>${rows}</tbody></table></figure>`;
  }
  const head = `<tr><th>${esc(c.xLabel || '')}</th>${c.series.map(x => `<th>${esc(x.name)}</th>`).join('')}</tr>`;
  const rows = c.x.map((x, i) =>
    `<tr><th>${esc(x)}</th>${c.series.map(sr => `<td>${esc(fmt(sr.values[i], c.unit))}</td>`).join('')}</tr>`).join('');
  return `<figure><table><caption>${esc(c.title)}${c.note ? '. ' + esc(c.note) : ''}</caption><thead>${head}</thead><tbody>${rows}</tbody></table></figure>`;
};

// Absolute media URLs for the edition's video, used by both the page schema and the feed.
const videoThumb = (s) => `https://i.ytimg.com/vi/${s.videoId}/maxresdefault.jpg`;
const videoEmbed = (s) => `https://www.youtube-nocookie.com/embed/${s.videoId}`;
const videoWatch = (s) => `https://www.youtube.com/watch?v=${s.videoId}`;

// ── Per-edition page ──
function editionPage(s) {
  const url = editionUrl(s);
  const eyebrowBits = [s.theme, longDate(s.date), `${readMinutes(s)} min read`];
  if (s.number) eyebrowBits.unshift(`Signal ${s.number}`);

  // A written item is a paragraph (string) or a section subheading ({ h: '...' }).
  const article = s.written
    ? s.written.map(renderBlock).join('\n        ')
    : `<p class="sig-pending">The written analysis for this Signal is being prepared from the video above. Watch the Signal in the meantime, or <a href="/#subscribe-section">get Weekly Signals by email</a>.</p>`;

  // Grades the previous call before making a new one. `of` is the slug being graded,
  // so the block also links back to it.
  const prior = s.lastTime && signals.find((x) => x.slug === s.lastTime.of);
  const lastTime = s.lastTime
    ? `<div class="sig-lasttime">
      <h2>Last time we said</h2>
      <p>${linkify(esc(s.lastTime.said))}</p>
      <p class="sig-lasttime-verdict"><strong>${esc(s.lastTime.verdict)}.</strong> ${linkify(esc(s.lastTime.landed))}${
        prior ? ` <a href="/signals/${prior.slug}/">Read the original call</a>.` : ''}</p>
    </div>`
    : '';

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
  // Next move is either one paragraph, or per-audience actions [{ who, do }].
  const nextMove = s.nextMove
    ? `<div class="sig-block sig-block--move"><h2>Next move</h2>${
        Array.isArray(s.nextMove)
          ? `<ul class="sig-moves">${s.nextMove.map((m) =>
              `<li><span class="sig-move-who">${esc(m.who)}</span><span class="sig-move-do">${esc(m.do)}</span></li>`).join('')}</ul>`
          : `<p>${esc(s.nextMove)}</p>`
      }</div>` : '';

  const wordCount = (s.written || []).filter((x) => typeof x === 'string').join(' ').split(/\s+/).filter(Boolean).length;
  const kw = [s.theme, ...(s.keywords || []), 'Africa', 'capital', 'geopolitics', 'markets', 'ZeroToAct']
    .filter(Boolean).join(', ');

  const isoPub = new Date(s.date + 'T12:00:00Z').toISOString();
  const isoMod = new Date((s.revised || s.date) + 'T12:00:00Z').toISOString();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: s.title,
        name: s.title,
        description: s.headlineClaim,
        datePublished: s.date,
        dateModified: s.revised || s.date,
        inLanguage: 'en',
        image: { '@type': 'ImageObject', url: OG_IMAGE, width: 1200, height: 630 },
        articleSection: s.theme,
        keywords: kw,
        ...(wordCount ? { wordCount } : {}),
        author: PERSON,
        publisher: PUBLISHER,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        isPartOf: { '@type': 'CreativeWorkSeries', '@id': `${BASE}/#signals`, name: 'ZeroToAct Weekly Signal' },
        ...(s.videoId ? { video: { '@id': `${url}#video` } } : {}),
      },
      // Every edition leads with a video, so declare it. Duration is omitted rather
      // than guessed, since a wrong one is worse than an absent one.
      ...(s.videoId ? [{
        '@type': 'VideoObject',
        '@id': `${url}#video`,
        name: s.title,
        description: s.headlineClaim,
        thumbnailUrl: videoThumb(s),
        uploadDate: isoPub,
        embedUrl: videoEmbed(s),
        contentUrl: videoWatch(s),
        publisher: PUBLISHER,
        inLanguage: 'en',
        isPartOf: { '@id': `${url}#article` },
      }] : []),
      breadcrumb([
        ['Home', `${BASE}/`],
        ['Signals', `${BASE}/signals/`],
        [s.title, url],
      ]),
      PERSON,
    ],
  };

  const articleMeta =
    `  <meta property="article:published_time" content="${isoPub}" />\n` +
    `  <meta property="article:modified_time" content="${isoMod}" />\n` +
    `  <meta property="article:author" content="${AUTHOR.url}" />\n` +
    `  <meta property="article:section" content="${esc(s.theme)}" />\n` +
    `  <meta property="article:tag" content="${esc(s.theme)}" />\n`;

  const body = `
  <main id="main" class="sig-wrap sig-article">
    <a href="/signals/" class="sig-back">&larr; The Signal Archive</a>
    <p class="sig-eyebrow">${eyebrowBits.map(esc).join(' &middot; ')}</p>
    <h1 class="sig-title">${esc(s.title)}</h1>
    <p class="sig-claim">${esc(s.headlineClaim)}</p>
    <p class="sig-byline sig-byline--top">By <a href="${AUTHOR.url}" target="_blank" rel="author noopener noreferrer">${AUTHOR.name}</a></p>
    ${draftBanner}
    <figure class="sig-video">
      ${s.videoId ? `<div class="sig-video-frame">
        <iframe src="https://www.youtube-nocookie.com/embed/${esc(s.videoId)}" title="${esc(s.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>` : ''}
      ${s.revised && s.revised !== s.date ? `<figcaption class="sig-revised" role="note">Revised ${longDate(s.revised)}, first published ${
        s.revised.slice(0, 4) === s.date.slice(0, 4) ? longDate(s.date).replace(/ \d{4}$/, '') : longDate(s.date)
      }. ${esc(s.revisionNote || '')}${s.videoPredatesRevision ? ' Video is the original edition.' : ''}</figcaption>` : ''}
    </figure>
    ${lastTime}
    <div class="sig-body">
        ${article}
    </div>
    ${method}
    ${proveWrong}
    ${nextMove}
    ${source}
    <div class="sig-cite">
      <h2>Cite this Signal</h2>
      <p class="sig-cite-text">${esc(citation(s))}</p>
    </div>
    <div class="sig-disclosure">
      <h2>Disclosure</h2>
      <p>${esc(AUTHOR.name)} is co-founder and Chief Innovation Officer of <a href="https://prembly.com" target="_blank" rel="noopener noreferrer">Prembly</a>, which builds identity and compliance infrastructure. Signals regularly cover payments, identity and regulation, which is his commercial interest as well as his subject.</p>
    </div>
  </main>
  ${READING_PROGRESS}${(s.written || []).some(b => b && b.chart) ? CHART_SCRIPT : ''}`;

  return shell({
    title: `${s.seoTitle || s.title} | ZeroToAct ${label(s)}`,
    desc: s.seoDesc || s.headlineClaim, canonical: url, head: jsonLdScript(jsonLd), body,
    ogType: 'article', articleMeta, keywords: kw,
  });
}

// ── Archive index ──
function indexPage() {
  const filters = [`<button class="sig-filter is-active" data-theme="all" type="button">All</button>`]
    .concat(themes.map((t) => `<button class="sig-filter" data-theme="${esc(t)}" type="button">${esc(t)}</button>`))
    .join('\n        ');

  const cards = signals.map((s, i) => `
      <article class="sig-card${i === 0 ? ' sig-card--latest' : ''}" data-theme="${esc(s.theme)}">
        <a class="sig-card-link" href="${editionPath(s)}">
          <div class="sig-card-meta"><span>${i === 0 ? '<span class="sig-card-latest">Latest</span>' : ''}${s.number ? `Signal ${s.number} &middot; ` : ''}${esc(longDate(s.date))} &middot; ${readMinutes(s)} min</span><span class="sig-card-theme">${esc(s.theme)}</span></div>
          <h2 class="sig-card-title">${esc(s.title)}</h2>
          <p class="sig-card-claim">${esc(s.headlineClaim)}</p>
          <span class="sig-card-cta">Read the Signal &rarr;</span>
        </a>
      </article>`).join('\n');

  const body = `
  <main id="main" class="sig-wrap sig-index">
    <header class="sig-index-head">
      <p class="sig-eyebrow">Weekly Signals, on the record</p>
      <h1 class="sig-index-title">The Signal Archive</h1>
      <p class="sig-index-sub">Every weekly Signal, kept as a dated, citable record. Money, government policy, technology, and the world-economy shifts that change your next move. <a href="/signals/feed.xml">Subscribe by RSS</a>.</p>
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

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${BASE}/signals/#collection`,
        url: `${BASE}/signals/`,
        name: 'The Signal Archive',
        description: 'Every weekly ZeroToAct Signal, kept as a dated, citable record.',
        inLanguage: 'en',
        isPartOf: { '@id': `${BASE}/#website` },
        publisher: PUBLISHER,
        mainEntity: {
          '@type': 'ItemList',
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          numberOfItems: signals.length,
          itemListElement: signals.map((s, i) => ({
            '@type': 'ListItem', position: i + 1, url: editionUrl(s), name: s.title,
          })),
        },
      },
      breadcrumb([['Home', `${BASE}/`], ['Signals', `${BASE}/signals/`]]),
    ],
  };
  return shell({
    title: 'The Signal Archive | ZeroToAct',
    desc: 'Every weekly ZeroToAct Signal, kept as a dated, citable record of the shifts in money, government policy and the world economy that change your next move.',
    canonical: `${BASE}/signals/`, body, head: jsonLdScript(ld),
    keywords: 'ZeroToAct, Signals, Africa, capital, geopolitics, markets, weekly intelligence',
  });
}

// ── RSS ──
function feed() {
  // Feed readers get the whole edition, not a teaser. CDATA carries the markup;
  // the guard keeps a stray terminator from closing the section early.
  const fullHtml = (s) => {
    const body = (s.written || []).map(renderBlockForFeed).join('\n');
    const moves = (s.nextMove || []).map((m) =>
      `<h3>${esc(m.who)}</h3>\n<p>${linkify(esc(m.do))}</p>`).join('\n');
    const html = `${body}\n<h2>Next move</h2>\n${moves}`;
    return html.split(']]>').join(']]&gt;');
  };
  const items = signals.map((s) => `    <item>
      <title>${esc(s.title)}</title>
      <link>${editionUrl(s)}</link>
      <guid isPermaLink="true">${editionUrl(s)}</guid>
      <pubDate>${rfc822(s.date)}</pubDate>
      <dc:creator>${esc(AUTHOR.name)}</dc:creator>
      <category>${esc(s.theme)}</category>
      <description>${esc(s.headlineClaim)}</description>
      <content:encoded><![CDATA[${fullHtml(s)}]]></content:encoded>
    </item>`).join('\n');
  const newest = signals[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>ZeroToAct Signals</title>
    <link>${BASE}/signals/</link>
    <description>One read a week on the shifts in money, government policy and the world economy that change your next move.</description>
    <language>en</language>
    <copyright>ZeroToAct</copyright>
    <lastBuildDate>${rfc822(newest.date)}</lastBuildDate>
    <pubDate>${rfc822(newest.date)}</pubDate>
    <image>
      <url>${OG_IMAGE}</url>
      <title>ZeroToAct Signals</title>
      <link>${BASE}/signals/</link>
    </image>
    <atom:link href="${BASE}/signals/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

// ── Sitemap (home + archive + editions) ──
function sitemap() {
  const urls = [
    { loc: `${BASE}/`, priority: '1.0', changefreq: 'weekly', lastmod: signals[0].date },
    { loc: `${BASE}/signals/`, priority: '0.9', changefreq: 'weekly', lastmod: signals[0].date },
    ...signals.map((s) => ({ loc: editionUrl(s), priority: '0.8', changefreq: 'monthly', lastmod: s.date })),
    { loc: `${BASE}/why/`, priority: '0.8', changefreq: 'yearly' },
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
const briefCta = (label = 'Get the Free Signal') =>
  `<button type="button" class="sig-cta-btn join-cta-trigger" data-intent="brief">${esc(label)}</button>`;

// Shared chrome for a single research-product page.
function productShell({ slug, title, desc, status, claim, sections, cta }) {
  const url = `${BASE}/${slug}/`;
  const body = `
  <main id="main" class="sig-wrap sig-article">
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
  </main>
  ${READING_PROGRESS}`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url, name: title, description: desc, inLanguage: 'en',
        isPartOf: { '@id': `${BASE}/#website` },
        about: { '@type': 'Thing', name: title },
        publisher: PUBLISHER,
        primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE },
      },
      breadcrumb([['Home', `${BASE}/`], [title, url]]),
    ],
  };
  return shell({ title: `${title} | ZeroToAct`, desc, canonical: url, body, head: jsonLdScript(ld) });
}

// ── Why page ──
// Long-form argument. One column, no cards, short lines left to stand alone.
function whyPage() {
  const url = `${BASE}/why/`;
  const title = 'Why ZeroToAct exists | What decides what your work is worth';
  const desc = 'One decision taken far away can reprice a skill, cancel a project and move money out of a whole sector. This is the chain that does it.';

  const body = `
  <main id="main" class="sig-wrap why-page">
    <a href="/" class="sig-back">&larr; ZeroToAct</a>
    <h1 class="sig-eyebrow why-eyebrow">Why we exist</h1>

    <p class="why-lead">Fuel gets expensive.</p>

    <p>It might start with a war, a production cut, a damaged pipeline or a shipping route nobody can use. Nothing about it was decided anywhere near you.</p>
    <p>Fuel moves everything else, because everything else has to be moved. Transport costs rise, then food, then rent. Prices climb, so the people who set interest rates push those rates higher to cool things down. Borrowing, which used to be cheap, becomes expensive.</p>

    <p class="why-turn">Now watch that one event land three times.</p>

    <p>A company drops the two year project it had been funding. The loan behind it costs far more now, and the project no longer earns enough to be worth doing. The team that would have built it is never hired.</p>
    <p>Someone who spent a year learning the exact skill that project needed finds fewer people asking for it, and takes less for the work. Nothing about their skill got worse.</p>
    <p>Someone with money to put to work changes their mind. When borrowing is cheap you can afford to wait years for a payoff. When it is expensive you want something that pays soon. So money leaves anything slow and moves to anything quick. Companies that looked valuable last quarter are suddenly worth less, and nothing inside them changed.</p>
    <p>None of the three did anything wrong. Not one of them could see the thing that moved them.</p>

    <h2>Read it backwards</h2>
    <p>Most of us learn one thing well and stay close to it. At the beginning, the work itself is the world.</p>
    <p>Then you notice that being good at your work does not decide how far that work travels. Skilled people stay invisible. Good ideas never find a way to make money. Useful products never get funded. Strong companies get knocked back by a currency swing or a government decision that had nothing to do with them.</p>
    <p>You have been reading this from the bottom, starting with your own work. Start at the top instead.</p>

    <figure class="why-chain-fig">
      <ol class="why-chain">
      <li class="why-link">
        <span class="why-link-rank" aria-hidden="true">01</span>
        <span class="why-link-name">Power</span>
        <span class="why-link-note">Governments and central banks decide.</span>
        <span class="why-link-hands"><span class="why-link-arrow" aria-hidden="true"></span>hands down what is allowed, and what it costs</span>
      </li>
      <li class="why-link">
        <span class="why-link-rank" aria-hidden="true">02</span>
        <span class="why-link-name">The rules</span>
        <span class="why-link-note">Tariffs, rates, subsidies, capital controls.</span>
        <span class="why-link-hands"><span class="why-link-arrow" aria-hidden="true"></span>hands down how easy it is to get money</span>
      </li>
      <li class="why-link">
        <span class="why-link-rank" aria-hidden="true">03</span>
        <span class="why-link-name">Credit</span>
        <span class="why-link-note">The price of borrowing, for everyone.</span>
        <span class="why-link-hands"><span class="why-link-arrow" aria-hidden="true"></span>hands down what a business can afford to build</span>
      </li>
      <li class="why-link">
        <span class="why-link-rank" aria-hidden="true">04</span>
        <span class="why-link-name">Business</span>
        <span class="why-link-note">Which projects clear the hurdle and which are dropped.</span>
        <span class="why-link-hands"><span class="why-link-arrow" aria-hidden="true"></span>hands down which products and which jobs exist</span>
      </li>
      <li class="why-link">
        <span class="why-link-rank" aria-hidden="true">05</span>
        <span class="why-link-name">The market</span>
        <span class="why-link-note">What there is to buy, and who gets hired to make it.</span>
        <span class="why-link-hands"><span class="why-link-arrow" aria-hidden="true"></span>hands down what your work is worth</span>
      </li>
      <li class="why-link is-you">
        <span class="why-link-rank" aria-hidden="true">06</span>
        <span class="why-link-name">You</span>
        <span class="why-link-note">Your skill, your business, your money.</span>
        
      </li>
      </ol>
      <figcaption>Each layer hands the next one its terms. By the time it reaches your work, five decisions have already been taken above it.</figcaption>
    </figure>

    <p>Your skill sits near the bottom of that chain. So does your business. So does whatever money you have put to work. What each is worth gets decided several levels above where you sit, by people you may never meet, in rooms you may never enter.</p>
    <p class="why-turn">That is not a reason to feel small. It is the reason to look up.</p>

    <h2>How far are you from the room</h2>
    <p>Some people sit close to where the rules get written. Their currency, the dollar, is the one everyone else holds. Their central bank moves and the rest of the world adjusts. For them the chain is short and most of it is visible from home.</p>
    <p>Most of us sit further out. What your country sells, what borrowing costs, what your currency is worth and whether foreign money turns up are largely settled somewhere else. The decision at home often comes second, as a response to something already decided.</p>
    <p>That distance is not something you can remove. It is something you can either see across or be surprised by.</p>
    <p>Which is why reading only local news leaves you a step behind on your own life, wherever you are standing.</p>
    <p class="why-turn">Seen early, a shift is a decision you get to make. Seen late, it is something that happened to you.</p>

    <h2>So this is what we publish</h2>
    <p>Every week we take one thing that moved near the top of the chain and follow it down, step by step, until it reaches your work, your business or your money. That is the <a href="/signals/"><strong>Weekly Signal</strong></a>. It is free and it stays free, because the read should not be the part that is rationed.</p>
    <p>Then once a year we set out where the next twelve months are heading and where to position for them. Before any of that, we publish how last year's calls actually turned out, because a forecast nobody grades is entertainment. That is the <a href="/annual-outlook/"><strong>Annual Outlook</strong></a>.</p>

    <h2>The harder half</h2>
    <p>Most people who understand the chain still do nothing with it.</p>
    <p>Not because they are slow, and not because they missed the signal. Because nobody was expecting them to act, and a private intention with no witness quietly expires.</p>
    <p class="why-turn">So we built the other half.</p>
    <p>A cell of five, matched to your stage, meeting every two weeks. You say what you are going to do. The other four ask you about it next time. Matching matters, because a founder raising money and four first year students in one room helps nobody. The cells are peer run, so nobody chairs them for you. You own the outcome.</p>
    <p>Once a year, at the <a href="/#summit-section">Summit</a>, a year of reading becomes one written plan for the next twelve months with your name on it.</p>
    <p>That is the whole design. See the chain clearly, then sit in a room where somebody expects you to move on it.</p>

    <h2>Who is behind this</h2>
    <p>ZeroToAct is led by <a href="${AUTHOR.url}" target="_blank" rel="author noopener noreferrer">Tolu Adetuyi</a>, who builds identity and cross border payments infrastructure and has consulted for companies across North America, the UK and Africa. Policy, currency and the cost of credit are line items he manages, not topics he covers. So are the effects of new technology, and where to position across several markets at once.</p>
    <p>Everyone behind a Signal is building something of their own. What we publish is the read we needed before our own decisions. You get it before you make yours.</p>

    <h2>Start</h2>
    <p>The Signal is free and weekly, and there is no paid tier that gets a better one.</p>
    <p class="why-turn">A year from now you will either have watched the chain move or you will have moved with it.</p>

    <div class="why-cta">${briefCta('Get the Free Signal')}</div>
  </main>
  ${READING_PROGRESS}`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${url}#webpage`,
        url, name: title, description: desc, inLanguage: 'en',
        isPartOf: { '@id': `${BASE}/#website` },
        about: { '@type': 'Thing', name: 'Why ZeroToAct exists' },
        publisher: PUBLISHER,
        primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE },
      },
      breadcrumb([['Home', `${BASE}/`], ['Why', url]]),
    ],
  };

  return shell({
    title, desc, canonical: url, body, head: jsonLdScript(ld),
    keywords: 'ZeroToAct, why, capital, policy, interest rates, global economy, Tolu Adetuyi',
  });
}

function annualOutlookPage() {
  // What goes in it, stated as fields rather than promises.
  const inside = [
    ['The scorecard', 'Every call the year\u2019s Signals made, graded right, wrong, half right or too early, before a single new one is made.'],
    ['Where the money is going', 'Rates, currencies and credit for the year ahead, and what each one does to the cost of borrowing where you are.'],
    ['Where the openings are', 'The sectors and markets the year\u2019s reporting kept returning to, and the ones it stopped returning to.'],
    ['What would break it', 'The assumptions the position rests on, named, so you can watch the ones that matter instead of all of them.'],
    ['The move, by position', 'What it means if you are building a career, running a company, or putting money to work. Three answers, not one.'],
  ].map(([h, p]) => `<li><span class="sig-move-who">${esc(h)}</span><span class="sig-move-do">${esc(p)}</span></li>`).join('\n        ');

  const sections = `
    <div class="sig-body">
      <p>Once a year, one publication reviews the year of Signals and tells you where to position for the next. It is the point where twelve months of weekly intelligence becomes a single, considered stance.</p>
    </div>
    <div class="sig-block sig-block--move">
      <h2>It grades its own calls first</h2>
      <p>Before it makes a single new call, the Outlook publishes which of the year\u2019s Signals held and which did not. You see the track record before you read the forecast. Most outlooks quietly forget last year\u2019s. This one starts there.</p>
    </div>

    <div class="sig-lasttime">
      <h2>What a graded call looks like</h2>
      <p>On 26 July we put the probability of a Federal Reserve hike near one third, while the consensus was still leaning towards a cut.</p>
      <p class="sig-lasttime-verdict"><strong>Early on timing, right on direction.</strong> The Fed held at that meeting, so the timing was wrong. Two meetings later it raised, unanimously. The grade goes in the Outlook with the call, not instead of it. <a href="/signals/read-the-corridor-not-the-cut/">Read where that landed</a>.</p>
    </div>

    <div class="sig-block">
      <h2>What is inside it</h2>
      <ul class="sig-moves">
        ${inside}
      </ul>
    </div>
    <div class="sig-block">
      <h2>It is built from the year\u2019s work</h2>
      <p>The Outlook is assembled, not invented. It draws on the year\u2019s Signals, the outcomes recorded inside the accountability cells, and the openings the reporting kept returning to. It is the compounding of everything already published, which is why it can be graded at all.</p>
    </div>
    <div class="sig-block">
      <h2>It sets up the Summit</h2>
      <p>The Outlook is where the year\u2019s intelligence becomes a position. The <a href="/#summit-section">Annual Summit</a> is where you turn that position into a personal 12-month plan. The first Outlook lands alongside the New Year Summit.</p>
    </div>`;

  return productShell({
    slug: 'annual-outlook',
    title: 'The Annual Outlook',
    desc: 'The year-ahead publication that grades last year’s calls before making new ones, built from the year’s Signals and the outcomes recorded inside the cells.',
    status: 'Annual',
    claim: "One publication a year that grades last year's calls, then tells you where to position for the next.",
    sections,
    cta: { heading: 'Be there for the first one.', sub: 'The first Annual Outlook lands with the New Year Summit. Subscribe to Weekly Signals to get it.', label: 'Get the Free Signal' },
  });
}


// A 404 is a page on the site, not an apology from the server. It keeps the
// chrome so the reader can carry on, and points at the thing most of them want.
function notFoundPage() {
  const body = `
  <main id="main" class="sig-wrap sig-article">
    <p class="sig-eyebrow">404</p>
    <h1 class="sig-title">That page is not here.</h1>
    <p class="sig-claim">The link may be old, or the page may have been retired. Everything we publish is still one click away.</p>
    <div class="sig-body">
      <h2 class="sig-subhead">Where to go instead</h2>
      <p>Start with <a href="/signals/">the Signal archive</a>, which holds every edition we have published. <a href="/why/">Why ZeroToAct exists</a> explains what we are doing and for whom, and <a href="/annual-outlook/">the Annual Outlook</a> is where the year's calls get graded.</p>
      <p>If you followed a link from somewhere on this site and it brought you here, that is our mistake rather than yours.</p>
    </div>
  </main>
${SITE_FOOTER}`;
  return shell({
    title: 'Page not found | ZeroToAct',
    desc: 'That page is not here. The Signal archive, the Why page and the Annual Outlook are all one click away.',
    canonical: '', noindex: true, body,
  });
}


// The homepage talked about Weekly Signals without ever showing one. This
// writes the newest edition into a marked region of the hand-maintained
// homepage, so the proof is on the page and never goes stale.
function latestSignalBand() {
  const s = signals[0];
  return `<section class="latest-band" aria-labelledby="latest-band-heading">
      <div class="container">
        <div class="latest-band-inner reveal">
          <p class="section-eyebrow" id="latest-band-heading">The latest Signal</p>
          <a class="latest-band-card" href="${editionUrl(s).replace(BASE, '')}">
            <p class="latest-band-meta"><span>${esc(s.theme)}</span><span>${esc(longDate(s.date))}</span><span>${readMinutes(s)} min read</span></p>
            <h3 class="latest-band-title">${esc(s.title)}</h3>
            <p class="latest-band-claim">${esc(s.headlineClaim)}</p>
            <span class="latest-band-cta">Read this week&rsquo;s Signal &rarr;</span>
          </a>
          <p class="latest-band-foot"><a href="/signals/">Every edition, kept as a dated record</a></p>
        </div>
      </div>
    </section>`;
}

function writeLatestSignalBand() {
  const file = resolve(ROOT, 'index.html');
  const html = readFileSync(file, 'utf8');
  const start = '<!-- latest-signal:start -->', end = '<!-- latest-signal:end -->';
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a === -1 || b === -1) { console.warn('index.html: latest-signal markers not found, skipped'); return; }
  const next = html.slice(0, a + start.length) + '\n' + latestSignalBand() + '\n    ' + html.slice(b);
  if (next !== html) { writeFileSync(file, next); console.log('wrote index.html latest-signal band'); }
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

write('why/index.html', whyPage());
write('404.html', notFoundPage());
write('annual-outlook/index.html', annualOutlookPage());

console.log(`\nGenerated ${signals.length} editions and 4 standalone pages.`);
writeLatestSignalBand();
