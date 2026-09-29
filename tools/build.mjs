// Tiny static-site builder: src/pages/*.html + src/partials/*.html → dist/
// No framework on purpose — the output is plain HTML/CSS/JS that any static
// host (Netlify, GitHub Pages, cPanel…) can serve as-is.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCat } from './cat.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

// ---- Site data (single source of truth for contact details) ----------------
const ORIGIN = 'https://drmaneli.ir';
const mapQ = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const site = {
  origin: ORIGIN,
  name: 'دکتر مانلی انصاری مود',
  license: '۱۰۱۸۱۱',
  phone: '۰۹۳۷ ۶۳۶ ۶۱۵۳',
  phoneTel: '+989376366153',
  whatsapp: 'https://wa.me/989376366153',
  // TODO: replace with the exact ResearchGate profile URL from the current site.
  researchgate: 'https://www.researchgate.net/',
  omid: {
    name: 'بیمارستان دامپزشکی امید',
    address: 'یوسف‌آباد، خیابان مهرام (مدبر)، نبش خیابان ۲۰، پلاک ۱',
    phone1: '۰۲۱ ۸۸۰۰ ۱۶۰۰', tel1: '+982188001600',
    phone2: '۰۲۱ ۸۸۶۳ ۶۳۲۳', tel2: '+982188636323',
    days: 'شنبه و دوشنبه',
    map: mapQ('بیمارستان دامپزشکی امید، یوسف‌آباد، خیابان مهرام، نبش خیابان ۲۰، تهران'),
  },
  rico: {
    name: 'کلینیک دامپزشکی ریکو',
    address: 'پاسداران، دروس، خیابان کماسایی، کوچه سوم شرقی (کیا)، پلاک ۱۷',
    phone1: '۰۲۱ ۲۲۵۷ ۹۱۲۹', tel1: '+982122579129',
    days: 'یکشنبه، سه‌شنبه و پنجشنبه',
    map: mapQ('کلینیک دامپزشکی ریکو، پاسداران، دروس، خیابان کماسایی، کوچه سوم شرقی، تهران'),
  },
};

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

// ---- Assets ----------------------------------------------------------------
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(src, 'assets'), join(dist, 'assets'), { recursive: true });

const vendor = join(dist, 'assets/js/vendor');
mkdirSync(vendor, { recursive: true });
for (const f of ['gsap.min.js', 'ScrollTrigger.min.js', 'DrawSVGPlugin.min.js']) {
  cpSync(join(root, 'node_modules/gsap/dist', f), join(vendor, f));
}
cpSync(join(root, 'node_modules/lenis/dist/lenis.min.js'), join(vendor, 'lenis.min.js'));
mkdirSync(join(dist, 'assets/fonts'), { recursive: true });
cpSync(
  join(root, 'node_modules/vazirmatn/fonts/webfonts/Vazirmatn[wght].woff2'),
  join(dist, 'assets/fonts/vazirmatn-var.woff2'),
);
cpSync(join(root, 'node_modules/vazirmatn/OFL.txt'), join(dist, 'assets/fonts/OFL.txt'));

const hash = createHash('md5')
  .update(readFileSync(join(src, 'assets/css/style.css')))
  .update(readFileSync(join(src, 'assets/js/main.js')))
  .digest('hex')
  .slice(0, 8);

// ---- Templating ------------------------------------------------------------
const partial = (name) => readFileSync(join(src, 'partials', `${name}.html`), 'utf8');
const cat = buildCat();

// Photos are optional at build time: drop real files into src/assets/img/ and
// they replace the designed placeholders automatically (no code change).
const hasImg = (n) => existsSync(join(src, 'assets/img', n));
const heroPhoto = hasImg('dr-hero.jpg')
  ? `<img src="assets/img/dr-hero.jpg" alt="دکتر مانلی انصاری مود هنگام معاینهٔ یک گربه" width="960" height="1200" fetchpriority="high">`
  : `<div class="photo-frame__ph"><svg viewBox="40 30 350 340" aria-hidden="true">${cat.frames[3]}</svg></div><span class="photo-frame__tag">جای عکس دکتر در حال معاینه</span>`;
const portraitPhoto = hasImg('dr-portrait.jpg')
  ? `<img src="assets/img/dr-portrait.jpg" alt="پرتره دکتر مانلی انصاری مود" width="900" height="1200" loading="lazy">`
  : `<div class="photo-frame__ph photo-frame__ph--mono" aria-hidden="true">م</div><span class="photo-frame__tag">جای پرتره دکتر</span>`;

function render(tpl, ctx) {
  let out = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => render(partial(n), ctx));
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    const v = get(ctx, key);
    return v == null ? m : String(v);
  });
  return out;
}

const pages = readdirSync(join(src, 'pages')).filter((f) => f.endsWith('.html'));
const sitemap = [];

for (const file of pages) {
  let raw = readFileSync(join(src, 'pages', file), 'utf8');
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(`${file}: missing front-matter comment`);
  const meta = JSON.parse(m[1]);
  raw = raw.slice(m[0].length);

  const ctx = {
    ...meta,
    site,
    v: hash,
    canonical: meta.path === 'index.html' ? `${ORIGIN}/` : `${ORIGIN}/${meta.path}`,
    cat_defs: cat.defs,
    cat_frames: cat.frames.join(''),
    cat_frame4: cat.frames[3],
    hero_photo: heroPhoto,
    portrait_photo: portraitPhoto,
  };
  let html = render(raw, ctx);
  // Wrap through layout
  html = render(partial('layout'), { ...ctx, content: html });
  // aria-current for the active nav item (works without JS)
  html = html.replace(/<a ([^>]*?)data-nav="(\w+)"/g, (mm, attrs, key) =>
    key === meta.nav ? `<a ${attrs}data-nav="${key}" aria-current="page"` : mm,
  );
  writeFileSync(join(dist, meta.path), html);
  if (meta.sitemap !== false) sitemap.push(ctx.canonical);
}

writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);

console.log(`built ${pages.length} pages → dist/ (v=${hash})`);
