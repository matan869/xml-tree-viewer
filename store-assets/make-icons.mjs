// Draws the extension icons (icons/icon{16,32,48,128}.png): a blue tile with "{}".
// The 128 px store icon keeps 16 px of transparent padding (Chrome Web Store guideline:
// 96 px artwork inside 128); the toolbar sizes use the whole square so they stay legible.
//   node store-assets/make-icons.mjs
import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function svg(size, pad) {
  const s = size - pad * 2, r = Math.round(s * 0.22);
  const fs = Math.round(s * (size <= 16 ? 0.8 : size <= 32 ? 0.7 : size <= 48 ? 0.66 : 0.6));
  const ls = size <= 32 ? 0 : Math.round(fs * 0.08);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs>
  <rect x="${pad}" y="${pad}" width="${s}" height="${s}" rx="${r}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle" fill="#fff" letter-spacing="${ls}"
    font-family="DejaVu Sans Mono, monospace" font-weight="bold" font-size="${fs}">{}</text>
</svg>`;
}

const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 1 });
for (const [size, pad] of [[128, 16], [48, 2], [32, 1], [16, 0]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}</style>${svg(size, pad)}`);
  await p.screenshot({ path: path.join(ROOT, `icons/icon${size}.png`), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
await b.close();
console.log('icons written');
