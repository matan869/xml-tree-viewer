import assert from "node:assert";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const X = require("../src/xml.js");
let n = 0;
function t(name, fn) { fn(); n++; console.log("✓", name); }

t("pretty prints nested elements", () => {
  assert.equal(X.prettyPrint("<a><b><c>1</c></b></a>"),
    "<a>\n  <b>\n    <c>1</c>\n  </b>\n</a>");
});
t("keeps simple text inline", () => {
  assert.equal(X.prettyPrint("<a><b>hi</b><c/></a>"),
    "<a>\n  <b>hi</b>\n  <c/>\n</a>");
});
t("empty element pair collapses to one line", () => {
  assert.equal(X.prettyPrint("<a><b></b></a>"), "<a>\n  <b></b>\n</a>");
});
t("mixed content is not reflowed", () => {
  const s = "<p>Hello <b>bold</b> world</p>";
  assert.equal(X.prettyPrint("<r>" + s + "</r>"), "<r>\n  " + s + "\n</r>");
});
t("xml:space=preserve subtree kept verbatim", () => {
  const s = '<pre xml:space="preserve">  a\n   b </pre>';
  assert.equal(X.prettyPrint("<r>" + s + "</r>"), "<r>\n  " + s + "\n</r>");
});
t("attribute containing > does not break tokenizer", () => {
  const out = X.prettyPrint('<a t="x>y"><b/></a>');
  assert.equal(out, '<a t="x>y">\n  <b/>\n</a>');
});
t("comments, PI, doctype survive", () => {
  const src = '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x "1">]><!--c--><r><a>1</a></r>';
  const out = X.prettyPrint(src);
  assert.ok(out.includes('<?xml version="1.0"?>'));
  assert.ok(out.includes("<!DOCTYPE r [<!ENTITY x \"1\">]>"));
  assert.ok(out.includes("<!--c-->"));
  assert.ok(out.includes("  <a>1</a>"));
});
t("CDATA kept inline with its element", () => {
  assert.equal(X.prettyPrint("<a><b><![CDATA[x<y]]></b></a>"),
    "<a>\n  <b><![CDATA[x<y]]></b>\n</a>");
});
t("minify strips inter-element whitespace only", () => {
  assert.equal(X.minify("<a>\n  <b> hi </b>\n</a>"), "<a><b>hi</b></a>");
});
t("countElements", () => {
  assert.equal(X.countElements("<a><b/><c><d/></c></a>"), 4);
});
t("parseErrorLocation extracts chrome format", () => {
  assert.deepEqual(X.parseErrorLocation("error on line 5 at column 12: boom"), { line: 5, column: 12 });
  assert.equal(X.parseErrorLocation("nope"), null);
});
t("looksLikeXml", () => {
  assert.ok(X.looksLikeXml('<?xml version="1.0"?><a/>'));
  assert.ok(X.looksLikeXml("  <root>"));
  assert.ok(X.looksLikeXml("﻿<a>"));
  assert.ok(!X.looksLikeXml("hello world"));
  assert.ok(!X.looksLikeXml("{\"json\":1}"));
  assert.ok(!X.looksLikeXml("< notatag"));
});
t("malformed input round-trips without throwing", () => {
  X.prettyPrint("<a><b>unclosed");
  X.prettyPrint("<a attr='unterminated");
  X.prettyPrint("");
  X.prettyPrint(null);
});
t("idempotent: format(format(x)) == format(x)", () => {
  const src = '<?xml version="1.0"?><r a="1"><b>t</b><c><d/><d/></c><!--x--></r>';
  const once = X.prettyPrint(src);
  assert.equal(X.prettyPrint(once), once);
});
console.log("\n" + n + " tests passed");

// ---- features ----
const F = require("../src/features.js");
t("csv escaping", () => {
  assert.equal(F.csvEscape('a,b'), '"a,b"');
  assert.equal(F.csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(F.csvEscape("plain"), "plain");
  assert.equal(F.toCsv(["a","b"],[["1","x,y"]]), 'a,b\r\n1,"x,y"');
});
console.log("\n" + (n+1) + " tests passed (incl. features)");
