import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const icon = 'data:image/png;base64,' + fs.readFileSync('./icons/icon128.png').toString('base64');
const html = `<!doctype html><meta charset=utf-8><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:440px;height:280px;background:#0d1524;display:flex;align-items:center;gap:22px;padding:0 26px;
font-family:'Roboto','Helvetica Neue',Arial,sans-serif;overflow:hidden}
img{width:112px;height:112px;border-radius:22px;flex:0 0 auto}
h1{color:#fff;font-size:40px;font-weight:700;letter-spacing:-.5px;line-height:1.05}
p{color:#93a4bd;font-size:16px;font-weight:500;margin-top:10px;line-height:1.35}
</style><body><img src="${icon}"><div><h1>XML Viewer<br>&amp; Formatter</h1><p>Tree · Table · JSON<br>E-Invoice · camt.053</p></div>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
await p.setContent(html); await p.waitForTimeout(400);
await p.screenshot({ path: './store-assets/promo-440x280.png' });
await b.close();
