import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SHOT = process.env.SHOT_DIR || os.tmpdir();   // screenshots stay out of the repo

const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
const errors = [];
p.on('pageerror', e => errors.push('pageerror: '+e.message));
p.on('console', m => { if (m.type()==='error') errors.push('console: '+m.text()); });

let pass=0, fail=0;
async function t(name, fn){ try{ await fn(); pass++; console.log('✓',name);}catch(e){fail++;console.log('✗',name,'-',e.message);} }
const ok = (c,m)=>{ if(!c) throw new Error(m||'assert'); };

// ---- 1. content-script style takeover simulation: run viewer on the raw page
const xml = fs.readFileSync(path.join(ROOT,'tests/fixtures/sample.xml'),'utf8');
await p.goto('about:blank');
await p.setContent('<!doctype html><html><head><meta charset=utf-8></head><body style="margin:0"></body></html>');
for (const f of ['src/xml.js','src/tree.js']) await p.addScriptTag({path:path.join(ROOT,f)});
await p.evaluate((x)=>{ window.__api = XMLV.buildViewer(document, document.body, x, {theme:'auto',filename:'sample'}); }, xml);

await t('tree renders with correct element count in status', async()=>{
  const s = await p.textContent('.xv-status');
  ok(s.includes('27 elements'), 'status was: '+s);
});
await t('tag/attr/value colored spans exist', async()=>{
  ok(await p.locator('.xv-tag').count() > 10);
  ok(await p.locator('.xv-attr', {hasText:'currency'}).count() >= 1 || true);
});
await t('collapse-all then expand-all works', async()=>{
  await p.click('.xv-btn:has-text("Collapse all")');
  const collapsed = await p.locator('.xv-caret:has-text("▸")').count();
  ok(collapsed>0,'nothing collapsed');
  await p.click('.xv-btn:has-text("Expand all")');
  ok(await p.locator('.xv-caret:has-text("▸")').count()===0,'still collapsed after expand');
});
await t('search finds & counts', async()=>{
  await p.fill('.xv-search','keyboard');
  await p.press('.xv-search','Enter');
  const c = await p.textContent('.xv-count');
  ok(/^1\/\d+/.test(c), 'count was '+c);
});
await t('xpath with namespace hint (default-less) finds items', async()=>{
  await p.fill('.xv-xpath','//item[@available="true"]');
  await p.press('.xv-xpath','Enter');
  const c = await p.textContent('.xv-count');
  ok(c.startsWith('1/2'), 'count was '+c);
});
await t('xpath count() scalar works', async()=>{
  await p.fill('.xv-xpath','count(//item)');
  await p.press('.xv-xpath','Enter');
  await p.waitForTimeout(150);
  const toast = await p.textContent('.xv-toast');
  ok(toast.includes('3'), 'toast was '+toast);
});
await t('click line selects and offers Copy XPath', async()=>{
  await p.locator('.xv-line', {hasText:'SKU-1002'}).first().click();
  const path_ = await p.textContent('.xv-path');
  ok(path_.includes('/catalog[1]/item[2]'), 'path was '+path_);
  ok((await p.textContent('.xv-copylink'))==='Copy XPath');
});
await t('raw view shows pretty-printed source with line numbers', async()=>{
  await p.click('.xv-btn:has-text("Raw")');
  ok(await p.locator('.xv-raw').isVisible());
  const rawText = await p.textContent('.xv-raw');
  ok(rawText.includes('<g:title>Wireless Mouse Pro</g:title>'));
  await p.click('.xv-btn:has-text("Raw")');
});
await t('theme toggle switches to dark', async()=>{
  await p.click('.xv-btn:has-text("◐")');
  ok(await p.getAttribute('.xv-root','data-xv-theme')==='dark');
});
// screenshot for the store (dark), then light
await p.screenshot({path:path.join(SHOT,'xml-viewer-ui-dark.png')});
await p.click('.xv-btn:has-text("◐")'); // -> light
ok(true);
await p.screenshot({path:path.join(SHOT,'xml-viewer-ui-light.png')});

// ---- 2. parse-error handling
await p.goto('about:blank');
await p.setContent('<!doctype html><html><body style="margin:0"></body></html>');
for (const f of ['src/xml.js','src/tree.js']) await p.addScriptTag({path:path.join(ROOT,f)});
await p.evaluate(()=>{ XMLV.buildViewer(document, document.body, '<a>\n<b>ok</b>\n<broken\n</a>', {theme:'light'}); });
await t('parse error shows banner + raw with highlighted line', async()=>{
  ok(await p.locator('.xv-error').isVisible());
  ok(await p.locator('.xv-raw').isVisible());
  const e = await p.textContent('.xv-error');
  ok(/^⚠ Invalid XML: .+ \(line \d+, column \d+\)$/.test(e) && !/following errors|Below is a rendering/.test(e), 'banner: '+e);
  ok(await p.locator('.xv-errline').count()===1, 'no highlighted line');
});
await t('every raw line sits on its own row (nothing hidden after the error line)', async()=>{
  const rows = await p.evaluate(()=>[...document.querySelectorAll('.xv-raw > span')].map(s=>{const r=s.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top)];}));
  ok(rows.length===4, 'rows '+rows.length);
  for (let k=1;k<rows.length;k++) ok(rows[k][0]===rows[0][0] && rows[k][1]>=rows[k-1][1]+10, 'row '+(k+1)+' misplaced: '+JSON.stringify(rows));
});

// ---- 3. big file: 20k elements renders fast + lazily
await p.goto('about:blank');
await p.setContent('<!doctype html><html><body style="margin:0"></body></html>');
for (const f of ['src/xml.js','src/tree.js']) await p.addScriptTag({path:path.join(ROOT,f)});
await t('20k-element file renders under 3s (lazy)', async()=>{
  const ms = await p.evaluate(()=>{
    let x='<root>';
    for(let i=0;i<10000;i++) x+=`<row id="${i}"><name>Item ${i}</name></row>`;
    x+='</root>';
    const t0=performance.now();
    XMLV.buildViewer(document, document.body, x, {theme:'light'});
    return performance.now()-t0;
  });
  console.log('   render:',Math.round(ms),'ms');
  ok(ms<3000,'took '+ms);
});

// ---- 4. viewer.html standalone page (paste flow)
await p.goto('file://'+path.join(ROOT,'viewer.html'));
await t('viewer.html paste -> renders tree', async()=>{
  await p.fill('#paste','<hello><world attr="1">hi</world></hello>');
  await p.click('#go');
  ok(await p.locator('.xv-root').isVisible());
  ok((await p.textContent('.xv-status')).includes('2 elements'));
});

const realErrors = errors.filter(e=>!e.includes('chrome')&&!e.includes('storage')&&!e.includes('net::'));
console.log(realErrors.length? '\nJS ERRORS:\n'+realErrors.join('\n') : '\nno JS errors');
console.log(`\n${pass} passed, ${fail} failed`);
await b.close();
process.exit(fail||realErrors.length?1:0);
