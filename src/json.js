/* JSON support — pure functions, no DOM, unit-tested in Node (tests/json.mjs).
   parseJson keeps every number exactly as written (a 19-digit id is never
   rounded the way JSON.parse rounds it), keeps key order and duplicate keys,
   reads JSON Lines, skips an anti-XSSI prefix, and reports errors with a line
   and column. Nodes:
     {t:"o", keys:[...], vals:[...]}   object
     {t:"a", vals:[...]}               array   (lines:true when read as JSON Lines)
     {t:"s", v:"..."}                  string
     {t:"n", raw:"12.50"}              number, exactly as written
     {t:"b", v:true}                   boolean
     {t:"z"}                           null                                   */
(function (root) {
  "use strict";

  const MAX_DEPTH = 2500;

  function lineCol(text, pos) {
    let line = 1, last = -1;
    const end = Math.min(pos, text.length);
    for (let i = 0; i < end; i++) if (text.charCodeAt(i) === 10) { line++; last = i; }
    return { line, col: pos - last };
  }

  function jsonError(reason, pos, text) {
    const lc = lineCol(text, pos);
    const e = new Error(reason + " (line " + lc.line + ", column " + lc.col + ")");
    e.reason = reason; e.pos = pos; e.line = lc.line; e.col = lc.col;
    return e;
  }

  /** Length of an anti-XSSI / anti-hijacking prefix some APIs put before
   *  their JSON: `)]}'` (Google, Angular), `while(1);`, `for(;;);`. 0 if none. */
  function jsonPrefixLength(text) {
    let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    const m = /^\s*(\)\]\}'[^\n]*\n|\)\]\}'|while\s*\(\s*1\s*\)\s*;|for\s*\(\s*;\s*;\s*\)\s*;)/.exec(text.slice(i, i + 64));
    return m ? i + m[0].length : i;
  }

  const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

  function parseJson(text) {
    const n = text.length;
    let i = jsonPrefixLength(text);

    function fail(reason, at) { throw jsonError(reason, at === undefined ? i : at, text); }
    function ws() {
      while (i < n) {
        const c = text.charCodeAt(i);
        if (c === 32 || c === 10 || c === 13 || c === 9) i++; else break;
      }
    }
    function describe(at) {
      if (at >= n) return "the end of the input";
      const ch = text[at];
      if (ch === "'") return "a single quote (JSON strings need double quotes)";
      if (/[A-Za-z_$]/.test(ch)) {
        const word = /^[A-Za-z_$][\w$]*/.exec(text.slice(at, at + 40))[0];
        if (word === "undefined" || word === "NaN" || word === "Infinity") return word + " (not valid JSON)";
        return "the word " + word + (/^(True|False|None|NULL|Null|TRUE|FALSE)$/.test(word) ? " (JSON uses lowercase true / false / null)" : " (keys and strings need double quotes)");
      }
      if (ch === "/") return "a comment (JSON has no comments)";
      if (ch === '"') return "the string " + token(at);
      return JSON.stringify(ch);
    }
    // A short, readable picture of the value that starts at `at`.
    function token(at) {
      const ch = text[at];
      if (ch === '"') {
        let j = at + 1;
        while (j < n && j - at < 42 && text[j] !== '"' && text[j] !== "\n") j += text[j] === "\\" ? 2 : 1;
        return text[j] === '"' ? text.slice(at, j + 1) : text.slice(at, Math.min(j, n)) + "…";
      }
      if (ch === "{" || ch === "[") return ch;
      const m = /^[-\w.+]+/.exec(text.slice(at, at + 30));
      return m ? m[0] : JSON.stringify(ch);
    }
    // After a value, a new value with no comma in between: the commonest typo.
    function missingComma(at) {
      const ch = text[at];
      if (ch === '"' || ch === "{" || ch === "[" || ch === "-" || (ch >= "0" && ch <= "9") ||
          text.startsWith("true", at) || text.startsWith("false", at) || text.startsWith("null", at)) {
        return "Missing comma before " + token(at);
      }
      return "";
    }

    function string() {
      const start = i;
      i++;
      let out = "", run = i;
      for (;;) {
        if (i >= n) fail("Unterminated string", start);
        const c = text.charCodeAt(i);
        if (c === 34) { out += text.slice(run, i); i++; return out; }
        if (c === 92) {
          out += text.slice(run, i);
          const e = text[i + 1];
          switch (e) {
            case '"': out += '"'; break;
            case "\\": out += "\\"; break;
            case "/": out += "/"; break;
            case "b": out += "\b"; break;
            case "f": out += "\f"; break;
            case "n": out += "\n"; break;
            case "r": out += "\r"; break;
            case "t": out += "\t"; break;
            case "u": {
              const h = text.slice(i + 2, i + 6);
              if (!/^[0-9a-fA-F]{4}$/.test(h)) fail("Bad \\u escape", i);
              out += String.fromCharCode(parseInt(h, 16));
              i += 4;
              break;
            }
            default: fail("Bad escape \\" + (e === undefined ? "" : e), i);
          }
          i += 2; run = i;
          continue;
        }
        if (c < 32) fail(c === 10 || c === 13 ? "Line break inside a string" : "Control character inside a string", i);
        i++;
      }
    }

    function number() {
      NUM.lastIndex = i;
      const m = NUM.exec(text);
      if (!m) fail("Bad number");
      const end = i + m[0].length;
      const nx = text.charCodeAt(end);
      if (m[0] === "0" || m[0] === "-0" ? (nx >= 48 && nx <= 57) : false) fail("Numbers cannot start with 0", i);
      if (nx === 46 || nx === 101 || nx === 69 || (nx >= 48 && nx <= 57)) fail("Bad number", end);
      i = end;
      return { t: "n", raw: m[0] };
    }

    function value(depth) {
      if (depth > MAX_DEPTH) fail("Nested deeper than " + MAX_DEPTH + " levels");
      ws();
      if (i >= n) fail("Unexpected end of input");
      const c = text.charCodeAt(i);
      if (c === 123) return object(depth);
      if (c === 91) return array(depth);
      if (c === 34) return { t: "s", v: string() };
      if (c === 45 || (c >= 48 && c <= 57)) return number();
      if (text.startsWith("true", i)) { i += 4; return { t: "b", v: true }; }
      if (text.startsWith("false", i)) { i += 5; return { t: "b", v: false }; }
      if (text.startsWith("null", i)) { i += 4; return { t: "z" }; }
      fail("Expected a value but found " + describe(i));
    }

    function object(depth) {
      i++;
      const keys = [], vals = [];
      ws();
      if (text.charCodeAt(i) === 125) { i++; return { t: "o", keys, vals }; }
      for (;;) {
        ws();
        if (text.charCodeAt(i) !== 34) {
          fail(text.charCodeAt(i) === 125 ? "Trailing comma before }" : "Expected a \"key\" but found " + describe(i));
        }
        keys.push(string());
        ws();
        if (text.charCodeAt(i) !== 58) fail("Expected : after the key but found " + describe(i));
        i++;
        vals.push(value(depth + 1));
        ws();
        const c = text.charCodeAt(i);
        if (c === 44) { i++; continue; }
        if (c === 125) { i++; return { t: "o", keys, vals }; }
        fail(i >= n ? "Unexpected end of input — missing }" : missingComma(i) || "Expected , or } but found " + describe(i));
      }
    }

    function array(depth) {
      i++;
      const vals = [];
      ws();
      if (text.charCodeAt(i) === 93) { i++; return { t: "a", vals }; }
      for (;;) {
        ws();
        if (text.charCodeAt(i) === 93) fail("Trailing comma before ]");
        vals.push(value(depth + 1));
        ws();
        const c = text.charCodeAt(i);
        if (c === 44) { i++; continue; }
        if (c === 93) { i++; return { t: "a", vals }; }
        fail(i >= n ? "Unexpected end of input — missing ]" : missingComma(i) || "Expected , or ] but found " + describe(i));
      }
    }

    const first = value(0);
    const afterFirst = i;
    ws();
    if (i >= n) return first;

    // More content after one complete value: JSON Lines (one value per line)?
    if (text.slice(afterFirst, i).indexOf("\n") >= 0 &&
        (text.charCodeAt(i) === 123 || text.charCodeAt(i) === 91)) {
      const vals = [first];
      while (i < n) {
        const before = i;
        vals.push(value(0));
        const stop = i;
        ws();
        if (i < n && text.slice(stop, i).indexOf("\n") < 0) fail("Expected a new line between JSON Lines records");
        if (i === before) break;
      }
      return { t: "a", vals, lines: true };
    }
    fail("Extra text after the end of the JSON value: " + token(i));
  }

  function looksLikeJson(text) {
    const s = text.slice(jsonPrefixLength(text), jsonPrefixLength(text) + 200).trimStart();
    return s[0] === "{" || s[0] === "[";
  }

  function pretty(node, indent) {
    indent = indent === undefined ? "  " : indent;
    const out = [];
    (function w(nd, pad) {
      switch (nd.t) {
        case "o": {
          if (!nd.keys.length) { out.push("{}"); return; }
          const p2 = pad + indent;
          out.push("{\n");
          for (let k = 0; k < nd.keys.length; k++) {
            out.push(p2, JSON.stringify(nd.keys[k]), ": ");
            w(nd.vals[k], p2);
            out.push(k < nd.keys.length - 1 ? ",\n" : "\n");
          }
          out.push(pad, "}");
          return;
        }
        case "a": {
          if (!nd.vals.length) { out.push("[]"); return; }
          const p2 = pad + indent;
          out.push("[\n");
          for (let k = 0; k < nd.vals.length; k++) {
            out.push(p2);
            w(nd.vals[k], p2);
            out.push(k < nd.vals.length - 1 ? ",\n" : "\n");
          }
          out.push(pad, "]");
          return;
        }
        case "s": out.push(JSON.stringify(nd.v)); return;
        case "n": out.push(nd.raw); return;
        case "b": out.push(nd.v ? "true" : "false"); return;
        default: out.push("null");
      }
    })(node, "");
    return out.join("");
  }

  function minify(node) {
    const out = [];
    (function w(nd) {
      switch (nd.t) {
        case "o":
          out.push("{");
          for (let k = 0; k < nd.keys.length; k++) {
            if (k) out.push(",");
            out.push(JSON.stringify(nd.keys[k]), ":");
            w(nd.vals[k]);
          }
          out.push("}");
          return;
        case "a":
          out.push("[");
          for (let k = 0; k < nd.vals.length; k++) { if (k) out.push(","); w(nd.vals[k]); }
          out.push("]");
          return;
        case "s": out.push(JSON.stringify(nd.v)); return;
        case "n": out.push(nd.raw); return;
        case "b": out.push(nd.v ? "true" : "false"); return;
        default: out.push("null");
      }
    })(node);
    return out.join("");
  }

  /** JSON Lines back out: one minified record per line. */
  function toLines(node) {
    return node.vals.map(minify).join("\n");
  }

  const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  /** ["data", 3, "first name"] -> $.data[3]["first name"] */
  function jsonPath(segs) {
    let p = "$";
    for (const s of segs) {
      p += typeof s === "number" ? "[" + s + "]" : IDENT.test(s) ? "." + s : "[" + JSON.stringify(s) + "]";
    }
    return p;
  }

  /** Text for a table cell: strings bare, numbers as written, null empty,
   *  objects/arrays as compact JSON (cut at 300 characters). */
  function cellText(nd) {
    switch (nd.t) {
      case "s": return nd.v;
      case "n": return nd.raw;
      case "b": return nd.v ? "true" : "false";
      case "z": return "";
      default: {
        const s = minify(nd);
        return s.length > 300 ? s.slice(0, 300) + "…" : s;
      }
    }
  }

  function flatten(obj, prefix, into, depth) {
    for (let k = 0; k < obj.keys.length; k++) {
      const key = prefix ? prefix + "." + obj.keys[k] : obj.keys[k];
      const v = obj.vals[k];
      if (v.t === "o" && depth < 2 && v.keys.length && v.keys.length <= 12) flatten(v, key, into, depth + 1);
      else into.set(key, cellText(v));
    }
  }

  /** Arrays that read as a list of records (>= 2 items, >= 80% objects),
   *  biggest first. Each: {segs, node}. Arrays repeated inside every record
   *  (items[*].tags) are listed once, from the record where they are largest. */
  function findJsonTables(rootNode, limit) {
    limit = limit || 12;
    const byPattern = new Map();
    (function walk(nd, segs) {
      if (nd.t === "a") {
        const objs = nd.vals.reduce((c, v) => c + (v.t === "o" ? 1 : 0), 0);
        if (nd.vals.length >= 2 && objs / nd.vals.length >= 0.8) {
          const pattern = segs.map((s) => (typeof s === "number" ? "*" : s)).join("\u0001");
          const prev = byPattern.get(pattern);
          if (!prev || prev.node.vals.length < nd.vals.length) byPattern.set(pattern, { segs: segs.slice(), node: nd });
        }
        for (let k = 0; k < nd.vals.length && k < 3; k++) { segs.push(k); walk(nd.vals[k], segs); segs.pop(); }
      } else if (nd.t === "o") {
        for (let k = 0; k < nd.keys.length; k++) { segs.push(nd.keys[k]); walk(nd.vals[k], segs); segs.pop(); }
      }
    })(rootNode, []);
    return [...byPattern.values()].sort((a, b) => b.node.vals.length - a.node.vals.length).slice(0, limit);
  }

  /** Rows and columns for one record list. Nested objects are flattened two
   *  levels deep into dotted columns (customer.address.city). */
  function buildJsonTable(arrNode, maxCols) {
    maxCols = maxCols || 80;
    const cols = [], seen = new Set(), maps = [];
    for (const v of arrNode.vals) {
      const m = new Map();
      if (v.t === "o") flatten(v, "", m, 0); else m.set("(value)", cellText(v));
      for (const k of m.keys()) if (!seen.has(k) && cols.length < maxCols) { seen.add(k); cols.push(k); }
      maps.push(m);
    }
    return { columns: cols, data: maps.map((m) => cols.map((c) => (m.has(c) ? m.get(c) : ""))) };
  }

  /** Walk every node once: parent links (for search, reveal and paths) and a count. */
  function indexJson(rootNode) {
    const parent = new WeakMap();
    let count = 0;
    (function walk(nd) {
      count++;
      if (nd.t === "o") {
        for (let k = 0; k < nd.vals.length; k++) { parent.set(nd.vals[k], [nd, nd.keys[k], k]); walk(nd.vals[k]); }
      } else if (nd.t === "a") {
        for (let k = 0; k < nd.vals.length; k++) { parent.set(nd.vals[k], [nd, k, k]); walk(nd.vals[k]); }
      }
    })(rootNode);
    return { parent, count };
  }

  const api = {
    parseJson, looksLikeJson, jsonPrefixLength, jsonPretty: pretty, jsonMinify: minify, jsonToLines: toLines,
    jsonPath, jsonCellText: cellText, findJsonTables, buildJsonTable, indexJson,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.XMLV = Object.assign(root.XMLV || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
