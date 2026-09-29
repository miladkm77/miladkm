// Behavioural QA: fallbacks, form, mobile nav. node tools/qa.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; const f = join(root, p); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f)); }).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let fails = 0;
const ok = (c, msg) => { console.log(c ? 'PASS' : 'FAIL', msg); if (!c) fails++; };

const fallbackChecks = async (label, ctxOpts, routeBlock) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...ctxOpts });
  const page = await ctx.newPage();
  if (routeBlock) await page.route('**/vendor/*.js', (r) => r.abort());
  await page.goto(base + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(routeBlock ? 4600 : 800);
  const st = await page.evaluate(() => {
    const vis = (s) => { const e = document.querySelector(s); if (!e) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.99 && r.width > 0 && r.height > 0; };
    return {
      live: document.documentElement.classList.contains('fip-live'),
      finalVisible: vis('#fip-final'), ctaVisible: vis('#fip-cta'), staticCat: vis('.fip__static'),
      sceneHidden: getComputedStyle(document.querySelector('#fip-scene')).display === 'none',
      statsText: [...document.querySelectorAll('.bento .tile__num[data-count]')].map((e) => e.textContent.trim()).join(' '),
      revealHidden: [...document.querySelectorAll('[data-reveal]')].filter((e) => +getComputedStyle(e).opacity < 0.99).length,
      trackH: document.querySelector('#fip-track').offsetHeight, vh: innerHeight, wipeGone: getComputedStyle(document.querySelector('.wipe')).display === 'none',
    };
  });
  console.log(label, JSON.stringify(st));
  ok(!st.live, `${label}: scroll story not active`);
  ok(st.wipeGone, `${label}: page wipe never covers content`);
  ok(st.finalVisible && st.ctaVisible, `${label}: end-state card + CTA visible`);
  ok(st.staticCat && st.sceneHidden, `${label}: healthy cat shown, live scene hidden`);
  ok(st.statsText === '۸۰۰+ ۳۹ ۲۲۵', `${label}: stats show final numbers`);
  ok(st.revealHidden === 0, `${label}: no content stuck invisible`);
  ok(st.trackH < st.vh * 2, `${label}: no tall scroll track`);
  await page.screenshot({ path: `/tmp/claude-0/-home-user-miladkm/41cccd8f-b68b-5090-938e-f9f8d30056a1/scratchpad/s/fallback-${label}.png`, fullPage: true });
  await ctx.close();
};
await fallbackChecks('reduced-motion', { reducedMotion: 'reduce' });
await fallbackChecks('no-js', { javaScriptEnabled: false });
await fallbackChecks('gsap-blocked', {}, true);

// ---- form → WhatsApp
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await page.goto(base + '/contact.html?visit=inperson#form', { waitUntil: 'networkidle' });
  ok(await page.isChecked('#v-in'), 'form: ?visit=inperson pre-selects in-person');
  ok(await page.isVisible('#clinic-field'), 'form: clinic select shown for in-person');
  await page.click('button[type=submit]');
  ok((await page.locator('.field.has-err').count()) === 2, 'form: empty name+phone → 2 validation errors');
  await page.click('label[for=v-online]');
  ok(!(await page.isVisible('#clinic-field')), 'form: clinic select hidden for online');
  await page.selectOption('#animal', 'گربه');
  await page.fill('#age', '۳ سال');
  await page.fill('#problem', 'بی‌اشتهایی و تب');
  await page.fill('#name', 'سارا');
  await page.fill('#phone', '۰۹۱۲۳۴۵۶۷۸۹');
  await page.click('button[type=submit]');
  const opened = await page.evaluate(() => window.__opened);
  ok(opened.length === 1 && opened[0].startsWith('https://wa.me/989376366153?text='), 'form: opens wa.me/989376366153 with text');
  const text = decodeURIComponent(opened[0].split('text=')[1] || '');
  console.log(text.replace(/\n/g, ' | '));
  ok(text.includes('ویزیت آنلاین') && text.includes('۰۹۱۲۳۴۵۶۷۸۹') && text.includes('سارا') && text.includes('بی‌اشتهایی'), 'form: message carries type, phone (Persian digits), name, problem');
  ok(await page.isVisible('#form-ok'), 'form: confirmation + manual link shown');
  await ctx.close();
}

// ---- mobile tab bar
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '/about.html', { waitUntil: 'networkidle' });
  ok(await page.isVisible('.tabbar'), 'mobile: tab bar visible');
  ok((await page.getAttribute('.tabbar a[data-nav=about]', 'aria-current')) === 'page', 'mobile: current tab marked');
  ok(!(await page.isVisible('.nav')), 'mobile: desktop nav hidden');
  await ctx.close();
}
// ---- horizontal overflow on every page, mobile
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  for (const p of ['index', 'about', 'services', 'contact', 'terms']) {
    await page.goto(`${base}/${p}.html`, { waitUntil: 'networkidle' });
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    ok(w[0] <= w[1], `360px: ${p}.html has no horizontal overflow (${w[0]}/${w[1]})`);
  }
  await ctx.close();
}
await browser.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall checks passed');
process.exit(fails ? 1 : 0);
