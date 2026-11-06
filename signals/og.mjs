// Renders one 1200x630 share card per edition into /og, using the site's own
// fonts so the cards and the pages are the same typography. Run after
// build.mjs; it only rewrites a card whose source text has changed.
//
//   node signals/og.mjs
//
// Needs playwright resolvable from this repo (ESM ignores NODE_PATH, so it has
// to be a real node_modules here, not a path variable).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const signals = JSON.parse(readFileSync(resolve(ROOT, 'signals/signals.json'), 'utf8')).signals;
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const longDate = (iso) => new Date(iso + 'T12:00:00Z')
  .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Whole sentences up to a budget: a card should never end mid-word.
const clamp = (text, max = 170) => {
  const parts = String(text).split(/(?<=\.)\s+/);
  let out = '';
  for (const part of parts) {
    if (out && (out + ' ' + part).length > max) break;
    out = out ? out + ' ' + part : part;
    if (out.length >= max) break;
  }
  return out.length > max ? out.slice(0, max - 1).trimEnd() + '\u2026' : out;
};

const b64 = (p) => readFileSync(resolve(ROOT, p)).toString('base64');
const PLAYFAIR = b64('fonts/playfair-var.woff2');
const INTER = b64('fonts/inter-var.woff2');

const card = (s) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(data:font/woff2;base64,${PLAYFAIR}) format('woff2');font-weight:100 900;font-display:block}
@font-face{font-family:I;src:url(data:font/woff2;base64,${INTER}) format('woff2');font-weight:100 900;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#070707;color:#fff;
  font-family:I,sans-serif;display:flex;flex-direction:column;
  padding:72px 80px;position:relative;overflow:hidden}
body::before{content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(70% 55% at 18% 0%,rgba(255,255,255,.07),transparent 68%)}
.top{display:flex;align-items:center;gap:14px;font-size:17px;letter-spacing:.18em;
  text-transform:uppercase;color:#9a9a9a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  position:relative;z-index:1}
.mark{width:9px;height:9px;background:#fff;flex:none}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1}
h1{font-family:P,serif;font-weight:500;font-size:${s.title.length > 34 ? 72 : 86}px;line-height:1.04;
  letter-spacing:-.03em;max-width:19ch;text-wrap:balance;
  font-optical-sizing:auto;font-variation-settings:'opsz' 60;position:relative;z-index:1}
.claim{margin-top:26px;font-size:25px;line-height:1.45;color:#d2d2d2;max-width:50ch;
  position:relative;z-index:1}
.foot{display:flex;align-items:baseline;justify-content:space-between;
  padding-top:26px;border-top:1px solid rgba(255,255,255,.16);position:relative;z-index:1}
.brand{font-family:P,serif;font-size:27px;font-weight:500;letter-spacing:-.01em}
.tag{font-size:16px;letter-spacing:.16em;text-transform:uppercase;color:#9a9a9a;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
</style></head><body>
<p class="top"><span class="mark"></span>${esc(s.theme)} &middot; ${esc(longDate(s.date))}</p>
<div class="mid">
<h1>${esc(s.title)}</h1>
<p class="claim">${esc(clamp(s.headlineClaim))}</p>
</div>
<div class="foot"><span class="brand">ZeroToAct</span><span class="tag">Weekly Signal</span></div>
</body></html>`;

const outDir = resolve(ROOT, 'og');
mkdirSync(outDir, { recursive: true });
const stampPath = resolve(outDir, '.stamps.json');
const stamps = existsSync(stampPath) ? JSON.parse(readFileSync(stampPath, 'utf8')) : {};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let wrote = 0, skipped = 0;
for (const s of signals) {
  const html = card(s);
  const hash = createHash('sha1').update(html).digest('hex').slice(0, 12);
  const file = resolve(outDir, `${s.slug}.png`);
  if (stamps[s.slug] === hash && existsSync(file)) { skipped++; continue; }
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  stamps[s.slug] = hash; wrote++;
}
await browser.close();
writeFileSync(stampPath, JSON.stringify(stamps, null, 2) + '\n');
console.log(`og cards: ${wrote} written, ${skipped} unchanged`);
