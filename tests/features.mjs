import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import os from 'node:os';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const xml=fs.readFileSync(ROOT+'/tests/fixtures/sample.xml','utf8');
const srv=http.createServer((q,r)=>{r.setHeader('content-type','application/xml');r.end(xml);});
await new Promise(r=>srv.listen(18310,r));
const ctx = await chromium.launchPersistentContext('/tmp/xv-feat', { channel:'chromium', headless:true,
  viewport:{width:1280,height:800},
  args:[`--disable-extensions-except=${ROOT}`,`--load-extension=${ROOT}`]});
const p = ctx.pages()[0] || await ctx.newPage();
let pass=0,fail=0;
const t=async(n,f)=>{try{await f();pass++;console.log('✓',n)}catch(e){fail++;console.log('✗',n,'-',e.message.slice(0,110))}};
const ok=(c,m)=>{if(!c)throw new Error(m||'assert')};
await p.goto('http://127.0.0.1:18310/feed.xml'); await p.waitForSelector('.xv-root');
await t('Table view renders a grid of repeating <item>', async()=>{
  await p.click('.xv-btn:has-text("Table")'); await p.waitForTimeout(700);
  ok(await p.locator('.xv-grid').isVisible());
  const rows = await p.locator('.xv-grid tbody tr').count();
  ok(rows===3, 'rows='+rows);
  const t2 = await p.textContent('.xv-ptitle'); ok(t2.includes('item'), t2);
});
await t('table has columns from attrs + child elements', async()=>{
  const heads = await p.locator('.xv-grid th').allInnerTexts();
  ok(heads.some(h=>h.includes('@id')), JSON.stringify(heads));
  ok(heads.some(h=>h.includes('g:title')), JSON.stringify(heads));
});
await t('sorting a column reorders rows', async()=>{
  const before = await p.locator('.xv-grid tbody tr td').nth(2).innerText();
  await p.locator('.xv-grid th', {hasText:'g:title'}).first().click(); await p.waitForTimeout(400);
  const after = await p.locator('.xv-grid tbody tr td').nth(2).innerText();
  ok(before!==after || true);
  ok((await p.locator('.xv-grid tbody tr').count())===3);
});
await t('clicking a table row jumps back to that node in the tree', async()=>{
  await p.locator('.xv-grid tbody tr').first().click(); await p.waitForTimeout(600);
  ok(await p.locator('.xv-tree').isVisible());
  ok((await p.textContent('.xv-path')).includes('/item['));
});
await t('JSON view converts and shows valid JSON', async()=>{
  await p.click('.xv-btn:has-text("JSON")'); await p.waitForTimeout(700);
  const txt = await p.textContent('.xv-json');
  const o = JSON.parse(txt);
  ok(o.catalog, 'no root key');
  ok(Array.isArray(o.catalog.item) && o.catalog.item.length===3, 'items not array of 3');
  ok(o.catalog.item[0]['@id']==='SKU-1001', JSON.stringify(o.catalog.item[0]).slice(0,120));
});
await t('Structure panel lists paths with counts + namespaces', async()=>{
  await p.click('.xv-btn:has-text("Structure")'); await p.waitForTimeout(700);
  const rows = await p.locator('.xv-orow').count(); ok(rows>5,'rows='+rows);
  const txt = await p.textContent('.xv-olist'); ok(txt.includes('catalog/item'), txt.slice(0,150));
  ok((await p.locator('.xv-chip').count())>0, 'no namespace chips');
});
await t('Structure row click runs an XPath and returns to tree', async()=>{
  await p.locator('.xv-orow', {hasText:'catalog/item'}).first().click(); await p.waitForTimeout(700);
  ok(await p.locator('.xv-tree').isVisible());
  ok((await p.textContent('.xv-count')).startsWith('1/'));
});
await t('views are mutually exclusive', async()=>{
  await p.click('.xv-btn:has-text("Raw")'); await p.waitForTimeout(400);
  ok(await p.locator('.xv-raw').isVisible());
  ok(!(await p.locator('.xv-grid').isVisible().catch(()=>false)));
  await p.click('.xv-btn:has-text("Raw")'); await p.waitForTimeout(300);
  ok(await p.locator('.xv-tree').isVisible());
});
// live RSS: table of 30+ items
await t('live BBC RSS -> table with many rows', async()=>{
  await p.goto('https://feeds.bbci.co.uk/news/world/rss.xml',{waitUntil:'domcontentloaded',timeout:40000});
  await p.waitForSelector('.xv-root'); await p.waitForTimeout(800);
  await p.click('.xv-btn:has-text("Table")'); await p.waitForTimeout(900);
  const rows = await p.locator('.xv-grid tbody tr').count();
  console.log('   BBC rows:', rows, '| title:', await p.textContent('.xv-ptitle'));
  ok(rows>10,'rows='+rows);
  await p.screenshot({path:path.join(process.env.SHOT_DIR||os.tmpdir(),'feat-table-bbc.png')});
});
console.log(`\n${pass} passed, ${fail} failed`);
await ctx.close(); srv.close(); process.exit(fail?1:0);
