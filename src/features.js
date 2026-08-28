/* Features no other XML extension on the store has:
   - Table view: repeating sibling elements rendered as a sortable grid
   - CSV export of that grid
   - XML -> JSON conversion (copy / download)
   - Structure outline (every element path, count, sample)
   - Namespace panel (prefix -> URI, click to build an XPath)
   All pure functions here so they are unit-testable in Node. */
(function (root) {
  "use strict";
  const XMLV = root.XMLV = root.XMLV || {};

  /** Find the largest group of repeating sibling elements in the document.
   *  Returns {parent, tag, rows:[el], columns:[string]} or null. */
  function findRepeatingGroups(doc, minRows) {
    minRows = minRows || 3;
    const groups = [];
    (function walk(node) {
      const byTag = new Map();
      for (const child of node.children) {
        const k = child.nodeName;
        if (!byTag.has(k)) byTag.set(k, []);
        byTag.get(k).push(child);
      }
      for (const [tag, rows] of byTag) {
        if (rows.length >= minRows) groups.push({ parent: node, tag, rows });
      }
      for (const child of node.children) walk(child);
    })(doc.documentElement ? doc.documentElement : doc);
    groups.sort((a, b) => b.rows.length - a.rows.length);
    return groups;
  }

  /** Column set for a row group: attributes of the row element (@name) plus
   *  the names of its leaf child elements, in first-seen order. */
  function columnsFor(rows) {
    const cols = [];
    const seen = new Set();
    const add = (c) => { if (!seen.has(c)) { seen.add(c); cols.push(c); } };
    for (const r of rows.slice(0, 200)) {
      for (const a of r.attributes) add("@" + a.name);
      for (const c of r.children) {
        if (c.children.length === 0) add(c.nodeName);
        else for (const g of c.children) if (g.children.length === 0) add(c.nodeName + "/" + g.nodeName);
      }
    }
    return cols;
  }

  function cellValue(row, col) {
    if (col[0] === "@") return row.getAttribute(col.slice(1)) || "";
    const parts = col.split("/");
    let node = row;
    for (const p of parts) {
      let hit = null;
      for (const c of node.children) if (c.nodeName === p) { hit = c; break; }
      if (!hit) return "";
      node = hit;
    }
    return (node.textContent || "").trim();
  }

  function buildTable(group) {
    const columns = columnsFor(group.rows);
    const data = group.rows.map((r) => columns.map((c) => cellValue(r, c)));
    return { tag: group.tag, columns, data, rows: group.rows };
  }

  function csvEscape(v) {
    const s = String(v == null ? "" : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(columns, data) {
    const lines = [columns.map(csvEscape).join(",")];
    for (const row of data) lines.push(row.map(csvEscape).join(","));
    return lines.join("\r\n");
  }

  /** XML -> JSON. Attributes become "@name", text becomes "#text" (or the
   *  bare value when an element has no attributes and no element children).
   *  Repeated sibling tags collapse into arrays. */
  function nodeToJson(node) {
    const obj = {};
    let hasAttr = false;
    if (node.attributes) {
      for (const a of node.attributes) { obj["@" + a.name] = a.value; hasAttr = true; }
    }
    const kids = [];
    let text = "";
    for (const c of node.childNodes) {
      if (c.nodeType === 1) kids.push(c);
      else if (c.nodeType === 3 || c.nodeType === 4) text += c.nodeValue;
    }
    text = text.trim();
    if (!kids.length) {
      if (!hasAttr) return text;
      if (text) obj["#text"] = text;
      return obj;
    }
    for (const c of kids) {
      const v = nodeToJson(c);
      const k = c.nodeName;
      if (k in obj) {
        if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
        obj[k].push(v);
      } else obj[k] = v;
    }
    if (text) obj["#text"] = text;
    return obj;
  }

  function docToJson(doc) {
    const rootEl = doc.documentElement;
    if (!rootEl) return {};
    return { [rootEl.nodeName]: nodeToJson(rootEl) };
  }

  /** Element-path census: path -> {count, sample}. Answers "what is even in
   *  this file" for a 40k-line document nobody wrote. */
  function outline(doc) {
    const map = new Map();
    (function walk(node, path) {
      const p = path ? path + "/" + node.nodeName : node.nodeName;
      let rec = map.get(p);
      if (!rec) { rec = { path: p, count: 0, sample: "", attrs: new Set() }; map.set(p, rec); }
      rec.count++;
      if (!rec.sample) {
        const own = [...node.childNodes].filter((c) => c.nodeType === 3 || c.nodeType === 4)
          .map((c) => c.nodeValue).join("").trim();
        if (own) rec.sample = own.slice(0, 60);
      }
      for (const a of node.attributes) rec.attrs.add(a.name);
      for (const c of node.children) walk(c, p);
    })(doc.documentElement, "");
    return [...map.values()].map((r) => ({ ...r, attrs: [...r.attrs] }));
  }

  /** Every xmlns declaration in the document, prefix -> uri. */
  function namespaces(doc) {
    const out = new Map();
    (function walk(node) {
      for (const a of node.attributes) {
        if (a.name === "xmlns") out.set("(default)", a.value);
        else if (a.name.startsWith("xmlns:")) out.set(a.name.slice(6), a.value);
      }
      for (const c of node.children) walk(c);
    })(doc.documentElement);
    return [...out.entries()].map(([prefix, uri]) => ({ prefix, uri }));
  }

  const api = { findRepeatingGroups, columnsFor, cellValue, buildTable, toCsv, csvEscape,
                nodeToJson, docToJson, outline, namespaces };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  Object.assign(XMLV, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
