// node tools/sheet.mjs <dir> <glob-prefix> <out.png> [cols]
import { chromium } from 'playwright-core';
import { readdirSync, writeFileSync } from 'node:fs';
const [dir, prefix, out, cols = '2'] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.startsWith(prefix)).sort();
const w = Math.floor(1600 / Number(cols));
const html = `<body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px">${files.map((f) => `<figure style="margin:0;position:relative"><img src="file://${dir}/${f}" style="width:${w}px;display:block"><figcaption style="position:absolute;top:4px;left:4px;background:#000c;color:#fff;font:12px monospace;padding:2px 6px">${f}</figcaption></figure>`).join('')}</body>`;
writeFileSync(`${dir}/_sheet.html`, html);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto(`file://${dir}/_sheet.html`); await p.waitForTimeout(500);
await p.screenshot({ path: out, fullPage: true }); await b.close();
