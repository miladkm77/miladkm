import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { buildCat } from './cat.mjs';

const out = process.argv[2];
const { defs, frames } = buildCat();
const html = `<!doctype html><meta charset=utf-8><body style="margin:0;background:#faf7f1">
<style>
svg{width:100%;display:block}
.cat-halo{fill:var(--cat-line);stroke:var(--cat-line);stroke-width:7;stroke-linejoin:round}
.cat-fill{fill:var(--cat-fill)}
.cat-line{fill:none;stroke:var(--cat-line);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.cat-whisker{fill:none;stroke:var(--cat-line);stroke-width:1.6;stroke-linecap:round}
.cat-dot{fill:var(--cat-line)}
.a{--cat-line:#8a9099;--cat-fill:#eceef1}.b{--cat-line:#1f5fd0;--cat-fill:#dbe8fb}
.row{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
</style>
<svg width=0 height=0 style="position:absolute"><defs>${defs}</defs></svg>
${['a','b'].map(c=>`<div class="row ${c}">${frames.map(fr=>`<svg viewBox="0 0 400 400">${fr.replace(/<g class="cat-frame"/,'<g')}</svg>`).join('')}</div>`).join('')}`;
writeFileSync(out.replace('.png','.html'), html);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1600, height: 820 } });
await p.goto('file://' + out.replace('.png','.html'));
await p.screenshot({ path: out });
await b.close();
