/* XML core: tokenizer, pretty printer, helpers.
   Pure string/DOM-free logic so it can be unit tested in Node.
   Loaded as a plain script (content script + viewer page) and as a module in tests. */
(function (root) {
  "use strict";

  /** Split an XML string into typed tokens. Never throws; unterminated
   *  constructs are emitted as-is so malformed input still round-trips. */
  function tokenize(xml) {
    const out = [];
    let i = 0;
    const n = xml.length;
    while (i < n) {
      if (xml[i] !== "<") {
        const j = xml.indexOf("<", i);
        const end = j === -1 ? n : j;
        out.push({ t: "text", v: xml.slice(i, end) });
        i = end;
        continue;
      }
      if (xml.startsWith("<!--", i)) {
        const e = xml.indexOf("-->", i + 4);
        const end = e === -1 ? n : e + 3;
        out.push({ t: "comment", v: xml.slice(i, end) });
        i = end;
      } else if (xml.startsWith("<![CDATA[", i)) {
        const e = xml.indexOf("]]>", i + 9);
        const end = e === -1 ? n : e + 3;
        out.push({ t: "cdata", v: xml.slice(i, end) });
        i = end;
      } else if (xml.startsWith("<?", i)) {
        const e = xml.indexOf("?>", i + 2);
        const end = e === -1 ? n : e + 2;
        out.push({ t: "pi", v: xml.slice(i, end) });
        i = end;
      } else if (xml.startsWith("<!", i)) {
        // DOCTYPE, which may carry an internal subset in [ ... ].
        let depth = 0;
        let j = i + 2;
        for (; j < n; j++) {
          const c = xml[j];
          if (c === "[") depth++;
          else if (c === "]") depth--;
          else if (c === ">" && depth <= 0) { j++; break; }
        }
        out.push({ t: "doctype", v: xml.slice(i, j) });
        i = j;
      } else {
        // Element tag. '>' inside an attribute value is not a terminator.
        let j = i + 1;
        let quote = null;
        for (; j < n; j++) {
          const c = xml[j];
          if (quote) { if (c === quote) quote = null; }
          else if (c === '"' || c === "'") quote = c;
          else if (c === ">") { j++; break; }
        }
        const v = xml.slice(i, j);
        const t = v[1] === "/" ? "close" : (/\/\s*>$/.test(v) ? "self" : "open");
        out.push({ t, v });
        i = j;
      }
    }
    return out;
  }

  function tagName(tok) {
    const m = /^<\/?\s*([^\s/>]+)/.exec(tok.v);
    return m ? m[1] : "";
  }

  /** Index of the token closing the element opened at `open`, or -1. */
  function findMatching(toks, open) {
    let depth = 0;
    for (let k = open; k < toks.length; k++) {
      const t = toks[k];
      if (t.t === "open") depth++;
      else if (t.t === "close") {
        depth--;
        if (depth === 0) return k;
      }
    }
    return -1;
  }

  const WS_ONLY = /^\s*$/;

  /** True when the span (exclusive of its own open/close) mixes element
   *  children with real text, i.e. reflowing it would change the document. */
  function isMixed(toks, open, close) {
    let hasEl = false;
    let hasText = false;
    let depth = 0;
    for (let k = open + 1; k < close; k++) {
      const t = toks[k];
      if (t.t === "open") { if (depth === 0) hasEl = true; depth++; }
      else if (t.t === "close") depth--;
      else if (depth === 0) {
        if (t.t === "self") hasEl = true;
        else if (t.t === "text" && !WS_ONLY.test(t.v)) hasText = true;
      }
    }
    return hasEl && hasText;
  }

  function preservesSpace(tok) {
    return /\bxml:space\s*=\s*(["'])preserve\1/.test(tok.v);
  }

  /** Re-indent an XML string. Mixed content and xml:space="preserve"
   *  subtrees are emitted verbatim rather than reflowed. */
  function prettyPrint(xml, opts) {
    const indent = (opts && opts.indent !== undefined) ? opts.indent : "  ";
    const toks = tokenize(String(xml == null ? "" : xml));
    const lines = [];
    let depth = 0;

    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];

      if (t.t === "text") {
        if (!WS_ONLY.test(t.v)) lines.push(indent.repeat(depth) + t.v.trim());
        continue;
      }

      if (t.t === "close") {
        depth = Math.max(0, depth - 1);
        lines.push(indent.repeat(depth) + t.v);
        continue;
      }

      const pad = indent.repeat(depth);

      if (t.t === "open") {
        const close = findMatching(toks, i);
        if (close !== -1 && (isMixed(toks, i, close) || preservesSpace(t))) {
          let verbatim = "";
          for (let k = i; k <= close; k++) verbatim += toks[k].v;
          lines.push(pad + verbatim);
          i = close;
          continue;
        }
        const n1 = toks[i + 1];
        const n2 = toks[i + 2];
        if (n1 && n1.t === "close") { lines.push(pad + t.v + n1.v); i += 1; continue; }
        if (n1 && (n1.t === "text" || n1.t === "cdata") && n2 && n2.t === "close") {
          const inner = n1.t === "text" ? n1.v.trim() : n1.v;
          lines.push(pad + t.v + inner + n2.v);
          i += 2;
          continue;
        }
        lines.push(pad + t.v);
        depth++;
        continue;
      }

      lines.push(pad + t.v);
    }
    return lines.join("\n");
  }

  function minify(xml) {
    return tokenize(String(xml == null ? "" : xml))
      .filter((t) => !(t.t === "text" && WS_ONLY.test(t.v)))
      .map((t) => (t.t === "text" ? t.v.trim() : t.v))
      .join("");
  }

  /** Rough element count without building a DOM — used to pick a default
   *  collapse depth before rendering a large document. */
  function countElements(xml) {
    let c = 0;
    for (const t of tokenize(String(xml == null ? "" : xml))) {
      if (t.t === "open" || t.t === "self") c++;
    }
    return c;
  }

  /** Chrome reports parse failures as "... error on line 5 at column 12: msg". */
  function parseErrorLocation(text) {
    const m = /line\s+(\d+)\s+at\s+column\s+(\d+)/i.exec(String(text || ""));
    return m ? { line: Number(m[1]), column: Number(m[2]) } : null;
  }

  function looksLikeXml(text) {
    const head = String(text || "").slice(0, 2048).replace(/^﻿/, "").trimStart();
    if (!head) return false;
    if (head.startsWith("<?xml")) return true;
    if (head.startsWith("<!DOCTYPE")) return true;
    if (head.startsWith("<!--") || head.startsWith("<![CDATA[")) return true;
    return /^<[A-Za-z_][\w.:-]*(\s|\/?>)/.test(head);
  }

  function formatBytes(n) {
    if (!isFinite(n) || n < 0) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }

  const api = {
    tokenize, tagName, findMatching, isMixed, preservesSpace,
    prettyPrint, minify, countElements, parseErrorLocation,
    looksLikeXml, formatBytes,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.XMLV = Object.assign(root.XMLV || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
