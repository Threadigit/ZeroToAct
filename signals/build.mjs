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
// Every edition shared with the same picture, so sixteen different Signals
// previewed identically. Each now has a card rendered from its own headline.
const ogImagePath = (s) => `/og/${s.slug}.png`;
const ogImageUrl = (s) => `${BASE}${ogImagePath(s)}`;
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

// The archive index runs sixteen dates down a column, where the long form is
// noise. Year is dropped within the current year and kept outside it.
const shortDate = (iso) => {
  const d = new Date(iso + 'T12:00:00Z');
  const sameYear = iso.slice(0, 4) === new Date().getUTCFullYear().toString();
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC',
  });
};

const rfc822 = (iso) => new Date(iso + 'T12:00:00Z').toUTCString();
const editionPath = (s) => `/signals/${s.slug}/`;        // root-relative, for on-site links
const editionUrl = (s) => `${BASE}${editionPath(s)}`;    // absolute, for canonical/OG/RSS/sitemap/citation
// Titles may end in a full stop, which would read as "Nigeria., 13 September" in a citation.
const citeTitle = (s) => s.title.replace(/\.$/, '');
const citation = (s) =>
  `ZeroToAct, ${s.number ? `Signal ${s.number}, ` : ''}${citeTitle(s)}, ${longDate(s.date)}, ${editionUrl(s)}`;

// Reading progress. Any page built around a single column of prose gets one.
const READING_PROGRESS = `<div class="sig-progress" id="sig-progress" role="presentation"></div>
  <script>
    (function () {
      var bar = document.getElementById('sig-progress');
      var article = document.querySelector('.signal-reading-inner, .why-body-inner, .sig-article, .why-page');
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
      <a href="/" class="nav-brand" aria-label="ZeroToAct Home"><span class="nav-logo"><img src="/favicon-v2.png" alt="" width="34" height="34" /></span><span class="nav-wordmark">ZeroToAct</span></a>
      <ul class="nav-links" role="list">
        <li><a href="/why/" class="nav-link">Why</a></li>
        <li><a href="/annual-outlook/" class="nav-link">Outlook</a></li>
        <li><a href="/summit/" class="nav-link">Summit</a></li>
        <li><a href="/community/" class="nav-link">Network</a></li>
        <li><a href="/signals/" class="nav-link">Archive</a></li>
      </ul>
      <button type="button" class="nav-cta join-cta-trigger" data-intent="brief">Subscribe free</button>
      <button type="button" class="nav-hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
    </div>
    <div class="nav-mobile-menu" id="mobile-menu" aria-hidden="true">
      <a href="/why/" class="mobile-link">Why</a>
      <a href="/annual-outlook/" class="mobile-link">Annual Outlook</a>
      <a href="/summit/" class="mobile-link">Summit</a>
      <a href="/community/" class="mobile-link">Live Network</a>
      <a href="/signals/" class="mobile-link">Signal Archive</a>
      <button type="button" class="mobile-link mobile-link-cta join-cta-trigger" data-intent="brief">Subscribe free</button>
    </div>
  </nav>`;

const SITE_FOOTER = `  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="/" class="footer-logo" aria-label="ZeroToAct Home"><img src="/favicon-v2.png" alt="" width="48" height="48" loading="lazy" decoding="async" /></a>
          <p class="footer-tagline">See the shift.<br />Make the move.</p>
        </div>
        <nav class="footer-nav" aria-label="Footer navigation">
          <div class="footer-nav-group">
            <p class="footer-nav-label">Publication</p>
            <a href="/annual-outlook/" class="footer-nav-link">Annual Outlook</a>
            <a href="/signals/" class="footer-nav-link">Signal Archive</a>
          </div>
          <div class="footer-nav-group">
            <p class="footer-nav-label">Explore</p>
            <a href="/why/" class="footer-nav-link">Why</a>
            <a href="/summit/" class="footer-nav-link">Summit</a>
            <a href="/community/" class="footer-nav-link">Live Network</a>
            <a href="/#faq" class="footer-nav-link">FAQ</a>
            <a href="https://adetuyi.com" target="_blank" rel="noopener noreferrer" class="footer-nav-link">Founder</a>
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

const shell = ({ title, desc, canonical, head = '', body, ogType = 'website', articleMeta = '', keywords = '', noindex = false, image = OG_IMAGE }) => `<!DOCTYPE html>
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
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
${articleMeta}  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@zerotoact" />
  <meta name="twitter:creator" content="@zerotoact" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${image}" />
  <link rel="alternate" type="application/rss+xml" title="ZeroToAct Signals" href="/signals/feed.xml" />
  <link rel="preload" href="/fonts/playfair-var.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/style.css" />
  <link rel="stylesheet" href="/signals/signals.css" />
  <link rel="stylesheet" href="/publication.css" />
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
  // A minute count is a blog device, not a publication's. The archive dropped
  // it; the edition header keeps the two facts that place the piece.
  const eyebrowBits = [s.theme, longDate(s.date)];

  // A written item is a paragraph (string) or a section subheading ({ h: '...' }).
  const article = s.written
    ? s.written.map(renderBlock).join('\n        ')
    : `<p class="sig-pending">The written analysis for this Signal is being prepared from the video above. Watch the Signal in the meantime, or <a href="/#subscribe-section">get Weekly Signals by email</a>.</p>`;

  const draftBanner = s.status === 'draft' && s.written
    ? `<p class="sig-draft-note" role="note">Draft for review. Not yet published.</p>`
    : '';

  const method = s.method
    ? `<div class="sig-block"><h2>Method</h2><p>${esc(s.method)}</p></div>` : '';
  const sources = s.sources || [];
  const source = s.written
    ? `<div class="sig-block"><h2>Sources</h2>${
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
    ? `<div class="sig-block sig-block--move" id="next-move"><h2>Next move</h2>${
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
        image: { '@type': 'ImageObject', url: ogImageUrl(s), width: 1200, height: 630 },
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
  <main id="main" class="signal-page">
    <section class="signal-hero">
      <div class="signal-hero-inner">
        <p class="sig-eyebrow">${eyebrowBits.map(esc).join(' &middot; ')}</p>
        <h1 class="sig-title">${esc(s.title)}</h1>
        <p class="sig-claim">${esc(s.headlineClaim)}</p>
        <p class="sig-byline sig-byline--top">By <a href="${AUTHOR.url}" target="_blank" rel="author noopener noreferrer">${AUTHOR.name}</a></p>
${draftBanner ? `        ${draftBanner}\n` : ''}      </div>
    </section>
    <section class="signal-reading">
      <div class="signal-reading-inner${s.videoId ? '' : ' signal-reading-inner--solo'}">
    ${(() => {
      // An edition can have a video, a revision notice, both or neither. The
      // figure used to be emitted unconditionally, which left an empty
      // <figure> on an edition with neither, and a figcaption has to sit
      // inside a figure to be valid, so the notice stands alone without one.
      const revised = s.revised && s.revised !== s.date;
      const notice = revised ? `Revised ${longDate(s.revised)}, first published ${
        s.revised.slice(0, 4) === s.date.slice(0, 4) ? longDate(s.date).replace(/ \d{4}$/, '') : longDate(s.date)
      }. ${esc(s.revisionNote || '')}${s.videoPredatesRevision ? ' Video is the original edition.' : ''}` : '';
      if (s.videoId) {
        return `<figure class="sig-video">
      <div class="sig-video-frame">
        <iframe src="https://www.youtube-nocookie.com/embed/${esc(s.videoId)}" title="${esc(s.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>${revised ? `
      <figcaption class="sig-revised" role="note">${notice}</figcaption>` : ''}
    </figure>`;
      }
      return revised ? `<p class="sig-revised" role="note">${notice}</p>` : '';
    })()}
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
      <p>${esc(AUTHOR.name)} is co-founder and Chief Innovation Officer of <a href="https://prembly.com" target="_blank" rel="noopener noreferrer">Prembly</a>, which builds identity and compliance infrastructure. Signals regularly cover payments, identity and regulation, which is his commercial interest as well as his subject.</p>${(s.disclosure || []).length ? `
      ${(s.disclosure || []).map((d) => `<p>${linkify(esc(d))}</p>`).join('\n      ')}` : ''}
    </div>
      </div>
    </section>
  </main>
  ${READING_PROGRESS}${(s.written || []).some(b => b && b.chart) ? CHART_SCRIPT : ''}`;

  return shell({
    title: `${s.seoTitle || s.title} | ZeroToAct Weekly Signal`,
    desc: s.seoDesc || s.headlineClaim, canonical: url, head: jsonLdScript(jsonLd), body,
    ogType: 'article', articleMeta, keywords: kw, image: ogImageUrl(s),
  });
}

// ── Archive index ──
function indexPage() {
  const filters = [`<button class="sig-filter is-active" data-theme="all" type="button">All</button>`]
    .concat(themes.map((t) => `<button class="sig-filter" data-theme="${esc(t)}" type="button">${esc(t)}</button>`))
    .join('\n        ');

  const [lead, ...rest] = signals;

  const leadCard = `<article class="arc-lead" data-theme="${esc(lead.theme)}">
        <a class="arc-lead-link" href="${editionPath(lead)}">
          <p class="arc-lead-meta"><time datetime="${lead.date}">${esc(longDate(lead.date))}</time> &middot; ${esc(lead.theme)}</p>
          <h2 class="arc-lead-title">${esc(lead.title)}</h2>
          <p class="arc-lead-claim">${esc(lead.headlineClaim)}</p>
        </a>
      </article>`;

  const rows = rest.map((s) => `
        <li class="arc-row" data-theme="${esc(s.theme)}">
          <a class="arc-row-link" href="${editionPath(s)}">
            <span class="arc-row-date"><time datetime="${s.date}">${esc(shortDate(s.date))}</time></span>
            <span class="arc-row-title">${esc(s.title)}</span>
            <span class="arc-row-theme">${esc(s.theme)}</span>
          </a>
        </li>`).join('');

  // Every edition grades the previous week's call. Collected, that record is
  // the most checkable thing here. Set as prose, not as scorecards.
  const graded = signals.filter((s) => s.lastTime && s.lastTime.of);
  const bySlug = Object.fromEntries(signals.map((s) => [s.slug, s]));
  const record = graded.map((s) => {
    const of = bySlug[s.lastTime.of];
    return `
        <li class="arc-call">
          <p class="arc-call-of">${of ? `<a href="${editionPath(of)}">${esc(of.title)}</a>, ${esc(shortDate(of.date))}` : ''}</p>
          <p class="arc-call-said">${esc(s.lastTime.said)}</p>
          <p class="arc-call-landed"><em>${esc(s.lastTime.verdict)}.</em> ${esc(s.lastTime.landed)}</p>
        </li>`;
  }).join('');

  const body = `
  <main id="main" class="archive-page">
    <header class="archive-hero">
      <div class="archive-hero-inner">
        <p class="sig-eyebrow">Weekly Signals</p>
        <div><h1 class="sig-index-title">The Signal Archive</h1><p class="sig-index-sub">Every weekly Signal, kept as a dated, citable record. <a href="/signals/feed.xml">Follow by RSS</a>.</p></div>
      </div>
    </header>
    <section class="archive-body">
      <div class="archive-body-inner">
        <div class="sig-filters" role="group" aria-label="Filter by theme">
            ${filters}
        </div>

        ${leadCard}

        <ol class="arc-index" role="list">${rows}
        </ol>

        <section class="arc-record" aria-labelledby="track-record">
          <h2 class="arc-section-head" id="track-record">The record</h2>
          <p class="arc-record-intro">Every Signal grades the previous week's call before making a new one, including the weeks it missed.</p>
          <ol class="arc-calls" role="list">${record}
          </ol>
        </section>
      </div>
    </section>
  </main>
  <script>
    (function () {
      var btns = document.querySelectorAll('.sig-filter');
      var items = document.querySelectorAll('[data-theme]');
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          btns.forEach(function (x) { x.classList.remove('is-active'); });
          b.classList.add('is-active');
          var t = b.getAttribute('data-theme');
          items.forEach(function (c) {
            if (c.classList.contains('sig-filter')) return;
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
    { loc: `${BASE}/summit/`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${BASE}/community/`, priority: '0.8', changefreq: 'monthly' },
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
function productShell({ slug, title, desc, kind = 'Intelligence', status, claim, sections, cta }) {
  const url = `${BASE}/${slug}/`;
  const body = `
  <main id="main" class="product-page">
    <section class="product-hero">
      <div class="product-hero-inner">
        <p class="sig-eyebrow">${esc(kind)}</p>
        <h1 class="sig-title">${esc(title)}</h1>
        <p class="sig-claim">${esc(claim)}</p>
      </div>
    </section>
    <section class="product-body">
      <div class="product-body-inner">
${sections}
        <div class="sig-cta-band">
          <div><h2>${esc(cta.heading)}</h2><p>${esc(cta.sub)}</p></div>
          ${cta.intent && cta.intent !== 'brief'
            ? `<button type="button" class="sig-cta-btn join-cta-trigger" data-intent="${esc(cta.intent)}">${esc(cta.label)}</button>`
            : briefCta(cta.label)}
        </div>
      </div>
    </section>
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
  const title = 'About ZeroToAct | Intelligence for your next decision';
  const desc = 'How ZeroToAct turns consequential shifts in money, policy and technology into useful intelligence for career builders, business builders and people investing money.';

  const body = `
  <main id="main" class="why-page why-page--institutional">
    <section class="why-hero">
      <div class="why-hero-inner">
        <p class="sig-eyebrow">About ZeroToAct</p>
        <div><h1 class="why-title">Intelligence should change what you do next.</h1><p class="why-claim">ZeroToAct explains the shifts in money, policy and technology that can change what you build, what you earn and where you invest.</p></div>
      </div>
    </section>
    <section class="why-body">
      <div class="why-body-inner">
        <section class="why-editorial-intro">
          <p class="why-section-label">What we do</p>
          <div><h2>We follow the decision until it reaches you.</h2><p>A central bank changes direction. A government rewrites a rule. A technology alters the cost of doing business. The headline is only the beginning. We trace what changed, who it affects and what the reader should reconsider now.</p><p>Each Weekly Signal chooses one consequential shift and gives it enough room to be understood. It is written for a decision, not for the feed.</p></div>
        </section>

        <blockquote class="why-declaration">“The point is not to know more news. It is to see the change early enough to act with judgment.”</blockquote>

        <section class="why-editorial-section">
          <p class="why-section-label">Who it is for</p>
          <div><h2>People with something real at stake.</h2><p>Career builders deciding what to learn, negotiate or pursue. Business builders deciding where to place time, people and capital. People investing money deciding what deserves conviction and what would change their mind.</p><p>The same shift can produce three different decisions. We write with that difference in view.</p></div>
        </section>

        <section class="why-standard">
          <p class="why-section-label">The editorial standard</p>
          <div><h2>A considered view, with the evidence attached.</h2><dl><div><dt>Selection</dt><dd>We cover the shift that changes a decision, not everything that happened.</dd></div><div><dt>Reasoning</dt><dd>We show the chain from event to consequence and name the assumptions inside it.</dd></div><div><dt>Accountability</dt><dd>Sources stay visible. Calls stay in the archive. What held and what failed can be inspected.</dd></div></dl></div>
        </section>

        <section class="why-team">
          <p class="why-section-label">The ZeroToAct team</p>
          <div><h2>Built by people who use it.</h2><p>ZeroToAct is made by a small team of operators who use the same Signals to make decisions about their work, businesses and capital. The publication is not a view from the sidelines. It is the intelligence practice the team had always wanted and finally committed to building in public.</p><p>Every edition has to be useful enough for the team to act on before it asks the reader to do the same. The reasoning, sources and record remain public so readers can judge the work for themselves.</p></div>
        </section>

        <div class="why-cta"><div><h2>Read one Signal. Judge the work.</h2><p>The Weekly Signal is free, sourced and kept in the public archive.</p></div>${briefCta('Get the Free Signal')}</div>
      </div>
    </section>
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
  const sections = `
    <section class="interior-intro">
      <p class="interior-label">The publication</p>
      <div><h2>A year of Signals becomes one considered position.</h2><p>The Annual Outlook reviews the year, grades what held and what did not, then sets out our view of the twelve months ahead.</p><p>It is delivered at the Annual Summit and becomes the working text for the day. You do not receive a forecast and get left to interpret it alone.</p></div>
    </section>

    <section class="interior-feature">
      <h2>Before we call the next year, we grade the last one.</h2>
      <div><p>Every major call is marked right, wrong, partly right or too early. The original reasoning remains available in the archive.</p><p class="interior-example"><strong>Example</strong> Our July call on the Federal Reserve was early on timing and right on direction. The hold came first. The unanimous increase followed two meetings later.</p></div>
    </section>

    <section class="interior-section">
      <div><p class="interior-label">Inside the Outlook</p><h2>Enough structure to make the position testable.</h2></div>
      <dl class="interior-ledger">
        <div><dt>Scorecard</dt><dd>The year\u2019s calls and the evidence of how each one landed.</dd></div>
        <div><dt>Capital</dt><dd>Rates, currencies and credit, with the implications for the cost of money.</dd></div>
        <div><dt>Openings</dt><dd>The sectors and markets the reporting kept returning to, and those it left behind.</dd></div>
        <div><dt>Assumptions</dt><dd>The conditions that support the position and the events that would break it.</dd></div>
        <div><dt>Your position</dt><dd>A distinct reading for career builders, business builders and people investing money.</dd></div>
      </dl>
    </section>

    <section class="interior-note">
      <p class="interior-label">One day, one body of work</p>
      <div><h2>The Outlook and Summit belong together.</h2><p>We present the Outlook, test its assumptions and use the rest of the <a href="/summit/">Annual Summit</a> to turn its conclusions into a personal twelve-month plan.</p></div>
    </section>`;

  return productShell({
    slug: 'annual-outlook',
    title: 'The Annual Outlook',
    kind: 'Presented at the Annual Summit',
    desc: 'The year-ahead publication delivered at the Annual Summit, grading the previous year’s calls before setting out the position for the next.',
    status: 'Annual',
    claim: "Delivered at the Annual Summit, it grades the previous year's calls before setting out our position for the next.",
    sections,
    cta: { heading: 'Receive the Outlook at the Summit.', sub: 'Join the waitlist to receive the date and be in the room where the Outlook becomes a plan.', label: 'Join the Summit Waitlist', intent: 'summit' },
  });
}



// ── Summit page ──
// The homepage carries a summary; this is the whole thing. Everything stated
// here is already committed to elsewhere on the site -- nothing about the
// programme is invented to fill the page.
function summitPage() {
  const sections = `
    <section class="interior-intro">
      <p class="interior-label">The day</p>
      <div><h2>Most of the year is reading. One day is deciding.</h2><p>The <a href="/annual-outlook/">Annual Outlook</a> gives the room a shared view of the year. The Summit turns that view into a decision about your own work, business or capital.</p><p>You leave with twelve months of direction written in your own words, for your own position.</p></div>
    </section>

    <section class="interior-feature">
      <h2>The plan is the deliverable.</h2>
      <div><p>Not a collection of notes and not another recording to revisit later. The day ends with a written plan you can use.</p><p>The <a href="/community/">Live Network</a> exists to keep that plan in motion after the event.</p></div>
    </section>

    <section class="interior-section">
      <div><p class="interior-label">How the day works</p><h2>One text. Three stages of work.</h2></div>
      <dl class="interior-ledger">
        <div><dt>Read the year</dt><dd>We present the Outlook and the evidence behind its position.</dd></div>
        <div><dt>Test the view</dt><dd>The room works through the assumptions, risks and questions that could change it.</dd></div>
        <div><dt>Write the plan</dt><dd>You decide what to start, stop or strengthen over the next twelve months.</dd></div>
      </dl>
    </section>

    <section class="interior-section">
      <div><p class="interior-label">Three positions</p><h2>The same year does not create the same decision for everyone.</h2></div>
      <dl class="interior-ledger">
        <div><dt>Career</dt><dd>What to learn, negotiate or pursue from where you are now.</dd></div>
        <div><dt>Business</dt><dd>Where demand, policy and capital change the plan you are building against.</dd></div>
        <div><dt>Investment</dt><dd>What deserves conviction, what carries new risk and what would change your mind.</dd></div>
      </dl>
    </section>

    <dl class="interior-details">
      <div><dt>When</dt><dd>2027</dd></div>
      <div><dt>Format</dt><dd>One virtual day</dd></div>
      <div><dt>For</dt><dd>Career builders, business builders and people investing money</dd></div>
    </dl>`;

  return productShell({
    slug: 'summit',
    title: 'The Annual Summit',
    kind: 'One virtual day each year',
    desc: 'One day a year where a year of reading becomes a written twelve-month plan with your name on it.',
    status: 'Annual',
    claim: 'The Outlook, the discussion and the activities happen in one day, ending with a written plan that belongs to you.',
    sections,
    cta: { heading: 'Be in the room.', sub: 'The waitlist is how the date reaches you. Nothing to pay to join it.', label: 'Join the Summit Waitlist', intent: 'summit' },
  });
}

// ── Community page ──
function communityPage() {
  const sections = `
    <section class="interior-intro">
      <p class="interior-label">The network</p>
      <div><h2>Understanding is not the same as moving.</h2><p>A private intention with no witness quietly expires. The Live Network places you with four people at a similar stage who expect to hear what you did next.</p><p>The group meets every two weeks. The commitment stays yours. The record stays visible.</p></div>
    </section>

    <section class="interior-feature">
      <h2>Five people. One commitment. Every two weeks.</h2>
      <div><p>Small enough for an absence to be obvious. Large enough to survive someone having a difficult month.</p><p>Cells run on WhatsApp. They are peer led, with moderators checking the health of the cadence rather than chairing the meeting.</p></div>
    </section>

    <section class="interior-section">
      <div><p class="interior-label">How it works</p><h2>The structure is deliberately simple.</h2></div>
      <dl class="interior-ledger">
        <div><dt>Apply</dt><dd>Tell us what you are building, your stage and the decision you are trying to move.</dd></div>
        <div><dt>Commit</dt><dd>Set the action and the date in front of four people matched to your position.</dd></div>
        <div><dt>Review</dt><dd>Every two weeks, say what shipped, what changed and what happens next.</dd></div>
      </dl>
    </section>

    <section class="interior-section">
      <div><p class="interior-label">Useful at three positions</p><h2>Accountability changes with the work.</h2></div>
      <dl class="interior-ledger">
        <div><dt>Career</dt><dd>Keep a learning plan, search, negotiation or professional move attached to a date.</dd></div>
        <div><dt>Business</dt><dd>Review the operating commitment that matters now, from revenue and hiring to a launch or change in direction.</dd></div>
        <div><dt>Investment</dt><dd>State the reasoning behind an allocation and the condition that would change your mind.</dd></div>
      </dl>
    </section>

    <section class="interior-note">
      <p class="interior-label">What it is not</p>
      <div><h2>Not another content channel.</h2><p>No feed to keep up with and no paid mastermind performance. The work is to say what you will do, then return in a fortnight with the record.</p></div>
    </section>`;

  return productShell({
    slug: 'community',
    title: 'The Live Network',
    kind: 'Peer groups of five',
    desc: 'Cells of five, matched to your stage, reviewing what you promised every two weeks. Peer run, on WhatsApp, open to anyone ready to commit to the cadence.',
    status: 'Live',
    claim: 'Five people at your stage. One standing commitment. A review every two weeks.',
    sections,
    cta: { heading: 'The community is live.', sub: 'Open to anyone ready to commit to the cadence.', label: 'Apply to the Network', intent: 'community' },
  });
}

// ── Latest Signals on the homepage ──
// The homepage described Weekly Signals without ever showing one. This writes
// the three newest into a marked region of the hand-maintained index.html, so
// the proof is on the page and cannot go stale. The newest leads with its
// claim; the two behind it are ruled rows, which is the archive's own logic at
// small scale and keeps this from being a third three-column grid.
function latestSignalsBand(n = 3) {
  const [lead, ...rest] = signals.slice(0, n);
  const row = (s) => `
            <li class="latest-row">
              <a class="latest-row-link" href="${editionPath(s)}">
                <span class="latest-row-date"><time datetime="${s.date}">${esc(shortDate(s.date))}</time></span>
                <span class="latest-row-title">${esc(s.title)}</span>
                <span class="latest-row-theme">${esc(s.theme)}</span>
              </a>
            </li>`;
  return `<section id="latest-signals" class="latest-section" aria-labelledby="latest-heading">
      <div class="container">
        <div class="latest-inner">
          <p class="section-eyebrow">On the record</p>
          <div class="latest-main reveal">
            <h2 id="latest-heading" class="section-heading">The latest Signals.</h2>
            <article class="latest-lead">
              <a class="latest-lead-link" href="${editionPath(lead)}">
                <p class="latest-lead-meta"><time datetime="${lead.date}">${esc(longDate(lead.date))}</time> &middot; ${esc(lead.theme)}</p>
                <h3 class="latest-lead-title">${esc(lead.title)}</h3>
                <p class="latest-lead-claim">${esc(lead.headlineClaim)}</p>
                <span class="latest-lead-cta">Read this Signal &rarr;</span>
              </a>
            </article>
            <ol class="latest-rows" role="list">${rest.map(row).join('')}
            </ol>
            <p class="latest-foot"><a href="/signals/">The full archive</a></p>
          </div>
        </div>
      </div>
    </section>`;
}

// The strongest thing this publication can say about itself is that it grades
// its own calls, including the ones it got wrong. That belongs on the homepage
// and it belongs generated, so it cannot drift from the editions. Four graded
// calls: enough to show the practice, short enough to stay a band.
function recordBand(n = 4) {
  const rows = signals
    .filter((s) => s.lastTime && s.lastTime.of)
    .slice(0, n)
    .map((s) => {
      const of = signals.find((x) => x.slug === s.lastTime.of);
      return `
            <li class="rec-row">
              <p class="rec-row-head">
                <span class="rec-row-verdict">${esc(s.lastTime.verdict)}</span>
                <span class="rec-row-of">${of
                  ? `<a href="${editionPath(of)}">${esc(of.title)}</a>, ${esc(shortDate(of.date))}`
                  : esc(s.lastTime.of)}</span>
              </p>
              <p class="rec-row-said">${esc(s.lastTime.said)}</p>
              <p class="rec-row-landed">${esc(s.lastTime.landed)}</p>
            </li>`;
    })
    .join('');

  return `<section id="record" class="record-section" aria-labelledby="record-heading">
      <div class="container">
        <div class="record-inner">
          <p class="section-eyebrow">The record</p>
          <div class="record-main reveal">
            <h2 id="record-heading" class="section-heading">We grade our own calls.</h2>
            <p class="section-sub">
              Every Signal scores the previous week's call before it makes a new one, in the same
              words it used at the time, including the weeks it missed.
            </p>
            <div class="rec-head" aria-hidden="true">
              <span>The call</span>
              <span>What happened</span>
            </div>
            <ol class="rec-rows" role="list">${rows}
            </ol>
            <p class="rec-foot"><a href="/signals/#track-record">The full record</a></p>
          </div>
        </div>
      </div>
    </section>`;
}

// Both homepage bands are written into marked regions of the hand-maintained
// index.html, so the page carries live content without becoming a template.
function writeBand(name, html) {
  const file = resolve(ROOT, 'index.html');
  const src = readFileSync(file, 'utf8');
  const start = `<!-- ${name}:start -->`, end = `<!-- ${name}:end -->`;
  const a = src.indexOf(start), b = src.indexOf(end);
  if (a === -1 || b === -1) { console.warn(`index.html: ${name} markers not found, skipped`); return; }
  const next = src.slice(0, a + start.length) + '\n    ' + html + '\n    ' + src.slice(b);
  if (next !== src) { writeFileSync(file, next); console.log(`wrote index.html ${name} band`); }
}

// A 404 is a page on the site, not an apology from the server. It keeps the
// chrome so the reader can carry on, and points at the thing most of them want.
function notFoundPage() {
  const body = `
  <main id="main" class="not-found-page">
    <div class="not-found-inner">
      <p class="sig-eyebrow">Page not found</p>
      <h1>That page is not here.</h1>
      <p>The link may be old or the page may have been retired. Every published edition is still available in the Signal Archive.</p>
      <div class="not-found-actions"><a class="pub-button" href="/signals/">Open the archive</a><a class="pub-inline-link" href="/">Return home</a></div>
    </div>
  </main>
`;
  return shell({
    title: 'Page not found | ZeroToAct',
    desc: 'That page is not here. The Signal archive, the Why page and the Annual Outlook are all one click away.',
    canonical: '', noindex: true, body,
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

const STANDALONE = [
  ['why/index.html', whyPage],
  ['404.html', notFoundPage],
  ['annual-outlook/index.html', annualOutlookPage],
  ['summit/index.html', summitPage],
  ['community/index.html', communityPage],
];
for (const [rel, fn] of STANDALONE) write(rel, fn());

console.log(`\nGenerated ${signals.length} editions and ${STANDALONE.length} standalone pages.`);
