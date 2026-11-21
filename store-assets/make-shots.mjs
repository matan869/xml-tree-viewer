// Store screenshots for v2 (1280x800): the real viewer under a headline band.
//   node store-assets/make-shots.mjs      -> store-assets/v2/shot-{1..5}-*.png
// Everything shown is generated sample data (example.com, fictional names).
import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'store-assets/v2');
fs.mkdirSync(OUT, { recursive: true });

const ORDER = `{
  "order": {
    "id": 9007199254740993123,
    "status": "shipped",
    "created_at": "2026-11-18T09:42:11Z",
    "customer": { "name": "Alex Morgan", "email": "alex@example.com", "vip": true, "orders_count": 14 },
    "total": { "amount": "184.90", "currency": "EUR", "tax": 29.52 },
    "items": [
      { "sku": "TSHIRT-BLK-M", "qty": 2, "price": 29.95, "url": "https://shop.example.com/p/tshirt-black" },
      { "sku": "HOODIE-GRY-L", "qty": 1, "price": 79.00, "url": "https://shop.example.com/p/hoodie-grey" },
      { "sku": "CAP-NVY", "qty": 1, "price": 46.00, "url": "https://shop.example.com/p/cap-navy" }
    ],
    "shipping": { "carrier": "DHL", "tracking": "JD014600003828591234", "eta": null, "address": { "city": "Lisbon", "country": "PT" } },
    "discount": null,
    "gift": false
  },
  "links": {
    "self": "https://api.example.com/v2/orders/9007199254740993123",
    "invoice": "https://api.example.com/v2/orders/9007199254740993123/invoice.pdf"
  }
}`;

const first = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan', 'Jamie', 'Avery', 'Quinn', 'Rowan', 'Elliot'];
const last = ['Smith', 'Garcia', 'Chen', 'Novak', 'Silva', 'Kowalski', 'Haddad', 'Okafor', 'Rossi', 'Muller', 'Dubois', 'Tanaka'];
const plans = ['starter', 'pro', 'team', 'enterprise'];
const countries = ['US', 'DE', 'FR', 'BR', 'JP', 'GB', 'ES', 'IT', 'NL', 'CA'];
const users = [];
for (let k = 0; k < 48; k++) {
  const f = first[k % 12], l = last[(k * 5) % 12];
  users.push({ id: 10400 + k, name: f + ' ' + l, email: (f + '.' + l).toLowerCase() + '@example.com', plan: plans[(k * 7) % 4],
    mrr: [19, 49, 99, 499][(k * 7) % 4] * (1 + (k % 3)), country: countries[(k * 3) % 10], active: k % 5 !== 0,
    signed_up: '2026-' + String(1 + (k % 11)).padStart(2, '0') + '-' + String(1 + ((k * 7) % 28)).padStart(2, '0'),
    usage: { seats: 1 + (k % 9), api_calls: 1000 * ((k * 13) % 97) } });
}
const USERS = JSON.stringify({ data: users, page: 1, per_page: 48, total: 1294 });

const BROKEN = `{
  "service": "billing-api",
  "version": "2.4.1",
  "environment": "production",
  "regions": ["eu-west-1", "us-east-1", "ap-southeast-2"],
  "http": {
    "port": 8443,
    "timeout_ms": 15000,
    "cors": { "origins": ["https://app.example.com", "https://admin.example.com"], "credentials": true }
  },
  "database": {
    "host": "db.internal.example.com",
    "pool": { "min": 4, "max": 32 },
    "ssl": true
  },
  "retry": { "max": 5, "backoff_ms": 250, "jitter": 0.2 }
  "features": {
    "invoices": true,
    "refunds": true,
    "multi_currency": ["EUR", "USD", "GBP", "JPY"],
    "tax_engine": "v3"
  },
  "webhooks": [
    { "event": "invoice.paid", "url": "https://hooks.example.com/paid", "secret_env": "HOOK_SECRET_PAID" },
    { "event": "invoice.overdue", "url": "https://hooks.example.com/overdue", "secret_env": "HOOK_SECRET_OVERDUE" }
  ],
  "logging": { "level": "info", "format": "json", "sample_rate": 0.25 },
  "maintenance_window": { "day": "sunday", "start": "02:00", "duration_min": 45 }
}`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

async function shot(file, headline, sub, theme, build) {
  await p.goto('about:blank');
  await p.setContent('<!doctype html><html><head><meta charset=utf-8></head><body style="margin:0"></body></html>');
  for (const f of ['src/xml.js', 'src/features.js', 'src/docs.js', 'src/tree.js', 'src/json.js', 'src/jsontree.js']) {
    await p.addScriptTag({ path: path.join(ROOT, f) });
  }
  await build(theme);
  await p.evaluate(([h, s, dark]) => {
    const st = document.createElement('style');
    st.textContent = `.xv-root{top:96px !important}
      .band{position:fixed;left:0;right:0;top:0;height:96px;display:flex;align-items:center;justify-content:space-between;
        padding:0 34px;box-sizing:border-box;background:linear-gradient(100deg,#1e3a8a,#4338ca);font-family:Inter,system-ui,sans-serif;z-index:2147483647}
      .band h1{margin:0;color:#fff;font-size:29px;font-weight:800;letter-spacing:-.01em}
      .band p{margin:5px 0 0;color:#c7d2fe;font-size:16px}
      .band .pill{color:#fff;font-size:14px;font-weight:600;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:8px 16px;
        background:rgba(255,255,255,.08);white-space:nowrap}`;
    document.head.appendChild(st);
    const band = document.createElement('div');
    band.className = 'band';
    const left = document.createElement('div');
    const h1 = document.createElement('h1'); h1.textContent = h;
    const pp = document.createElement('p'); pp.textContent = s;
    left.append(h1, pp);
    const pill = document.createElement('div'); pill.className = 'pill'; pill.textContent = 'No ads · No tracking · Nothing leaves your browser';
    band.append(left, pill);
    document.body.appendChild(band);
  }, [headline, sub, theme === 'dark']);
  await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(OUT, file) });
  console.log('wrote', file);
}

await shot('shot-1-json-tree.png', 'Any JSON response, readable at once',
  'Collapsible tree, exact numbers, clickable links, and the path of any value', 'light', async (theme) => {
    await p.evaluate(([t, th]) => { XMLV.buildJsonViewer(document, document.body, t, { theme: th, filename: 'order' }); }, [ORDER, theme]);
    await p.locator('.xv-line', { hasText: '"tracking"' }).first().click();
  });

await shot('shot-2-json-table.png', 'Lists of records become a sortable table',
  'Nested fields flattened into columns — one click to CSV', 'dark', async (theme) => {
    await p.evaluate(([t, th]) => { XMLV.buildJsonViewer(document, document.body, t, { theme: th, filename: 'users' }); }, [USERS, theme]);
    await p.click('.xv-btn:has-text("Table")');
    await p.click('.xv-grid th:has-text("mrr")');
    await p.click('.xv-grid th:has-text("mrr")');
  });

await shot('shot-3-json-error.png', 'Broken JSON? See exactly where',
  'The line and column, and what went wrong — in plain words', 'light', async (theme) => {
    await p.evaluate(([t, th]) => { XMLV.buildJsonViewer(document, document.body, t, { theme: th, filename: 'config' }); }, [BROKEN, theme]);
  });

const sample = fs.readFileSync(path.join(ROOT, 'tests/fixtures/sample.xml'), 'utf8');
await shot('shot-4-xml-tree.png', 'XML too: tree, XPath, table and structure',
  'Feeds, sitemaps, SOAP and config files — from a URL or from disk', 'dark', async (theme) => {
    await p.evaluate(([t, th]) => { XMLV.buildViewer(document, document.body, t, { theme: th, filename: 'catalog' }); }, [sample, theme]);
    await p.fill('.xv-search', 'SKU-1003');
    await p.press('.xv-search', 'Enter');
  });

const ubl = fs.readFileSync(path.join(ROOT, 'tests/fixtures/ubl-invoice.xml'), 'utf8');
await shot('shot-5-e-invoice.png', 'E-invoices and bank statements, as documents',
  'UBL, XRechnung, FatturaPA and camt.053 files read like a PDF — print or save', 'light', async (theme) => {
    await p.evaluate(([t, th]) => { XMLV.buildViewer(document, document.body, t, { theme: th, filename: 'invoice' }); }, [ubl, theme]);
    await p.waitForTimeout(150);
  });

await b.close();
