import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import os from 'node:os';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const F=(n)=>fs.readFileSync(ROOT+'/tests/fixtures/'+n,'utf8');
const srv=http.createServer((q,r)=>{
  const n=q.url.slice(1).split('?')[0];
  try{ r.setHeader('content-type','application/xml'); r.end(F(n)); }catch(e){ r.statusCode=404; r.end('nf'); }
});
await new Promise(r=>srv.listen(18320,r));
const ctx = await chromium.launchPersistentContext('/tmp/xv-docs', { channel:'chromium', headless:true,
  viewport:{width:1280,height:900},
  args:[`--disable-extensions-except=${ROOT}`,`--load-extension=${ROOT}`]});
const p = ctx.pages()[0] || await ctx.newPage();
let pass=0,fail=0;
const t=async(n,f)=>{try{await f();pass++;console.log('✓',n)}catch(e){fail++;console.log('✗',n,'-',e.message.slice(0,140))}};
const ok=(c,m)=>{if(!c)throw new Error(m||'assert')};
const SHOT=process.env.SHOT_DIR||os.tmpdir();

await t('UBL invoice auto-opens as a readable invoice', async()=>{
  await p.goto('http://127.0.0.1:18320/ubl-invoice.xml');
  await p.waitForSelector('.xv-doc',{timeout:8000});
  const txt = await p.innerText('.xv-doc');
  ok(txt.includes('INV-2026-0042'), 'no invoice number');
  ok(txt.includes('Nordwind Logistik GmbH'), 'no supplier');
  ok(txt.includes('Beaulieu Retail SA'), 'no customer');
  ok(txt.includes('Pallet transport'), 'no line item');
  ok(/€2,499\.00|2.499,00|2,499\.00/.test(txt), 'no payable total: '+txt.slice(-260));
  ok(txt.includes('DE89370400440532013000'), 'no IBAN');
  // totals column must actually render its amounts inside the visible card
  const tot = await p.locator('.xv-sums').boundingBox();
  ok(tot && tot.width < 420, 'totals block not narrow: '+JSON.stringify(tot));
  const lineTbl = await p.locator('.xv-tbl').first().boundingBox();
  ok(lineTbl && lineTbl.x + lineTbl.width <= 1105, 'line grid overflows: '+JSON.stringify(lineTbl));
  ok(/Line total/i.test(txt), 'Line total column missing');
  ok(/€1,500\.00|1.500,00/.test(txt), 'line total value missing');
  ok(/Amount due/i.test(txt), 'Amount due row missing');
  ok((await p.innerText('.xv-doc-fmt')).includes('UBL'), 'format label');
  await p.screenshot({path:`${SHOT}/doc1-ubl-invoice.png`});
});
await t('Print button appears only on the document view', async()=>{
  ok(await p.locator('.xv-btn:has-text("Print / PDF")').isVisible());
  await p.click('.xv-btn:has-text("Document")');      // toggle back to tree
  await p.waitForTimeout(400);
  ok(!(await p.locator('.xv-btn:has-text("Print / PDF")').isVisible()));
  await p.click('.xv-btn:has-text("Document")');
  await p.waitForTimeout(400);
});
await t('XRechnung / CII invoice parsed', async()=>{
  await p.goto('http://127.0.0.1:18320/xrechnung.xml');
  await p.waitForSelector('.xv-doc',{timeout:8000});
  const txt = await p.innerText('.xv-doc');
  ok(txt.includes('RE-2026-771'), 'no number');
  ok(txt.includes('Consultix GmbH'), 'no seller');
  ok(txt.includes('Stadtwerke Musterstadt'), 'no buyer');
  ok(txt.includes('Beratungsleistung'), 'no line');
  ok(/1,142\.40|1.142,40/.test(txt), 'no total: '+txt.slice(-200));
  ok(txt.includes('DE02120300000000202051'), 'no IBAN');
  await p.screenshot({path:`${SHOT}/doc2-xrechnung.png`});
});
await t('camt.053 renders as a bank statement with balances', async()=>{
  await p.goto('http://127.0.0.1:18320/camt053.xml');
  await p.waitForSelector('.xv-doc',{timeout:8000});
  const txt = await p.innerText('.xv-doc');
  ok(txt.includes('NL91ABNA0417164300'), 'no IBAN');
  ok(/opening balance/i.test(txt), 'no opening bal');   // CSS uppercases the label
  ok(/closing balance/i.test(txt), 'no closing bal');
  ok(/15,230\.44|15.230,44/.test(txt), 'no opening amount');
  ok(/18,904\.19|18.904,19/.test(txt), 'no closing amount');
  ok(txt.includes('Beaulieu Retail SA'), 'no counterparty');
  ok(txt.includes('Invoice INV-2026-0031'), 'no remittance');
  const cells = await p.locator('.xv-tbl > div').count();
  ok(cells === 6 * 4, 'grid cells='+cells);   // 6 columns x (1 header + 3 entries)
  await p.screenshot({path:`${SHOT}/doc3-camt053-statement.png`});
});
await t('statement money in/out computed', async()=>{
  const txt = await p.innerText('.xv-meta');
  ok(/4,820\.00|4.820,00/.test(txt), 'money in wrong: '+txt);
  ok(/2,146\.25|2.146,25/.test(txt), 'money out wrong: '+txt);
});
await t('debits are signed and colour-coded', async()=>{
  const dr = await p.locator('.xv-dr').count();
  ok(dr>=2, 'dr cells='+dr);
  const txt = await p.innerText('.xv-tbl');
  ok(txt.includes('-'), 'no negative sign');
});
await t('statement CSV button present', async()=>{
  ok(await p.locator('.xv-btn:has-text("Download statement CSV")').isVisible());
});
await t('plain XML still opens as a tree, not a document', async()=>{
  await p.goto('http://127.0.0.1:18320/sample.xml');
  await p.waitForSelector('.xv-root');
  await p.waitForTimeout(600);
  ok(await p.locator('.xv-tree').isVisible(), 'tree hidden');
  ok(!(await p.locator('.xv-btn:has-text("Document")').isVisible()), 'Document button leaked');
});
console.log(`\n${pass} passed, ${fail} failed`);
await ctx.close(); srv.close(); process.exit(fail?1:0);
