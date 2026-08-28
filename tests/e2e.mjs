import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const xml = fs.readFileSync(path.join(ROOT,'tests/fixtures/sample.xml'),'utf8');

// tiny server: XML under various content types + a normal HTML page + JSON
const srv = http.createServer((req,res)=>{
  if (req.url==='/feed.xml') { res.setHeader('content-type','application/xml'); res.end(xml); }
  else if (req.url==='/textplain.xml') { res.setHeader('content-type','text/plain'); res.end(xml); }
  else if (req.url==='/page.html') { res.setHeader('content-type','text/html'); res.end('<!doctype html><title>normal</title><h1 id="h">Hello page</h1>'); }
  else if (req.url==='/data.json') { res.setHeader('content-type','application/json'); res.end('{"a":1}'); }
  else if (req.url==='/styled.xml') { res.setHeader('content-type','application/xml'); res.end('<?xml version="1.0"?><?xml-stylesheet type="text/xsl" href="/t.xsl"?><r><a>1</a></r>'); }
  else if (req.url==='/t.xsl') { res.setHeader('content-type','application/xml'); res.end('<?xml version="1.0"?><xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><html><body><p id="xslt-out">styled</p></body></html></xsl:template></xsl:stylesheet>'); }
  else { res.statusCode=404; res.end('nf'); }
});
await new Promise(r=>srv.listen(18234,r));

const ctx = await chromium.launchPersistentContext('/tmp/xv-prof-'+Date.now(), {
  channel: 'chromium',   // extensions need the chromium channel's new headless
  headless: true,
  args: [
    `--disable-extensions-except=${ROOT}`,
    `--load-extension=${ROOT}`,
  ],
});
const p = await ctx.newPage();
let pass=0, fail=0;
async function t(name, fn){ try{ await fn(); pass++; console.log('✓',name);}catch(e){fail++;console.log('✗',name,'-',e.message);} }
const ok=(c,m)=>{ if(!c) throw new Error(m||'assert'); };

await t('application/xml page is taken over by the tree viewer', async()=>{
  await p.goto('http://127.0.0.1:18234/feed.xml');
  await p.waitForSelector('.xv-root',{timeout:5000});
  ok((await p.textContent('.xv-status')).includes('27 elements'));
  ok((await p.title()).includes('feed'));
});
await t('search works on the taken-over page', async()=>{
  await p.fill('.xv-search','SKU-1003');
  await p.press('.xv-search','Enter');
  ok((await p.textContent('.xv-count')).startsWith('1/'));
});
await t('text/plain .xml URL also rendered', async()=>{
  await p.goto('http://127.0.0.1:18234/textplain.xml');
  await p.waitForSelector('.xv-root',{timeout:5000});
});
await t('normal HTML page untouched', async()=>{
  await p.goto('http://127.0.0.1:18234/page.html');
  await p.waitForSelector('#h');
  ok(await p.locator('.xv-root').count()===0,'viewer leaked into html page!');
});
await t('JSON page untouched', async()=>{
  await p.goto('http://127.0.0.1:18234/data.json');
  await p.waitForTimeout(400);
  ok(await p.locator('.xv-root').count()===0,'viewer leaked into json!');
});
await t('XSLT-styled XML left alone', async()=>{
  await p.goto('http://127.0.0.1:18234/styled.xml');
  await p.waitForTimeout(600);
  ok(await p.locator('.xv-root').count()===0,'viewer hijacked styled xml');
});
await t('viewer.html page reachable from extension', async()=>{
  // unpacked-extension id is deterministic: sha256 of the path, hex mapped a-p
  const { createHash } = await import('node:crypto');
  const id = [...createHash('sha256').update(ROOT).digest('hex').slice(0,32)]
    .map(c => String.fromCharCode('a'.charCodeAt(0) + parseInt(c,16))).join('');
  await p.goto(`chrome-extension://${id}/viewer.html`);
  ok(await p.locator('#drop').isVisible());
  await p.fill('#paste','<a><b>1</b></a>');
  await p.click('#go');
  await p.waitForSelector('.xv-root');
});

console.log(`\n${pass} passed, ${fail} failed`);
await ctx.close(); srv.close();
process.exit(fail?1:0);
