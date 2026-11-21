// Unit tests for src/json.js (pure, Node only): node tests/json.mjs
import assert from "node:assert";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const J = require("../src/json.js");
let n = 0;
function t(name, fn) { fn(); n++; console.log("✓", name); }
const err = (s) => { try { J.parseJson(s); } catch (e) { return e; } throw new Error("expected a parse error for " + JSON.stringify(s)); };

const SAMPLES = [
  '{"a":1,"b":[true,false,null],"c":{"d":"e"}}',
  '[]', '{}', '[[],{},[{}]]', '"just a string"', '42', '-0.5', 'true', 'null',
  '{"unicode":"héllo \\u00e9 \\ud83d\\ude00 \\n\\t\\"q\\" \\\\ /","emoji":"😀"}',
  '{"nested":{"deeper":{"deepest":[1,2,{"x":[3,4]}]}}}',
  '  \n {"spaced" :  [ 1 , 2 ] }  \n',
];

t("pretty print matches JSON.stringify(…, null, 2) on ordinary documents", () => {
  for (const s of SAMPLES) assert.equal(J.jsonPretty(J.parseJson(s)), JSON.stringify(JSON.parse(s), null, 2), s);
});
t("minify matches JSON.stringify on ordinary documents", () => {
  for (const s of SAMPLES) assert.equal(J.jsonMinify(J.parseJson(s)), JSON.stringify(JSON.parse(s)), s);
});
t("big integers and long decimals are kept exactly (JSON.parse rounds them)", () => {
  const s = '{"id":12345678901234567890,"price":0.10000000000000000001,"e":1E+400}';
  assert.notEqual(JSON.stringify(JSON.parse(s)).includes("12345678901234567890"), true);
  const out = J.jsonMinify(J.parseJson(s));
  assert.equal(out, s);
});
t("numbers keep the exact spelling they were sent with", () => {
  assert.equal(J.jsonMinify(J.parseJson("[-0.5e-7,1E3,1.50,0]")), "[-0.5e-7,1E3,1.50,0]");
});
t("key order and duplicate keys are kept", () => {
  const nd = J.parseJson('{"b":1,"a":2,"b":3}');
  assert.deepEqual(nd.keys, ["b", "a", "b"]);
  assert.equal(J.jsonMinify(nd), '{"b":1,"a":2,"b":3}');
});
t("string escapes decode", () => {
  const nd = J.parseJson('"a\\u0041\\n\\/\\ud83d\\ude00"');
  assert.equal(nd.v, "aA\n/😀");
});
t("trailing comma: clear message with line and column", () => {
  const e = err('{\n  "a": 1,\n}');
  assert.match(e.message, /Trailing comma before \}/);
  assert.equal(e.line, 3); assert.equal(e.col, 1);
  assert.match(err("[1,2,]").message, /Trailing comma before \]/);
});
t("single quotes, bare words, comments, Python literals explained", () => {
  assert.match(err("{'a':1}").message, /single quote/);
  assert.match(err('{a:1}').message, /double quotes/);
  assert.match(err('[True]').message, /lowercase true/);
  assert.match(err('{"a":undefined}').message, /undefined \(not valid JSON\)/);
  assert.match(err('{"a":1 // c\n}').message, /comment/);
  assert.match(err('[NaN]').message, /NaN/);
});
t("bad numbers rejected", () => {
  assert.match(err("[012]").message, /cannot start with 0/);
  assert.match(err("[1.]").message, /Bad number/);
  assert.match(err("[-]").message, /Bad number/);
  assert.match(err("[1e]").message, /Bad number/);
  assert.match(err("[.5]").message, /Expected a value but found "\."/);
});
t("strings: unterminated, raw line break, bad escape", () => {
  assert.match(err('{"a":"x').message, /Unterminated string/);
  assert.match(err('["a\nb"]').message, /Line break inside a string/);
  assert.match(err('["\\x41"]').message, /Bad escape/);
  assert.match(err('["\\u12G4"]').message, /Bad \\u escape/);
});
t("missing brackets and garbage after the value", () => {
  assert.match(err('{"a":[1,2}').message, /Expected , or \]/);
  assert.match(err('{"a":1').message, /missing \}/);
  assert.match(err('{"a":1} x').message, /after the end of the JSON value/);
  assert.match(err('').message, /Unexpected end of input/);
});
t("a missing comma is named in plain words", () => {
  const e = err('{\n  "a": 1\n  "b": 2\n}');
  assert.equal(e.message, 'Missing comma before "b" (line 3, column 3)');
  assert.match(err("[1 2]").message, /^Missing comma before 2 /);
  assert.match(err('[{"a":1} {"b":2}]').message, /^Missing comma before \{ /);
  assert.match(err('{"a":1 true}').message, /^Missing comma before true /);
  assert.match(err('{"a" "b"}').message, /^Expected : after the key but found the string "b" /);
  assert.match(err('["x" "' + "y".repeat(80) + '"]').message, /^Missing comma before "y{30,45}… /);
  assert.match(err('[True]').message, /^Expected a value but found the word True \(JSON uses lowercase/);
  assert.match(err('{"a":1} x').message, /^Extra text after the end of the JSON value: x /);
});
t("error position points at the offending character", () => {
  const e = err('{"ok": true,\n "bad": tru }');
  assert.equal(e.line, 2); assert.equal(e.col, 9);
});
t("anti-XSSI prefixes are skipped", () => {
  for (const p of [")]}'\n", ")]}',\n", "while(1);", "for(;;);"]) {
    const s = p + '{"a":1}';
    assert.equal(J.jsonMinify(J.parseJson(s)), '{"a":1}', p);
    assert.ok(J.looksLikeJson(s));
    assert.ok(J.jsonPrefixLength(s) > 0);
  }
  assert.equal(J.jsonPrefixLength('{"a":1}'), 0);
  assert.equal(J.jsonPrefixLength('﻿{"a":1}'), 1);
});
t("JSON Lines read as one list", () => {
  const nd = J.parseJson('{"a":1}\n{"a":2}\n\n{"a":3}\n');
  assert.equal(nd.t, "a"); assert.equal(nd.lines, true); assert.equal(nd.vals.length, 3);
  assert.equal(J.jsonToLines(nd), '{"a":1}\n{"a":2}\n{"a":3}');
  assert.match(err('{"a":1}\n{"a":2} {"a":3}').message, /new line between JSON Lines/);
});
t("very deep nesting is an error, not a crash", () => {
  const deep = "[".repeat(3000) + "]".repeat(3000);
  assert.match(err(deep).message, /Nested deeper than/);
  const ok = "[".repeat(1000) + "]".repeat(1000);
  assert.equal(J.jsonMinify(J.parseJson(ok)), ok);
});
t("looksLikeJson", () => {
  assert.ok(J.looksLikeJson('  {"a":1}'));
  assert.ok(J.looksLikeJson("\n[1,2]"));
  assert.ok(!J.looksLikeJson("hello"));
  assert.ok(!J.looksLikeJson("<a/>"));
  assert.ok(!J.looksLikeJson('"str"'));
});
t("jsonPath uses dots for identifiers and brackets otherwise", () => {
  assert.equal(J.jsonPath([]), "$");
  assert.equal(J.jsonPath(["data", 3, "first name", "_id", "a-b", "$ref"]), '$.data[3]["first name"]._id["a-b"].$ref');
});
t("findJsonTables: the biggest record list first, repeated inner lists once", () => {
  const doc = J.parseJson(JSON.stringify({
    meta: { page: 1 },
    data: [
      { id: 1, user: { name: "A", address: { city: "X" } }, tags: [{ k: 1 }, { k: 2 }] },
      { id: 2, user: { name: "B", address: { city: "Y" } }, tags: [{ k: 3 }, { k: 4 }, { k: 5 }] },
      { id: 3, user: { name: "C" }, tags: [] },
    ],
    numbers: [1, 2, 3],
  }));
  const tables = J.findJsonTables(doc);
  assert.equal(J.jsonPath(tables[0].segs), "$.data");
  assert.equal(tables.length, 2);
  assert.equal(J.jsonPath(tables[1].segs), "$.data[1].tags");
  const tb = J.buildJsonTable(tables[0].node);
  assert.deepEqual(tb.columns, ["id", "user.name", "user.address.city", "tags"]);
  assert.deepEqual(tb.data[0], ["1", "A", "X", '[{"k":1},{"k":2}]']);
  assert.deepEqual(tb.data[2], ["3", "C", "", "[]"]);
});
t("indexJson links every value to its parent", () => {
  const doc = J.parseJson('{"a":[{"b":1}]}');
  const ix = J.indexJson(doc);
  assert.equal(ix.count, 4);
  const b = doc.vals[0].vals[0].vals[0];
  const p1 = ix.parent.get(b);
  assert.equal(p1[1], "b");
  assert.equal(ix.parent.get(p1[0])[1], 0);
});
t("a 3 MB document parses in reasonable time", () => {
  const rows = [];
  for (let k = 0; k < 40000; k++) rows.push({ id: 1e15 + k, name: "item " + k, price: (k % 1000) / 10, ok: k % 2 === 0, tags: ["a", "b"] });
  const s = JSON.stringify({ rows });
  const t0 = Date.now();
  const nd = J.parseJson(s);
  const ms = Date.now() - t0;
  assert.equal(nd.vals[0].vals.length, 40000);
  console.log("   " + (s.length / 1048576).toFixed(1) + " MB parsed in " + ms + " ms");
  assert.ok(ms < 3000, "too slow: " + ms + " ms");
});

console.log(`\n${n} JSON tests passed`);
