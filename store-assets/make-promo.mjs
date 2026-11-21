// Store promo images:
//   store-assets/promo-440x280.png      small promo tile
//   store-assets/v2/marquee-1400x560.png marquee tile (used when the store features the item)
//   node store-assets/make-promo.mjs
import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// the extension icon without its store padding (same drawing as make-icons.mjs)
const tile = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs>
  <rect width="96" height="96" rx="21" fill="url(#g)"/>
  <text x="48" y="48" dy="0.36em" text-anchor="middle" fill="#fff" letter-spacing="5"
    font-family="DejaVu Sans Mono, monospace" font-weight="bold" font-size="58">{}</text></svg>`;

const FONT = "font-family:Inter,'Helvetica Neue',Arial,sans-serif";
const small = `<!doctype html><meta charset=utf-8><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:440px;height:280px;background:radial-gradient(120% 140% at 0% 0%,#1e2a4a 0%,#0b1220 60%);display:flex;align-items:center;gap:24px;padding:0 28px;${FONT};overflow:hidden}
svg{flex:0 0 auto;filter:drop-shadow(0 6px 18px rgba(59,130,246,.35))}
h1{color:#fff;font-size:40px;font-weight:800;letter-spacing:-.02em;line-height:1.04}
p{color:#a5b4fc;font-size:16px;font-weight:600;margin-top:12px;line-height:1.4}
</style><body>${tile(108)}<div><h1>JSON &amp; XML<br>Viewer</h1><p>Tree, table and raw views<br>No ads · No tracking</p></div>`;

// The marquee shows the real viewer: rendered at 3/4 scale from a 1240x620 window
// (narrower and its toolbar wraps).
const ORDER = `{
  "order": {
    "id": 9007199254740993123,
    "status": "shipped",
    "created_at": "2026-11-18T09:42:11Z",
    "customer": { "name": "Alex Morgan", "email": "alex@example.com", "vip": true, "orders_count": 14 },
    "total": { "amount": "184.90", "currency": "EUR", "tax": 29.52 },
    "items": [
      { "sku": "TSHIRT-BLK-M", "qty": 2, "price": 29.95, "url": "https://shop.example.com/p/tshirt-black" },
      { "sku": "HOODIE-GRY-L", "qty": 1, "price": 79.00, "url": "https://shop.example.com/p/hoodie-grey" }
    ],
    "shipping": { "carrier": "DHL", "tracking": "JD014600003828591234", "eta": null },
    "gift": false
  }
}`;
async function viewerShot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 620 }, deviceScaleFactor: 0.75 });
  const v = await ctx.newPage();
  await v.setContent('<!doctype html><html><head><meta charset=utf-8></head><body style="margin:0"></body></html>');
  for (const f of ['src/xml.js', 'src/features.js', 'src/tree.js', 'src/json.js', 'src/jsontree.js']) await v.addScriptTag({ path: path.join(ROOT, f) });
  await v.evaluate((t) => { XMLV.buildJsonViewer(document, document.body, t, { theme: 'light', filename: 'order' }); }, ORDER);
  await v.locator('.xv-line', { hasText: '"status"' }).first().click();
  await v.waitForTimeout(200);
  const png = await v.screenshot();
  await ctx.close();
  return 'data:image/png;base64,' + png.toString('base64');
}

const marquee = (shot) => `<!doctype html><meta charset=utf-8><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1400px;height:560px;background:radial-gradient(90% 130% at 0% 0%,#1e2a4a 0%,#0b1220 62%);${FONT};overflow:hidden;position:relative}
.l{position:absolute;left:72px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center}
.brand{display:flex;align-items:center;gap:22px}
h1{color:#fff;font-size:56px;font-weight:800;letter-spacing:-.025em;line-height:1.02}
.tag{color:#c7d2fe;font-size:24px;font-weight:500;line-height:1.4;margin-top:30px}
.pill{display:inline-block;margin-top:30px;color:#fff;font-size:17px;font-weight:600;border:1px solid rgba(255,255,255,.3);
  border-radius:999px;padding:10px 20px;background:rgba(255,255,255,.07);align-self:flex-start}
.shot{position:absolute;left:650px;top:48px;width:930px;height:465px;border-radius:14px 0 0 14px;overflow:hidden;
  box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08)}
.shot img{display:block;width:930px;height:465px}
</style><body><div class="l"><div class="brand">${tile(92)}<h1>JSON &amp; XML<br>Viewer</h1></div>
<div class="tag">Any JSON or XML page becomes a clean, searchable tree, a sortable table or raw text.</div>
<div class="pill">No ads · No tracking · Nothing leaves your browser</div></div><div class="shot"><img src="${shot}"></div>`;

const b = await chromium.launch();
const shot = await viewerShot(b);
const p = await b.newPage({ deviceScaleFactor: 1 });
for (const [html, w, h, out] of [[small, 440, 280, 'store-assets/promo-440x280.png'], [marquee(shot), 1400, 560, 'store-assets/v2/marquee-1400x560.png']]) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(html);
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(ROOT, out) });
  console.log('wrote', out);
}
await b.close();
