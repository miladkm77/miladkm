// Visual QA helper: node tools/shots.mjs <outDir> [desktop|mobile]
// Serves dist/, drives a real Chromium and records key scroll states.
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const out = process.argv[2] || '/tmp/shots';
const mode = process.argv[3] || 'desktop';
const only = process.argv[4]; // optional page filter
mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'text/xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = join(root, p);
  if (!existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const vp = mode === 'mobile' ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

const shot = async (name, full = false) => page.screenshot({ path: join(out, `${mode}-${name}.png`), fullPage: full });
const settle = (ms = 700) => page.waitForTimeout(ms);

async function scrollTo(y) { await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y); await settle(900); }

// ---- home ----
if (!only || only === 'home') {
  await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
  await settle(3200);
  await shot('home-01-hero');
  const info = await page.evaluate(() => {
    const t = document.querySelector('#fip-track');
    const h = document.querySelector('.site-header').offsetHeight;
    return { top: t.getBoundingClientRect().top + scrollY, height: t.offsetHeight, h, vh: innerHeight, live: document.documentElement.classList.contains('fip-live') };
  });
  console.log('fip', info);
  const stats = await page.evaluate(() => document.querySelector('.stat-strip').getBoundingClientRect().top + scrollY);
  await scrollTo(stats - 200); await shot('home-02-stats');
  const intro = await page.evaluate(() => document.querySelector('.fip__intro').getBoundingClientRect().top + scrollY);
  await scrollTo(intro - 60); await shot('home-03-fip-intro');
  const dist = info.height - (info.vh - info.h);
  const start = info.top - info.h;
  for (const p of [0.02, 0.2, 0.4, 0.6, 0.78, 0.88, 0.94, 1.0]) {
    await scrollTo(start + p * dist + (p === 1 ? 2 : 0));
    await settle(500);
    await shot(`home-04-fip-${String(Math.round(p * 100)).padStart(3, '0')}`);
  }
  const svc = await page.evaluate(() => document.querySelector('#services').getBoundingClientRect().top + scrollY);
  await scrollTo(svc - 40); await shot('home-05-services');
  await scrollTo(99999); await shot('home-06-footer');
}
for (const p of ['about', 'services', 'contact', 'terms']) {
  if (only && only !== p) continue;
  await page.goto(`${base}/${p}.html`, { waitUntil: 'networkidle' });
  await settle(3000);
  // scroll the whole page slowly so reveal animations fire
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 400) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(160); }
  await settle(900);
  const pending = await page.evaluate(() => document.querySelectorAll('.motion [data-reveal]:not(.is-in)').length);
  if (pending) console.log(`WARN ${p}: ${pending} reveal element(s) never revealed`);
  await page.evaluate(() => scrollTo(0, 0)); await settle(500);
  await shot(p, true);
}
console.log(errors.length ? 'CONSOLE:\n' + errors.join('\n') : 'no console errors');
await browser.close(); server.close();
