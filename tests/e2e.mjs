import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const xml = fs.readFileSync(path.join(ROOT,'tests/fixtures/sample.xml'),'utf8');
const JSON_DOC = '{"order":{"id":12345678901234567890,"total":19.90,"lines":[{"sku":"needle-1","qty":2},{"sku":"b","qty":1}]},"url":"https://example.com/x"}';

// tiny server: XML under various content types + a normal HTML page + JSON
const srv = http.createServer((req,res)=>{
  if (req.url==='/feed.xml') { res.setHeader('content-type','application/xml'); res.end(xml); }
  else if (req.url==='/textplain.xml') { res.setHeader('content-type','text/plain'); res.end(xml); }
  else if (req.url==='/page.html') { res.setHeader('content-type','text/html'); res.end('<!doctype html><title>normal</title><h1 id="h">Hello page</h1>'); }
  else if (req.url==='/data.json') { res.setHeader('content-type','application/json'); res.end(JSON_DOC); }
  else if (req.url==='/csp.json') { res.setHeader('content-type','application/json; charset=utf-8'); res.setHeader('content-security-policy',"default-src 'none'"); res.end(JSON_DOC); }
  else if (req.url==='/plain-json') { res.setHeader('content-type','text/plain'); res.end('[{"id":1,"n":"a"},{"id":2,"n":"b"}]'); }
  else if (req.url==='/plain-text') { res.setHeader('content-type','text/plain'); res.end('hello, just text {not json}'); }
  else if (req.url==='/bad.json') { res.setHeader('content-type','application/json'); res.end('{\n  "a": 1,\n  "b": [1, 2,]\n}'); }
  else if (req.url==='/lines') { res.setHeader('content-type','text/plain'); res.end('{"a":1}\n{"a":2}\n{"a":3}\n'); }   // Chrome downloads application/x-ndjson instead of showing it
  else if (req.url==='/html-pre') { res.setHeader('content-type','text/html'); res.end('<!doctype html><title>pre page</title><pre id="p">{"a":1}</pre>'); }
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
await t('application/json page is taken over by the JSON viewer', async()=>{
  await p.goto('http://127.0.0.1:18234/data.json');
  await p.waitForSelector('.xv-root',{timeout:5000});
  ok((await p.textContent('.xv-brand')).includes('JSON Viewer'));
  ok((await p.textContent('.xv-status')).includes('values'));
  ok((await p.title()).includes('JSON Viewer'));
});
await t('a 20-digit id is shown exactly, not rounded', async()=>{
  ok((await p.textContent('.xv-main')).includes('12345678901234567890'));
  ok((await p.textContent('.xv-main')).includes('19.90'), 'trailing zero kept');
});
await t('search reveals and counts on a JSON page', async()=>{
  await p.fill('.xv-search','needle');
  await p.press('.xv-search','Enter');
  ok((await p.textContent('.xv-count')).startsWith('1/1'));
  ok((await p.textContent('.xv-path')).includes('$.order.lines[0].sku'));
});
await t('strict CSP response still renders styled', async()=>{
  await p.goto('http://127.0.0.1:18234/csp.json');
  await p.waitForSelector('.xv-root',{timeout:5000});
  const pos = await p.evaluate(()=>getComputedStyle(document.querySelector('.xv-root')).position);
  ok(pos==='fixed','styles were blocked, position='+pos);
});
await t('text/plain that is JSON is formatted', async()=>{
  await p.goto('http://127.0.0.1:18234/plain-json');
  await p.waitForSelector('.xv-root',{timeout:5000});
});
await t('text/plain that is not JSON is left alone', async()=>{
  await p.goto('http://127.0.0.1:18234/plain-text');
  await p.waitForTimeout(500);
  ok(await p.locator('.xv-root').count()===0,'viewer hijacked plain text');
});
await t('HTML page holding JSON in a <pre> is left alone', async()=>{
  await p.goto('http://127.0.0.1:18234/html-pre');
  await p.waitForSelector('#p');
  await p.waitForTimeout(400);
  ok(await p.locator('.xv-root').count()===0,'viewer hijacked an html page');
});
await t('invalid JSON shows where it breaks', async()=>{
  await p.goto('http://127.0.0.1:18234/bad.json');
  await p.waitForSelector('.xv-error',{timeout:5000});
  const e = await p.textContent('.xv-error');
  ok(/Trailing comma before \]/.test(e) && /line 3/.test(e), 'error was: '+e);
  ok(await p.locator('.xv-errline').count()===1,'error line not highlighted');
});
await t('JSON Lines open as one list with a note', async()=>{
  await p.goto('http://127.0.0.1:18234/lines');
  await p.waitForSelector('.xv-root',{timeout:5000});
  ok((await p.textContent('.xv-note')).includes('JSON Lines: 3 records'));
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
await t('viewer.html renders pasted JSON', async()=>{
  const { createHash } = await import('node:crypto');
  const id = [...createHash('sha256').update(ROOT).digest('hex').slice(0,32)]
    .map(c => String.fromCharCode('a'.charCodeAt(0) + parseInt(c,16))).join('');
  await p.goto(`chrome-extension://${id}/viewer.html`);
  await p.fill('#paste','{"pasted":[1,2,3]}');
  await p.click('#go');
  await p.waitForSelector('.xv-root');
  ok((await p.textContent('.xv-brand')).includes('JSON Viewer'));
});
await t('popup switch turns JSON formatting off and on', async()=>{
  const { createHash } = await import('node:crypto');
  const id = [...createHash('sha256').update(ROOT).digest('hex').slice(0,32)]
    .map(c => String.fromCharCode('a'.charCodeAt(0) + parseInt(c,16))).join('');
  await p.goto(`chrome-extension://${id}/popup.html`);
  ok(await p.isChecked('#json'),'switch should start on');
  await p.uncheck('#json');
  await p.waitForTimeout(300);
  await p.goto('http://127.0.0.1:18234/data.json');
  await p.waitForTimeout(700);
  ok(await p.locator('.xv-root').count()===0,'JSON still formatted with the switch off');
  await p.goto(`chrome-extension://${id}/popup.html`);
  await p.check('#json');
  await p.waitForTimeout(300);
  await p.goto('http://127.0.0.1:18234/data.json');
  await p.waitForSelector('.xv-root',{timeout:5000});
});

await t('local files: a .json and a .xml opened from disk are formatted', async()=>{
  // Chrome gives an unpacked extension file:// access; a store install needs "Allow access to file URLs".
  const os = await import('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xv-file-'));
  fs.writeFileSync(path.join(dir, 'local.json'), JSON_DOC);
  fs.writeFileSync(path.join(dir, 'local.xml'), xml);
  await p.goto('file://' + path.join(dir, 'local.json'));
  await p.waitForSelector('.xv-root',{timeout:5000});
  ok((await p.textContent('.xv-brand')).includes('JSON Viewer'), 'not the JSON viewer');
  ok((await p.textContent('.xv-main')).includes('12345678901234567890'), 'big id not exact');
  await p.goto('file://' + path.join(dir, 'local.xml'));
  await p.waitForSelector('.xv-root',{timeout:5000});
  ok((await p.textContent('.xv-brand')).includes('XML Viewer'), 'not the XML viewer');
  fs.rmSync(dir, { recursive: true, force: true });
});

console.log(`\n${pass} passed, ${fail} failed`);
await ctx.close(); srv.close();
process.exit(fail?1:0);
