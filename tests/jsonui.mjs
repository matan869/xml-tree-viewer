// JSON viewer interaction tests (Playwright, no extension): node tests/jsonui.mjs
import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// a blank page on http://127.0.0.1 (a secure context, so the clipboard works)
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><html><head><meta charset=utf-8></head><body></body></html>'); });
await new Promise((r) => srv.listen(18341, r));

const items = [];
for (let k = 0; k < 1500; k++) items.push(`{"id":${10n ** 18n + BigInt(k)},"name":"item-${k}","price":${(k * 37) % 1000}.5,"active":${k % 2 === 0},"tags":["a","b"],"url":"https://example.com/p/${k}","nested":{"a":{"b":${k}}}}`);
const BIG = `{"meta":{"page":1,"long":"${'x'.repeat(900)}","empty":{},"none":[]},"items":[${items.join(',')}]}`;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:18341' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

let pass = 0, fail = 0;
async function t(name, fn) { try { await fn(); pass++; console.log('✓', name); } catch (e) { fail++; console.log('✗', name, '-', e.message); } }
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const clipboard = () => p.evaluate(() => navigator.clipboard.readText());

async function load(text, o) {
  await p.goto('http://127.0.0.1:18341/');
  for (const f of ['src/xml.js', 'src/features.js', 'src/tree.js', 'src/json.js', 'src/jsontree.js']) await p.addScriptTag({ path: path.join(ROOT, f) });
  await p.evaluate(([x, opts]) => { window.__api = XMLV.buildJsonViewer(document, document.body, x, opts); }, [text, o || { theme: 'light', filename: 'big' }]);
}

await load(BIG);
await t('renders with a value count in the status bar', async () => {
  const s = await p.textContent('.xv-status');
  ok(/1[0-9],[0-9]{3} values/.test(s), 'status was: ' + s);
});
await t('a 19-digit id is shown and found exactly', async () => {
  await p.fill('.xv-search', '1000000000000000005');
  await p.press('.xv-search', 'Enter');
  ok((await p.textContent('.xv-count')) === '1/1', 'count ' + await p.textContent('.xv-count'));
  ok((await p.textContent('.xv-selected')).includes('"id": 1000000000000000005'), await p.textContent('.xv-selected'));
});
await t('big lists render in chunks of 500 with a "show more"', async () => {
  ok((await p.locator('.xv-more:has-text("show 500 more (1,000 left)")').count()) === 1);
});
await t('search finds an item beyond the first chunk and reveals it', async () => {
  await p.fill('.xv-search', 'item-1234');
  await p.press('.xv-search', 'Enter');
  ok((await p.textContent('.xv-count')) === '1/1', 'count ' + await p.textContent('.xv-count'));
  ok((await p.textContent('.xv-path')) === '$.items[1234].name', 'path ' + await p.textContent('.xv-path'));
  ok(await p.locator('.xv-selected:has-text("item-1234")').isVisible(), 'hit not visible');
});
await t('Copy path and Copy value', async () => {
  await p.click('.xv-copylink:has-text("Copy path")');
  ok((await clipboard()) === '$.items[1234].name');
  await p.click('.xv-copylink:has-text("Copy value")');
  ok((await clipboard()) === 'item-1234');
});
await t('Enter steps through several matches', async () => {
  await p.fill('.xv-search', 'item-123');
  await p.press('.xv-search', 'Enter');
  ok((await p.textContent('.xv-count')).startsWith('1/11'), await p.textContent('.xv-count'));
  await p.press('.xv-search', 'Enter');
  ok((await p.textContent('.xv-count')).startsWith('2/11'));
  await p.press('.xv-search', 'Shift+Enter');
  ok((await p.textContent('.xv-count')).startsWith('1/11'));
});
await t('keys match too', async () => {
  await p.fill('.xv-search', 'nested');
  await p.press('.xv-search', 'Enter');
  ok((await p.textContent('.xv-count')).startsWith('1/1500'), await p.textContent('.xv-count'));
});
await t('URLs become safe links', async () => {
  const a = p.locator('.xv-js a').first();
  ok((await a.getAttribute('href')).startsWith('https://example.com/p/'));
  ok((await a.getAttribute('target')) === '_blank' && (await a.getAttribute('rel')).includes('noopener'));
});
await t('a long string is cut with "show all"', async () => {
  const more = p.locator('.xv-more:has-text("show all")').first();
  ok(await more.isVisible());
  await more.click();
  ok((await p.textContent('.xv-main')).includes('x'.repeat(900)));
});
await t('empty object and array print as {} and []', async () => {
  const txt = await p.textContent('.xv-main');
  ok(txt.includes('"empty": {},') && txt.includes('"none": []'), 'missing empty containers');
});
await t('collapse all leaves only the root open; expand all opens what is rendered', async () => {
  await p.click('.xv-btn:has-text("Collapse all")');
  ok((await p.locator('.xv-caret:has-text("▾")').count()) === 1, 'more than the root open');
  await p.click('.xv-btn:has-text("Expand all")');
  ok((await p.locator('.xv-caret:has-text("▸")').count()) === 0, 'something still collapsed');
});
await t('table view: the record list as columns, nested keys flattened', async () => {
  await p.click('.xv-btn:has-text("Table")');
  ok((await p.textContent('.xv-ptitle')).includes('$.items × 1,500'));
  const heads = await p.locator('.xv-grid thead th').allTextContents();
  ok(heads.join('|') === '#|id|name|price|active|tags|url|nested.a.b', heads.join('|'));
  ok((await p.locator('.xv-grid tbody tr').count()) === 1500);
});
await t('table sorts numerically and copies CSV', async () => {
  await p.click('.xv-grid th:has-text("price")');
  await p.click('.xv-grid th:has-text("price")');
  const top = await p.locator('.xv-grid tbody tr').first().locator('td').nth(3).textContent();
  ok(top === '999.5', 'top price ' + top);
  await p.click('.xv-btn:has-text("Copy CSV")');
  const csv = await clipboard();
  ok(csv.split(/\r?\n/)[0] === 'id,name,price,active,tags,url,nested.a.b', csv.slice(0, 80));
  ok(csv.split(/\r?\n/)[1].includes('999.5'));
});
await t('clicking a row jumps to that record in the tree', async () => {
  await p.locator('.xv-grid tbody tr').first().click();
  ok((await p.textContent('.xv-path')).startsWith('$.items['), await p.textContent('.xv-path'));
  ok(await p.locator('.xv-tree').isVisible());
});
await t('raw view: formatted text with line numbers', async () => {
  await p.click('.xv-btn:has-text("Raw")');
  ok(await p.locator('.xv-raw').isVisible());
  const first = await p.locator('.xv-raw > span').first().textContent();
  ok(first === '1{\n', JSON.stringify(first));
  await p.click('.xv-btn:has-text("Raw")');
  ok(await p.locator('.xv-tree').isVisible(), 'Raw did not toggle back');
});
await t('Copy and Copy minified', async () => {
  await p.click('.xv-btn:has-text("Copy minified")');
  ok((await clipboard()) === BIG, 'minified differs from the source');
  await p.click('.xv-btn >> text="Copy"');
  ok((await clipboard()).startsWith('{\n  "meta": {\n    "page": 1,'));
});
await t('theme button cycles to dark', async () => {
  await load('{"a":1}', { theme: 'auto', filename: 'x' });
  await p.click('.xv-btn:has-text("◐")');
  ok((await p.getAttribute('.xv-root', 'data-xv-theme')) === 'dark');
});
await t('"/" focuses search', async () => {
  await p.click('.xv-main');
  await p.keyboard.press('/');
  ok(await p.evaluate(() => document.activeElement.classList.contains('xv-search')));
});
await t('invalid JSON: message with line, highlighted line, tree controls hidden', async () => {
  await load('{\n  "a": 1\n  "b": 2\n}');
  const e = await p.textContent('.xv-error');
  ok(e.includes('Missing comma before "b" (line 3, column 3)'), e);
  ok((await p.locator('.xv-errline').count()) === 1);
  ok(!(await p.locator('.xv-btn:has-text("Table")').isVisible()));
});
await t('every raw line sits on its own row (nothing hidden after the error line)', async () => {
  const rows = await p.evaluate(() => [...document.querySelectorAll('.xv-raw > span')].map((s) => { const r = s.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }));
  ok(rows.length === 4, 'rows ' + rows.length);
  for (let k = 1; k < rows.length; k++) ok(rows[k][0] === rows[0][0] && rows[k][1] >= rows[k - 1][1] + 10, 'row ' + (k + 1) + ' misplaced: ' + JSON.stringify(rows));
});
await t('an anti-hijacking prefix is skipped and mentioned', async () => {
  await load(")]}'\n{\"a\":[1,2]}");
  ok((await p.textContent('.xv-note')).includes('anti-hijacking prefix'));
  ok((await p.textContent('.xv-status')).includes('4 values'));
});
await t('no page errors', async () => { ok(errors.length === 0, errors.join(' | ')); });

console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); srv.close();
process.exit(fail ? 1 : 0);
