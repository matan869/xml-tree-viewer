/* JSON viewer UI — the twin of tree.js's XML viewer: same frame, same CSS,
   same keys. Builds into a container: a taken-over JSON response (content
   script) or the extension's viewer page. Every element is created through
   createElementNS and textContent; document data never goes through innerHTML.
   Styles go in through a constructed style sheet first, so a strict
   Content-Security-Policy on the JSON response cannot strip them. */
(function (root) {
  "use strict";
  const H = "http://www.w3.org/1999/xhtml";
  const XMLV = root.XMLV = root.XMLV || {};

  const JCSS = `
.xv-jk { color:var(--xv-tag); }
.xv-js { color:var(--xv-val); }
.xv-jn { color:var(--xv-attr); }
.xv-jb { color:var(--xv-accent); font-weight:600; }
.xv-ji { color:var(--xv-punc); }
.xv-js a { color:inherit; text-decoration:underline dotted; text-underline-offset:2px; }
.xv-js a:hover { text-decoration-style:solid; }
.xv-note { background:var(--xv-badge); color:var(--xv-badge-fg); padding:6px 16px;
  font:12px system-ui,sans-serif; border-bottom:1px solid var(--xv-line); }
.xv-raw.xv-on { display:block; }
`;

  function el(doc, tag, cls, text) {
    const e = doc.createElementNS(H, tag);
    if (cls) e.setAttribute("class", cls);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function applyCss(doc, host, css) {
    try {
      if (Array.isArray(doc.adoptedStyleSheets) && root.CSSStyleSheet) {
        const sheet = new root.CSSStyleSheet();
        sheet.replaceSync(css);
        doc.adoptedStyleSheets = doc.adoptedStyleSheets.concat([sheet]);
        return;
      }
    } catch (e) { /* fall back to a <style> element */ }
    const st = el(doc, "style");
    st.textContent = css;
    host.appendChild(st);
  }

  const TRUNCATE = 300;
  const CHUNK = 500;          // children rendered per "show more"
  const EXPAND_CAP = 50000;   // nodes rendered by "Expand all"
  const MAXHITS = 2000;

  function buildJsonViewer(doc, container, text, opts) {
    opts = opts || {};
    let theme = opts.theme || "auto";

    // ---------- frame ----------
    const rootEl = el(doc, "div", "xv-root");
    applyCss(doc, rootEl, (XMLV.viewerCss || "") + JCSS);

    const bar = el(doc, "div", "xv-bar");
    const brand = el(doc, "div", "xv-brand");
    brand.appendChild(el(doc, "span", "xv-logo", "{ }"));
    brand.appendChild(el(doc, "span", null, "JSON Viewer"));
    bar.appendChild(brand);
    const sep = () => el(doc, "div", "xv-sep");
    const btn = (label, title) => { const b = el(doc, "button", "xv-btn", label); if (title) b.setAttribute("title", title); return b; };
    bar.appendChild(sep());

    const search = el(doc, "input", "xv-in xv-search");
    search.setAttribute("placeholder", "Search keys & values (/)");
    const searchCount = el(doc, "span", "xv-count", "");
    const prevBtn = btn("‹", "Previous match (Shift+Enter)"), nextBtn = btn("›", "Next match (Enter)");
    [search, searchCount, prevBtn, nextBtn].forEach((x) => bar.appendChild(x));
    bar.appendChild(sep());

    const treeBtn = btn("Tree"), tableBtn = btn("Table", "Arrays of records as a sortable table"),
      rawBtn = btn("Raw", "Formatted text with line numbers");
    [treeBtn, tableBtn, rawBtn].forEach((x) => bar.appendChild(x));
    bar.appendChild(sep());
    const expandBtn = btn("Expand all"), collapseBtn = btn("Collapse all"),
      copyBtn = btn("Copy", "Copy formatted JSON"), minBtn = btn("Copy minified"),
      dlBtn = btn("Download"), themeBtn = btn("◐", "Theme: auto / dark / light");
    [expandBtn, collapseBtn, copyBtn, minBtn, dlBtn, themeBtn].forEach((x) => bar.appendChild(x));
    rootEl.appendChild(bar);

    const errBox = el(doc, "div", "xv-error");
    errBox.style.display = "none";
    rootEl.appendChild(errBox);
    const noteBox = el(doc, "div", "xv-note");
    noteBox.style.display = "none";
    rootEl.appendChild(noteBox);

    const main = el(doc, "div", "xv-main");
    const tree = el(doc, "ul", "xv-tree");
    const raw = el(doc, "pre", "xv-raw");
    const panel = el(doc, "div", "xv-panel");
    main.appendChild(tree); main.appendChild(raw); main.appendChild(panel);
    rootEl.appendChild(main);

    const status = el(doc, "div", "xv-status");
    const pathBox = el(doc, "div", "xv-path");
    const copyPath = el(doc, "span", "xv-copylink", "");
    const copyVal = el(doc, "span", "xv-copylink", "");
    const stats = el(doc, "span", null, "");
    [pathBox, copyPath, copyVal, stats].forEach((x) => status.appendChild(x));
    rootEl.appendChild(status);

    const toast = el(doc, "div", "xv-toast");
    rootEl.appendChild(toast);
    container.appendChild(rootEl);

    let toastT;
    function say(msg) {
      toast.textContent = msg;
      toast.setAttribute("data-show", "1");
      clearTimeout(toastT);
      toastT = setTimeout(() => toast.removeAttribute("data-show"), 1600);
    }
    async function clip(textToCopy, msg) {
      try { await root.navigator.clipboard.writeText(textToCopy); say(msg); }
      catch (e) { say("Copy failed: " + (e && e.message ? e.message : e)); }
    }
    function download(content, name, mime) {
      const a = el(doc, "a");
      a.setAttribute("download", name);
      a.setAttribute("href", "data:" + mime + ";charset=utf-8," + encodeURIComponent(content));
      rootEl.appendChild(a); a.click(); a.remove();
    }

    // ---------- theme ----------
    function applyTheme() {
      const dark = theme === "dark" || (theme === "auto" &&
        root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches);
      rootEl.setAttribute("data-xv-theme", dark ? "dark" : "light");
    }
    applyTheme();
    themeBtn.addEventListener("click", () => {
      theme = theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto";
      applyTheme();
      say("Theme: " + theme);
      if (opts.onTheme) opts.onTheme(theme);
    });

    // ---------- raw text with line numbers ----------
    function renderRaw(str, errLine) {
      raw.textContent = "";
      const lines = str.split("\n");
      const frag = doc.createDocumentFragment();
      const MAXL = 80000;
      for (let k = 0; k < lines.length && k < MAXL; k++) {
        // The error row is an inline-block: its line break must sit OUTSIDE it,
        // or the next line is laid out to the right of the row, off screen.
        const isErr = errLine === k + 1;
        const row = el(doc, "span", isErr ? "xv-errline" : null);
        row.appendChild(el(doc, "span", "xv-ln", String(k + 1)));
        row.appendChild(doc.createTextNode(isErr ? lines[k] : lines[k] + "\n"));
        frag.appendChild(row);
        if (isErr) frag.appendChild(doc.createTextNode("\n"));
      }
      if (lines.length > MAXL) frag.appendChild(doc.createTextNode("… (" + (lines.length - MAXL) + " more lines — Copy / Download give everything)"));
      raw.appendChild(frag);
    }

    // ---------- parse ----------
    const t0 = Date.now();
    let ast = opts.ast || null, perr = null;
    if (!ast) { try { ast = XMLV.parseJson(text); } catch (e) { perr = e; } }

    let activeView = "tree";
    function showView(v) {
      activeView = v;
      tree.style.display = v === "tree" ? "" : "none";
      raw.style.display = v === "raw" ? "block" : "none";
      panel.style.display = v === "table" ? "block" : "none";
      for (const [b, name] of [[treeBtn, "tree"], [rawBtn, "raw"], [tableBtn, "table"]]) {
        b.setAttribute("data-on", v === name ? "1" : "0");
      }
    }

    if (perr) {
      errBox.textContent = "⚠ Invalid JSON: " + perr.message;
      errBox.style.display = "";
      renderRaw(text, perr.line);
      showView("raw");
      [treeBtn, tableBtn, rawBtn, expandBtn, collapseBtn, minBtn].forEach((b) => { b.style.display = "none"; });
      search.disabled = true;
      stats.textContent = XMLV.formatBytes(text.length);
      copyBtn.setAttribute("title", "Copy the text as received");
      copyBtn.addEventListener("click", () => clip(text, "Copied"));
      dlBtn.addEventListener("click", () => { download(text, (opts.filename || "document") + ".json", "application/json"); say("Downloading…"); });
      const errRow = raw.querySelector(".xv-errline");
      if (errRow) setTimeout(() => errRow.scrollIntoView({ block: "center" }), 0);
      return api();
    }

    const idx = XMLV.indexJson(ast);
    const parentOf = idx.parent;
    const total = idx.count;
    const defaultDepth = total > 20000 ? 1 : total > 2000 ? 2 : 8;
    const prefixLen = XMLV.jsonPrefixLength(text);
    const notes = [];
    if (ast.lines) notes.push("JSON Lines: " + ast.vals.length.toLocaleString() + " records, shown as one list.");
    if (prefixLen > (text.charCodeAt(0) === 0xfeff ? 1 : 0)) notes.push("An anti-hijacking prefix (" + JSON.stringify(text.slice(0, prefixLen).trim().slice(0, 12)) + ") was skipped.");
    if (notes.length) { noteBox.textContent = notes.join(" "); noteBox.style.display = ""; }

    // ---------- tree (children built lazily, big lists in chunks) ----------
    const liOf = new WeakMap();
    const stateOf = new WeakMap();
    let rendered = 0;

    function sizeOf(nd) { return nd.t === "o" || nd.t === "a" ? nd.vals.length : 0; }

    function strSpan(v) {
      const q = JSON.stringify(v);
      const wrap = el(doc, "span", "xv-js");
      if (v.length < 2048 && /^https?:\/\/[^\s"<>]+$/.test(v)) {
        const a = el(doc, "a", null, q);
        a.setAttribute("href", v);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        wrap.appendChild(a);
        return wrap;
      }
      if (q.length <= TRUNCATE) { wrap.textContent = q; return wrap; }
      const head = el(doc, "span", null, q.slice(0, TRUNCATE));
      const more = el(doc, "span", "xv-more", " …show all (" + XMLV.formatBytes(q.length) + ")");
      more.addEventListener("click", (e) => { e.stopPropagation(); head.textContent = q; more.remove(); });
      wrap.appendChild(head); wrap.appendChild(more);
      return wrap;
    }

    function primSpan(nd) {
      if (nd.t === "s") return strSpan(nd.v);
      if (nd.t === "n") return el(doc, "span", "xv-jn", nd.raw);
      if (nd.t === "b") return el(doc, "span", "xv-jb", nd.v ? "true" : "false");
      return el(doc, "span", "xv-jb", "null");
    }

    function renderNode(nd, seg, depth, last) {
      rendered++;
      const li = el(doc, "li");
      liOf.set(nd, li);
      const line = el(doc, "div", "xv-line");
      li.appendChild(line);
      line.addEventListener("click", (e) => {
        const c = e.target.getAttribute && e.target.getAttribute("class");
        if (c !== "xv-caret" && c !== "xv-badge" && e.target.tagName !== "A" && c !== "xv-more") select(nd);
      });
      const n = sizeOf(nd);
      const container = nd.t === "o" || nd.t === "a";
      const caret = el(doc, "span", container && n ? "xv-caret" : "xv-nocaret", container && n ? "▾" : "");
      line.appendChild(caret);
      if (typeof seg === "number") line.appendChild(el(doc, "span", "xv-ji", seg + ": "));
      else if (typeof seg === "string") {
        line.appendChild(el(doc, "span", "xv-jk", JSON.stringify(seg)));
        line.appendChild(el(doc, "span", "xv-punc", ": "));
      }
      const comma = last ? "" : ",";
      if (!container) {
        line.appendChild(primSpan(nd));
        if (comma) line.appendChild(el(doc, "span", "xv-punc", comma));
        return li;
      }
      const open = nd.t === "o" ? "{" : "[", close = nd.t === "o" ? "}" : "]";
      if (!n) { line.appendChild(el(doc, "span", "xv-punc", open + close + comma)); return li; }

      line.appendChild(el(doc, "span", "xv-punc", open));
      const label = nd.t === "o" ? (n === 1 ? "1 key" : n.toLocaleString() + " keys") : (n === 1 ? "1 item" : n.toLocaleString() + " items");
      const badge = el(doc, "span", "xv-badge", label);
      const closeInline = el(doc, "span", "xv-punc", "…" + close + comma);
      line.appendChild(badge); line.appendChild(closeInline);
      const closeLine = el(doc, "div", "xv-line");
      closeLine.appendChild(el(doc, "span", "xv-nocaret"));
      closeLine.appendChild(el(doc, "span", "xv-punc", close + comma));

      let ul = null, isOpen = false, shown = 0, moreLi = null;
      function more(upTo) {
        if (moreLi) { moreLi.remove(); moreLi = null; }
        const want = Math.max(shown + CHUNK, upTo === undefined ? 0 : upTo + 1);
        const end = Math.min(n, want);
        const keys = nd.t === "o" ? nd.keys : null;
        const frag = doc.createDocumentFragment();
        for (let k = shown; k < end; k++) frag.appendChild(renderNode(nd.vals[k], keys ? keys[k] : k, depth + 1, k === n - 1));
        ul.appendChild(frag);
        shown = end;
        if (shown < n) {
          moreLi = el(doc, "li");
          const m = el(doc, "span", "xv-more", "… show " + Math.min(CHUNK, n - shown).toLocaleString() + " more (" + (n - shown).toLocaleString() + " left)");
          m.addEventListener("click", () => more());
          moreLi.appendChild(m);
          ul.appendChild(moreLi);
        }
      }
      function setOpen(v) {
        if (v && !ul) { ul = el(doc, "ul"); li.appendChild(ul); more(); li.appendChild(closeLine); }
        isOpen = v;
        caret.textContent = v ? "▾" : "▸";
        if (ul) ul.style.display = v ? "" : "none";
        closeLine.style.display = v ? "" : "none";
        closeInline.style.display = v ? "none" : "";
        badge.style.display = v ? "none" : "";
      }
      const state = {
        setOpen, isOpen: () => isOpen,
        ensure(k) { if (!ul) setOpen(true); if (k >= shown) more(k); },
      };
      stateOf.set(nd, state);
      li._xvState = state;
      caret.addEventListener("click", () => setOpen(!isOpen));
      badge.addEventListener("click", () => setOpen(true));
      setOpen(depth < defaultDepth);
      return li;
    }

    tree.appendChild(renderNode(ast, null, 0, true));
    const ms = Date.now() - t0;
    stats.textContent = total.toLocaleString() + " values · " + XMLV.formatBytes(text.length) + " · " + ms + " ms";

    // ---------- expand / collapse ----------
    expandBtn.addEventListener("click", () => {
      const before = Date.now();
      for (let pass = 0; pass < 40 && rendered < EXPAND_CAP; pass++) {
        let any = false;
        for (const li of tree.querySelectorAll("li")) {
          if (rendered >= EXPAND_CAP) break;
          const st = li._xvState;
          if (st && !st.isOpen()) { st.setOpen(true); any = true; }
        }
        if (!any) break;
      }
      say(rendered >= EXPAND_CAP ? "Large document — expanded the first " + EXPAND_CAP.toLocaleString() + " values"
        : "Expanded (" + (Date.now() - before) + " ms)");
    });
    collapseBtn.addEventListener("click", () => {
      for (const li of tree.querySelectorAll("li")) if (li._xvState) li._xvState.setOpen(false);
      const top = stateOf.get(ast);
      if (top) top.setOpen(true);
    });

    // ---------- selection, path ----------
    let selectedLine = null;
    function segsOf(nd) {
      const segs = [];
      for (let p = parentOf.get(nd); p; p = parentOf.get(p[0])) segs.unshift(p[1]);
      return segs;
    }
    function select(nd) {
      const li = liOf.get(nd);
      if (!li) return;
      if (selectedLine) selectedLine.classList.remove("xv-selected");
      selectedLine = li.firstChild;
      selectedLine.classList.add("xv-selected");
      const p = XMLV.jsonPath(segsOf(nd));
      pathBox.textContent = "";
      pathBox.appendChild(el(doc, "bdi", null, p));
      pathBox.setAttribute("title", p);
      copyPath.textContent = "Copy path";
      copyPath.onclick = () => clip(p, "Path copied");
      copyVal.textContent = "Copy value";
      copyVal.onclick = () => clip(nd.t === "s" ? nd.v : nd.t === "n" ? nd.raw : XMLV.jsonPretty(nd), "Value copied");
    }

    function reveal(nd) {
      const chain = [nd];
      for (let p = parentOf.get(nd); p; p = parentOf.get(p[0])) chain.unshift(p[0]);
      for (let k = 0; k < chain.length - 1; k++) {
        const st = stateOf.get(chain[k]);
        if (!st) return;
        st.setOpen(true);
        st.ensure(parentOf.get(chain[k + 1])[2]);
      }
      const li = liOf.get(nd);
      if (!li) return;
      const line = li.firstChild;
      line.scrollIntoView({ block: "center" });
      line.classList.remove("xv-flash");
      void line.offsetWidth;
      line.classList.add("xv-flash");
      select(nd);
    }

    // ---------- search ----------
    let hits = [], hitIdx = -1;
    function runSearch() {
      const q = search.value.trim().toLowerCase();
      hits = []; hitIdx = -1;
      if (!q) { searchCount.textContent = ""; return; }
      (function walk(nd) {
        if (hits.length >= MAXHITS) return;
        if (nd.t === "o") {
          for (let k = 0; k < nd.vals.length && hits.length < MAXHITS; k++) {
            if (nd.keys[k].toLowerCase().includes(q)) hits.push(nd.vals[k]);
            else if (nd.vals[k].t !== "o" && nd.vals[k].t !== "a" && primText(nd.vals[k]).includes(q)) hits.push(nd.vals[k]);
            if (nd.vals[k].t === "o" || nd.vals[k].t === "a") walk(nd.vals[k]);
          }
        } else if (nd.t === "a") {
          for (let k = 0; k < nd.vals.length && hits.length < MAXHITS; k++) {
            const v = nd.vals[k];
            if (v.t === "o" || v.t === "a") walk(v);
            else if (primText(v).includes(q)) hits.push(v);
          }
        } else if (primText(nd).includes(q)) hits.push(nd);
      })(ast);
      searchCount.textContent = hits.length ? "1/" + hits.length + (hits.length >= MAXHITS ? "+" : "") : "0";
      if (hits.length) { hitIdx = 0; if (activeView !== "tree") showView("tree"); reveal(hits[0]); }
    }
    function primText(nd) {
      return nd.t === "s" ? nd.v.toLowerCase() : nd.t === "n" ? nd.raw.toLowerCase() : nd.t === "b" ? String(nd.v) : "null";
    }
    function step(d) {
      if (!hits.length) return;
      hitIdx = (hitIdx + d + hits.length) % hits.length;
      searchCount.textContent = (hitIdx + 1) + "/" + hits.length;
      if (activeView !== "tree") showView("tree");
      reveal(hits[hitIdx]);
    }
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (hits.length && search._q === search.value) step(e.shiftKey ? -1 : 1);
        else { runSearch(); search._q = search.value; }
      }
      if (e.key === "Escape") { search.value = ""; searchCount.textContent = ""; hits = []; search._q = ""; }
    });
    nextBtn.addEventListener("click", () => { if (!hits.length || search._q !== search.value) { runSearch(); search._q = search.value; } else step(1); });
    prevBtn.addEventListener("click", () => step(-1));

    // ---------- views ----------
    let prettyText = null;
    const getPretty = () => (prettyText !== null ? prettyText : (prettyText = XMLV.jsonPretty(ast)));
    treeBtn.addEventListener("click", () => showView("tree"));
    rawBtn.addEventListener("click", () => {
      if (activeView === "raw") { showView("tree"); return; }
      if (!raw.firstChild) renderRaw(getPretty());
      showView("raw");
    });
    copyBtn.addEventListener("click", () => clip(getPretty(), "Copied formatted JSON"));
    minBtn.addEventListener("click", () => clip(ast.lines ? XMLV.jsonToLines(ast) : XMLV.jsonMinify(ast), ast.lines ? "Copied as JSON Lines" : "Copied minified JSON"));
    dlBtn.addEventListener("click", () => {
      download(getPretty(), (opts.filename || "formatted") + ".json", "application/json");
      say("Downloading…");
    });

    // ---------- table ----------
    let tables = null, tableIdx = 0;
    function clearPanel() { while (panel.firstChild) panel.removeChild(panel.firstChild); }
    function renderTable() {
      if (!tables) tables = XMLV.findJsonTables(ast);
      clearPanel();
      if (!tables.length) {
        panel.appendChild(el(doc, "div", "xv-psub",
          "No list of records here — the table view needs an array of objects (for example [{\"id\":1,…},{\"id\":2,…}])."));
        showView("table");
        return;
      }
      const cand = tables[Math.min(tableIdx, tables.length - 1)];
      const t = XMLV.buildJsonTable(cand.node);
      const where = XMLV.jsonPath(cand.segs);

      const head = el(doc, "div", "xv-phead");
      head.appendChild(el(doc, "span", "xv-ptitle", where + " × " + cand.node.vals.length.toLocaleString()));
      head.appendChild(el(doc, "span", "xv-psub", t.columns.length + " columns"));
      let view = t.data.map((cells, i) => ({ cells, i }));
      const csvName = (opts.filename || "table") + (cand.segs.length ? "-" + String(cand.segs[cand.segs.length - 1]) : "") + ".csv";
      const csvBtn = el(doc, "button", "xv-btn", "Download CSV");
      csvBtn.addEventListener("click", () => {
        const a = el(doc, "a");
        a.setAttribute("download", csvName);
        a.setAttribute("href", "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURIComponent(XMLV.toCsv(t.columns, view.map((r) => r.cells))));
        panel.appendChild(a); a.click(); a.remove();
        say("CSV downloaded");
      });
      const copyCsvBtn = el(doc, "button", "xv-btn", "Copy CSV");
      copyCsvBtn.addEventListener("click", () => clip(XMLV.toCsv(t.columns, view.map((r) => r.cells)), "CSV copied"));
      head.appendChild(csvBtn); head.appendChild(copyCsvBtn);
      if (tables.length > 1) {
        head.appendChild(el(doc, "span", "xv-psub", "other lists:"));
        tables.forEach((c2, k) => {
          if (k === tableIdx) return;
          const chip = el(doc, "span", "xv-chip", XMLV.jsonPath(c2.segs) + " (" + c2.node.vals.length + ")");
          chip.addEventListener("click", () => { tableIdx = k; renderTable(); });
          head.appendChild(chip);
        });
      }
      panel.appendChild(head);

      let sortCol = -1, sortDir = 1;
      const table = el(doc, "table", "xv-grid");
      const thead = el(doc, "thead");
      const trh = el(doc, "tr");
      trh.appendChild(el(doc, "th", "xv-rowno", "#"));
      t.columns.forEach((c, ci) => {
        const th = el(doc, "th");
        th.appendChild(el(doc, "span", null, c));
        const caretEl = el(doc, "span", "xv-sort", "");
        th.appendChild(caretEl);
        th.addEventListener("click", () => {
          sortDir = sortCol === ci ? -sortDir : 1;
          sortCol = ci;
          const num = view.every((r) => r.cells[ci] === "" || !isNaN(Number(r.cells[ci])));
          view.sort((a, b) => {
            const x = a.cells[ci], y = b.cells[ci];
            return (num ? Number(x || 0) - Number(y || 0) : String(x).localeCompare(String(y))) * sortDir;
          });
          body();
          for (const s of thead.querySelectorAll(".xv-sort")) s.textContent = "";
          caretEl.textContent = sortDir > 0 ? " ▲" : " ▼";
        });
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);
      const tb = el(doc, "tbody");
      table.appendChild(tb);
      function body() {
        while (tb.firstChild) tb.removeChild(tb.firstChild);
        const MAX = 3000;
        view.slice(0, MAX).forEach((r, k) => {
          const tr = el(doc, "tr");
          tr.appendChild(el(doc, "td", "xv-rowno", String(k + 1)));
          r.cells.forEach((v) => {
            const td = el(doc, "td", v !== "" && !isNaN(Number(v)) ? "xv-num" : null, v);
            td.setAttribute("title", v);
            tr.appendChild(td);
          });
          tr.addEventListener("click", () => { showView("tree"); reveal(cand.node.vals[r.i]); });
          tb.appendChild(tr);
        });
        if (view.length > MAX) {
          const tr = el(doc, "tr");
          const td = el(doc, "td", "xv-psub", "… " + (view.length - MAX).toLocaleString() + " more rows (the CSV has all of them)");
          td.setAttribute("colspan", String(t.columns.length + 1));
          tr.appendChild(td); tb.appendChild(tr);
        }
      }
      body();
      panel.appendChild(table);
      showView("table");
    }
    tableBtn.addEventListener("click", () => {
      if (activeView === "table") { showView("tree"); return; }
      renderTable();
    });

    // ---------- keyboard ----------
    doc.addEventListener("keydown", (e) => {
      const a = doc.activeElement;
      if (e.key === "/" && a !== search && (!a || (a.tagName !== "TEXTAREA" && a.tagName !== "INPUT"))) {
        e.preventDefault(); search.focus();
      }
    });

    showView("tree");
    return api();

    function api() {
      return { setTheme(t) { theme = t; applyTheme(); }, root: rootEl, ast: () => ast };
    }
  }

  XMLV.buildJsonViewer = buildJsonViewer;
})(typeof globalThis !== "undefined" ? globalThis : this);
