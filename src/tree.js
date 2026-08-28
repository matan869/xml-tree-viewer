/* Shared viewer UI: builds the whole tree interface inside a container.
   Works in two hosts: the extension's viewer.html page and a content-script
   takeover of a raw XML document (an XMLDocument), so every element is
   created with an explicit XHTML namespace. No innerHTML with document data. */
(function (root) {
  "use strict";
  const H = "http://www.w3.org/1999/xhtml";
  const XMLV = root.XMLV = root.XMLV || {};

  const CSS = `
:root, .xv-root { --xv-bg:#ffffff; --xv-fg:#1f2430; --xv-dim:#6b7280; --xv-line:#e5e7eb;
  --xv-bar:#f8fafc; --xv-tag:#7c3aed; --xv-attr:#b45309; --xv-val:#047857; --xv-punc:#9ca3af;
  --xv-accent:#2563eb; --xv-flash:#fde68a; --xv-err-bg:#fef2f2; --xv-err:#b91c1c;
  --xv-badge:#eef2ff; --xv-badge-fg:#4338ca; --xv-hover:#f3f4f6; --xv-sel:#e0e7ff; }
.xv-root[data-xv-theme="dark"] { --xv-bg:#0f172a; --xv-fg:#e2e8f0; --xv-dim:#94a3b8; --xv-line:#1e293b;
  --xv-bar:#111c34; --xv-tag:#c4b5fd; --xv-attr:#fbbf24; --xv-val:#6ee7b7; --xv-punc:#64748b;
  --xv-accent:#60a5fa; --xv-flash:#78560c; --xv-err-bg:#3f1d1d; --xv-err:#fca5a5;
  --xv-badge:#1e2a4a; --xv-badge-fg:#a5b4fc; --xv-hover:#16223d; --xv-sel:#1f2f55; }
.xv-root { position:fixed; inset:0; display:flex; flex-direction:column; background:var(--xv-bg);
  color:var(--xv-fg); font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; z-index:2147483000; }
.xv-bar { display:flex; align-items:center; gap:8px; padding:7px 12px; background:var(--xv-bar);
  border-bottom:1px solid var(--xv-line); flex-wrap:wrap;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
.xv-brand { font-weight:700; font-size:13px; display:flex; align-items:center; gap:6px; white-space:nowrap; }
.xv-brand .xv-logo { color:var(--xv-accent); font-weight:800; }
.xv-in { background:var(--xv-bg); color:var(--xv-fg); border:1px solid var(--xv-line); border-radius:7px;
  padding:5px 9px; font:12px system-ui,sans-serif; outline:none; min-width:0; }
.xv-in:focus { border-color:var(--xv-accent); }
.xv-search { width:170px; } .xv-xpath { width:230px; }
.xv-btn { background:var(--xv-bg); color:var(--xv-fg); border:1px solid var(--xv-line); border-radius:7px;
  padding:5px 10px; font:12px system-ui,sans-serif; cursor:pointer; white-space:nowrap; }
.xv-btn:hover { border-color:var(--xv-accent); color:var(--xv-accent); }
.xv-btn[data-on="1"] { background:var(--xv-sel); border-color:var(--xv-accent); color:var(--xv-accent); }
.xv-count { color:var(--xv-dim); font:11px system-ui,sans-serif; min-width:52px; text-align:center; }
.xv-main { flex:1; overflow:auto; padding:10px 16px 40px; }
.xv-tree, .xv-tree ul { list-style:none; margin:0; padding:0; }
.xv-tree ul { padding-left:18px; border-left:1px solid var(--xv-line); margin-left:7px; }
.xv-line { padding:0 6px 0 2px; border-radius:5px; white-space:pre-wrap; word-break:break-word; }
.xv-line:hover { background:var(--xv-hover); }
.xv-line.xv-selected { background:var(--xv-sel); }
.xv-line.xv-flash { animation:xvflash 1.6s ease-out; }
@keyframes xvflash { 0%,45% { background:var(--xv-flash);} 100% { background:transparent;} }
.xv-caret { display:inline-block; width:14px; cursor:pointer; color:var(--xv-dim); user-select:none; text-align:center; }
.xv-caret:hover { color:var(--xv-accent); }
.xv-nocaret { display:inline-block; width:14px; }
.xv-tag { color:var(--xv-tag); } .xv-attr { color:var(--xv-attr); } .xv-val { color:var(--xv-val); }
.xv-punc { color:var(--xv-punc); } .xv-text { color:var(--xv-fg); }
.xv-comment { color:var(--xv-dim); font-style:italic; }
.xv-cdata { color:var(--xv-val); }
.xv-badge { background:var(--xv-badge); color:var(--xv-badge-fg); border-radius:9px; padding:0 7px;
  font:10px system-ui,sans-serif; margin:0 4px; cursor:pointer; }
.xv-more { color:var(--xv-accent); cursor:pointer; font:11px system-ui,sans-serif; }
.xv-raw { display:none; margin:0; font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace; white-space:pre; }
.xv-raw .xv-ln { color:var(--xv-punc); user-select:none; display:inline-block; width:3.5em; text-align:right; padding-right:10px; }
.xv-raw .xv-errline { background:var(--xv-err-bg); display:inline-block; width:100%; }
.xv-error { background:var(--xv-err-bg); color:var(--xv-err); padding:8px 16px;
  font:12.5px system-ui,sans-serif; border-bottom:1px solid var(--xv-line); }
.xv-status { display:flex; align-items:center; gap:10px; padding:5px 12px; border-top:1px solid var(--xv-line);
  background:var(--xv-bar); font:11.5px system-ui,sans-serif; color:var(--xv-dim); min-height:18px; }
.xv-path { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; direction:rtl; text-align:left; }
.xv-path bdi { direction:ltr; }
.xv-copylink { color:var(--xv-accent); cursor:pointer; white-space:nowrap; }
.xv-toast { position:fixed; bottom:44px; left:50%; transform:translateX(-50%); background:var(--xv-fg);
  color:var(--xv-bg); padding:7px 14px; border-radius:8px; font:12px system-ui,sans-serif;
  opacity:0; transition:opacity .2s; pointer-events:none; }
.xv-toast[data-show="1"] { opacity:.92; }
.xv-sep { width:1px; align-self:stretch; background:var(--xv-line); margin:0 2px; }
.xv-panel { display:none; }
.xv-phead { display:flex; align-items:center; gap:10px; margin:2px 0 12px; flex-wrap:wrap;
  font-family:system-ui,sans-serif; }
.xv-ptitle { font-weight:700; font-size:14px; }
.xv-psub { color:var(--xv-dim); font-size:12px; }
.xv-grid { border-collapse:collapse; width:100%; font-size:12.5px; }
.xv-grid th, .xv-grid td { border:1px solid var(--xv-line); padding:5px 9px; text-align:left;
  vertical-align:top; max-width:340px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.xv-grid th { position:sticky; top:0; background:var(--xv-bar); cursor:pointer; user-select:none;
  font-family:system-ui,sans-serif; z-index:1; white-space:nowrap; }
.xv-grid th:hover { color:var(--xv-accent); }
.xv-grid th .xv-sort { color:var(--xv-accent); }
.xv-grid tbody tr:nth-child(even) { background:var(--xv-hover); }
.xv-grid tbody tr:hover { background:var(--xv-sel); }
.xv-grid td.xv-num { text-align:right; font-variant-numeric:tabular-nums; }
.xv-rowno { color:var(--xv-punc); width:1%; text-align:right; }
.xv-json { font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace; white-space:pre; margin:0; }
.xv-chip { display:inline-block; background:var(--xv-badge); color:var(--xv-badge-fg);
  border-radius:6px; padding:2px 8px; margin:0 5px 5px 0; font:11.5px system-ui,sans-serif; cursor:pointer; }
.xv-chip:hover { background:var(--xv-accent); color:#fff; }
.xv-olist { font-size:12.5px; }
.xv-orow { display:flex; gap:10px; padding:3px 6px; border-radius:5px; cursor:pointer; align-items:baseline; }
.xv-orow:hover { background:var(--xv-hover); }
.xv-opath { color:var(--xv-tag); flex:0 0 auto; }
.xv-ocount { color:var(--xv-badge-fg); background:var(--xv-badge); border-radius:8px;
  padding:0 7px; font:10.5px system-ui,sans-serif; }
.xv-osample { color:var(--xv-dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
@media (max-width:760px){ .xv-xpath{width:140px} .xv-search{width:110px} }
`;

  function el(doc, tag, cls, text) {
    const e = doc.createElementNS(H, tag);
    if (cls) e.setAttribute("class", cls);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  const TRUNCATE = 260;

  function buildViewer(doc, container, xmlText, opts) {
    opts = opts || {};
    const indent = opts.indent || "  ";
    let theme = opts.theme || "auto";

    // ---------- frame ----------
    const rootEl = el(doc, "div", "xv-root");
    const style = el(doc, "style");
    style.textContent = CSS;
    rootEl.appendChild(style);

    const bar = el(doc, "div", "xv-bar");
    const brand = el(doc, "div", "xv-brand");
    brand.appendChild(el(doc, "span", "xv-logo", "</>"));
    brand.appendChild(el(doc, "span", null, "XML Viewer"));
    bar.appendChild(brand);
    bar.appendChild(el(doc, "div", "xv-sep"));

    const search = el(doc, "input", "xv-in xv-search");
    search.setAttribute("placeholder", "Search (/)");
    const searchCount = el(doc, "span", "xv-count", "");
    const prevBtn = btn("‹"), nextBtn = btn("›");
    bar.appendChild(search); bar.appendChild(searchCount); bar.appendChild(prevBtn); bar.appendChild(nextBtn);
    bar.appendChild(el(doc, "div", "xv-sep"));

    const xpath = el(doc, "input", "xv-in xv-xpath");
    xpath.setAttribute("placeholder", "XPath, e.g. //item[@id]");
    const xpathBtn = btn("Run");
    bar.appendChild(xpath); bar.appendChild(xpathBtn);
    bar.appendChild(el(doc, "div", "xv-sep"));

    const tableBtn = btn("Table"), jsonBtn = btn("JSON"), outlineBtn = btn("Structure");
    [tableBtn, jsonBtn, outlineBtn].forEach((b) => bar.appendChild(b));
    bar.appendChild(el(doc, "div", "xv-sep"));
    const expandBtn = btn("Expand all"), collapseBtn = btn("Collapse all"),
      rawBtn = btn("Raw"), copyBtn = btn("Copy"), dlBtn = btn("Download"), themeBtn = btn("◐");
    [expandBtn, collapseBtn, rawBtn, copyBtn, dlBtn, themeBtn].forEach((b) => bar.appendChild(b));
    rootEl.appendChild(bar);

    const errBox = el(doc, "div", "xv-error");
    errBox.style.display = "none";
    rootEl.appendChild(errBox);

    const main = el(doc, "div", "xv-main");
    const tree = el(doc, "ul", "xv-tree");
    const raw = el(doc, "pre", "xv-raw");
    const panel = el(doc, "div", "xv-panel");
    panel.style.display = "none";
    main.appendChild(tree); main.appendChild(raw); main.appendChild(panel);
    rootEl.appendChild(main);

    const status = el(doc, "div", "xv-status");
    const pathBox = el(doc, "div", "xv-path");
    const copyPath = el(doc, "span", "xv-copylink", "");
    const stats = el(doc, "span", null, "");
    status.appendChild(pathBox); status.appendChild(copyPath); status.appendChild(stats);
    rootEl.appendChild(status);

    const toast = el(doc, "div", "xv-toast");
    rootEl.appendChild(toast);
    container.appendChild(rootEl);

    function btn(label) { return el(doc, "button", "xv-btn", label); }
    let toastT;
    function say(msg) {
      toast.textContent = msg;
      toast.setAttribute("data-show", "1");
      clearTimeout(toastT);
      toastT = setTimeout(() => toast.removeAttribute("data-show"), 1600);
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

    // ---------- parse ----------
    const t0 = Date.now();
    const parsed = new root.DOMParser().parseFromString(xmlText, "text/xml");
    const perr = parsed.querySelector ? parsed.querySelector("parsererror") : null;

    if (perr) {
      const msg = (perr.textContent || "XML parse error").replace(/\s+/g, " ").trim().slice(0, 400);
      const loc = XMLV.parseErrorLocation(msg);
      errBox.textContent = "⚠ " + msg;
      errBox.style.display = "";
      tree.style.display = "none";
      raw.style.display = "block";
      renderRaw(xmlText, loc);
      rawBtn.style.display = expandBtn.style.display = collapseBtn.style.display = "none";
      tableBtn.style.display = jsonBtn.style.display = outlineBtn.style.display = "none";
      xpath.disabled = search.disabled = true;
      stats.textContent = XMLV.formatBytes(xmlText.length);
      wireCopyDownload(xmlText);
      return api();
    }

    const totalEls = parsed.getElementsByTagName("*").length;
    const BIG = totalEls > 4000;
    const defaultDepth = BIG ? 1 : totalEls > 400 ? 2 : 6;

    // ---------- tree rendering (children built lazily on expand) ----------
    const liOf = new WeakMap();     // xml element -> its <li>
    let rendered = 0;

    function shortValue(node) {
      // <tag>text</tag> or <tag><![CDATA[..]]></tag> -> render on one line.
      // RSS/Atom wrap nearly every field in CDATA, so inlining it matters.
      const kids = node.childNodes;
      if (kids.length === 0) return "";
      if (kids.length === 1 && (kids[0].nodeType === 3 || kids[0].nodeType === 4)) {
        return { text: kids[0].nodeValue, cdata: kids[0].nodeType === 4 };
      }
      return null;
    }

    function appendTag(line, node, closing, selfClose) {
      line.appendChild(el(doc, "span", "xv-punc", closing ? "</" : "<"));
      line.appendChild(el(doc, "span", "xv-tag", node.nodeName));
      if (!closing) {
        for (const a of node.attributes) {
          line.appendChild(el(doc, "span", null, " "));
          line.appendChild(el(doc, "span", "xv-attr", a.name));
          line.appendChild(el(doc, "span", "xv-punc", '="'));
          line.appendChild(el(doc, "span", "xv-val", a.value));
          line.appendChild(el(doc, "span", "xv-punc", '"'));
        }
      }
      line.appendChild(el(doc, "span", "xv-punc", selfClose ? "/>" : ">"));
    }

    function textSpan(value, cls) {
      const v = value;
      if (v.length <= TRUNCATE) return el(doc, "span", cls || "xv-text", v);
      const wrap = el(doc, "span", cls || "xv-text");
      const head = el(doc, "span", null, v.slice(0, TRUNCATE));
      const more = el(doc, "span", "xv-more", " …show all (" + XMLV.formatBytes(v.length) + ")");
      more.addEventListener("click", () => { head.textContent = v; more.remove(); });
      wrap.appendChild(head); wrap.appendChild(more);
      return wrap;
    }

    function renderNode(node, depth) {
      const li = el(doc, "li");
      const type = node.nodeType;

      if (type === 3) { // text
        if (/^\s*$/.test(node.nodeValue)) return null;
        const line = el(doc, "div", "xv-line");
        line.appendChild(el(doc, "span", "xv-nocaret"));
        line.appendChild(textSpan(node.nodeValue.trim()));
        li.appendChild(line);
        return li;
      }
      if (type === 8) { // comment
        const line = el(doc, "div", "xv-line");
        line.appendChild(el(doc, "span", "xv-nocaret"));
        line.appendChild(textSpan("<!-- " + node.nodeValue.trim() + " -->", "xv-comment"));
        li.appendChild(line);
        return li;
      }
      if (type === 4) { // CDATA
        const line = el(doc, "div", "xv-line");
        line.appendChild(el(doc, "span", "xv-nocaret"));
        line.appendChild(el(doc, "span", "xv-punc", "<![CDATA["));
        line.appendChild(textSpan(node.nodeValue, "xv-cdata"));
        line.appendChild(el(doc, "span", "xv-punc", "]]>"));
        li.appendChild(line);
        return li;
      }
      if (type === 7) { // processing instruction
        const line = el(doc, "div", "xv-line");
        line.appendChild(el(doc, "span", "xv-nocaret"));
        line.appendChild(el(doc, "span", "xv-punc", "<?" + node.target + " " + node.data + "?>"));
        li.appendChild(line);
        return li;
      }
      if (type !== 1) return null;

      rendered++;
      liOf.set(node, li);
      const line = el(doc, "div", "xv-line");
      li.appendChild(line);
      line.addEventListener("click", (e) => { if (e.target.className !== "xv-caret") select(node); });

      const simple = shortValue(node);
      if (simple !== null) {
        line.appendChild(el(doc, "span", "xv-nocaret"));
        const empty = simple === "";
        appendTag(line, node, false, empty);
        if (!empty) {
          if (simple.cdata) {
            line.appendChild(el(doc, "span", "xv-punc", "<![CDATA["));
            line.appendChild(textSpan(simple.text, "xv-cdata"));
            line.appendChild(el(doc, "span", "xv-punc", "]]>"));
          } else {
            line.appendChild(textSpan(simple.text.trim()));
          }
          appendTag(line, node, true);
        }
        return li;
      }

      // container element
      const caret = el(doc, "span", "xv-caret", "▾");
      line.appendChild(caret);
      appendTag(line, node, false);
      const childCount = node.children.length;
      const badge = el(doc, "span", "xv-badge", String(childCount));
      badge.setAttribute("title", childCount + " child element" + (childCount === 1 ? "" : "s"));
      const closeInline = el(doc, "span");   // "… </tag>" shown when collapsed
      closeInline.appendChild(el(doc, "span", "xv-punc", " … "));
      appendTag(closeInline, node, true);
      closeInline.style.display = "none";
      line.appendChild(badge);
      line.appendChild(closeInline);

      const closeLi = el(doc, "div", "xv-line");
      closeLi.appendChild(el(doc, "span", "xv-nocaret"));
      appendTag(closeLi, node, true);

      let ul = null;
      let open = false;

      function build() {
        ul = el(doc, "ul");
        for (const kid of node.childNodes) {
          const kli = renderNode(kid, depth + 1);
          if (kli) ul.appendChild(kli);
        }
        li.appendChild(ul);
        li.appendChild(closeLi);
      }
      function setOpen(v) {
        if (v && !ul) build();
        open = v;
        caret.textContent = v ? "▾" : "▸";
        if (ul) ul.style.display = v ? "" : "none";
        closeLi.style.display = v ? "" : "none";
        closeInline.style.display = v ? "none" : "";
        badge.style.display = v ? "none" : "";
      }
      li._xvSetOpen = setOpen;
      li._xvIsOpen = () => open;
      caret.addEventListener("click", () => setOpen(!open));
      badge.addEventListener("click", () => setOpen(true));
      setOpen(depth < defaultDepth);
      return li;
    }

    for (const kid of parsed.childNodes) {
      const li = renderNode(kid, 0);
      if (li) tree.appendChild(li);
    }
    stats.textContent = totalEls.toLocaleString() + " elements · " +
      XMLV.formatBytes(xmlText.length) + " · " + (Date.now() - t0) + " ms";

    // ---------- expand / collapse ----------
    const EXPAND_CAP = 60000;
    expandBtn.addEventListener("click", () => {
      const before = Date.now();
      let n = 0;
      (function walk(elm) {
        for (const li of elm.querySelectorAll("li")) {
          if (li._xvSetOpen && !li._xvIsOpen()) { li._xvSetOpen(true); if (++n + rendered > EXPAND_CAP) return; }
        }
      })(tree);
      // one more pass for children created during the first
      let guard = 0;
      while (guard++ < 30 && rendered < EXPAND_CAP) {
        let any = false;
        for (const li of tree.querySelectorAll("li")) {
          if (li._xvSetOpen && !li._xvIsOpen()) { li._xvSetOpen(true); any = true; }
          if (rendered > EXPAND_CAP) break;
        }
        if (!any) break;
      }
      if (rendered > EXPAND_CAP) say("Large file — expanded the first " + EXPAND_CAP.toLocaleString() + " nodes");
      else say("Expanded (" + (Date.now() - before) + " ms)");
    });
    collapseBtn.addEventListener("click", () => {
      for (const li of tree.querySelectorAll("li")) if (li._xvSetOpen) li._xvSetOpen(false);
      for (const kid of tree.children) if (kid._xvSetOpen) kid._xvSetOpen(true);
    });

    // ---------- raw view ----------
    let pretty = null;
    function renderRaw(text, errLoc) {
      raw.textContent = "";
      const lines = text.split("\n");
      const frag = doc.createDocumentFragment();
      const MAXL = 80000;
      for (let i = 0; i < lines.length && i < MAXL; i++) {
        const row = el(doc, "span", errLoc && errLoc.line === i + 1 ? "xv-errline" : null);
        row.appendChild(el(doc, "span", "xv-ln", String(i + 1)));
        row.appendChild(doc.createTextNode(lines[i] + "\n"));
        frag.appendChild(row);
      }
      if (lines.length > MAXL) frag.appendChild(doc.createTextNode("… (" + (lines.length - MAXL) + " more lines)"));
      raw.appendChild(frag);
    }
    rawBtn.addEventListener("click", () => {
      if (typeof activeView !== "undefined" && activeView === "raw") { showView("tree"); return; }
      if (pretty === null) { pretty = XMLV.prettyPrint(xmlText, { indent }); renderRaw(pretty); }
      showView("raw");
    });

    // ---------- copy / download ----------
    function wireCopyDownload(fallbackText) {
      copyBtn.addEventListener("click", async () => {
        const text = fallbackText !== undefined ? fallbackText
          : (pretty !== null ? pretty : (pretty = XMLV.prettyPrint(xmlText, { indent })));
        try { await root.navigator.clipboard.writeText(text); say("Copied formatted XML"); }
        catch (e) { say("Copy failed: " + e.message); }
      });
      dlBtn.addEventListener("click", () => {
        const text = fallbackText !== undefined ? fallbackText
          : (pretty !== null ? pretty : (pretty = XMLV.prettyPrint(xmlText, { indent })));
        const a = el(doc, "a");
        a.setAttribute("download", (opts.filename || "formatted") + ".xml");
        a.setAttribute("href", "data:application/xml;charset=utf-8," + encodeURIComponent(text));
        rootEl.appendChild(a); a.click(); a.remove();
        say("Downloading…");
      });
    }
    wireCopyDownload();

    // ---------- selection, path, copy-xpath ----------
    let selectedLine = null;
    function xpathFor(node) {
      const parts = [];
      let n = node;
      while (n && n.nodeType === 1) {
        let idx = 1;
        let sib = n.previousElementSibling;
        while (sib) { if (sib.nodeName === n.nodeName) idx++; sib = sib.previousElementSibling; }
        parts.unshift(n.nodeName + "[" + idx + "]");
        n = n.parentNode;
      }
      return "/" + parts.join("/");
    }
    function select(node) {
      const li = liOf.get(node);
      if (!li) return;
      if (selectedLine) selectedLine.classList.remove("xv-selected");
      selectedLine = li.firstChild;
      selectedLine.classList.add("xv-selected");
      const p = xpathFor(node);
      pathBox.textContent = "";
      const bdi = el(doc, "bdi", null, p);
      pathBox.appendChild(bdi);
      pathBox.setAttribute("title", p);
      copyPath.textContent = "Copy XPath";
      copyPath.onclick = async () => {
        try { await root.navigator.clipboard.writeText(p); say("XPath copied"); } catch (e) {}
      };
    }

    // ---------- reveal (used by search + xpath results) ----------
    function reveal(node) {
      let elNode = node.nodeType === 1 ? node : node.parentNode;
      if (node.nodeType === 2) elNode = node.ownerElement; // attribute
      const chain = [];
      for (let n = elNode; n && n.nodeType === 1; n = n.parentNode) chain.unshift(n);
      for (const n of chain) {
        const li = liOf.get(n);
        if (li && li._xvSetOpen && n !== elNode) li._xvSetOpen(true);
      }
      const li = liOf.get(elNode);
      if (!li) return;
      const line = li.firstChild;
      line.scrollIntoView({ block: "center" });
      line.classList.remove("xv-flash");
      void line.offsetWidth;
      line.classList.add("xv-flash");
      select(elNode);
    }

    // ---------- search ----------
    let hits = [], hitIdx = -1;
    function runSearch() {
      const q = search.value.trim().toLowerCase();
      hits = []; hitIdx = -1;
      if (!q) { searchCount.textContent = ""; return; }
      const MAXHITS = 2000;
      (function walk(n) {
        if (hits.length >= MAXHITS) return;
        if (n.nodeType === 1) {
          let match = n.nodeName.toLowerCase().includes(q);
          if (!match) for (const a of n.attributes) {
            if (a.name.toLowerCase().includes(q) || a.value.toLowerCase().includes(q)) { match = true; break; }
          }
          if (match) hits.push(n);
          for (const kid of n.childNodes) walk(kid);
        } else if (n.nodeType === 3 || n.nodeType === 4 || n.nodeType === 8) {
          if (n.nodeValue.toLowerCase().includes(q)) hits.push(n);
        }
      })(parsed.documentElement);
      searchCount.textContent = hits.length ? "1/" + hits.length + (hits.length >= MAXHITS ? "+" : "") : "0";
      if (hits.length) { hitIdx = 0; reveal(hits[0]); }
    }
    function step(d) {
      if (!hits.length) return;
      hitIdx = (hitIdx + d + hits.length) % hits.length;
      searchCount.textContent = (hitIdx + 1) + "/" + hits.length;
      reveal(hits[hitIdx]);
    }
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { if (hits.length && search._q === search.value) step(e.shiftKey ? -1 : 1); else { runSearch(); search._q = search.value; } }
      if (e.key === "Escape") { search.value = ""; searchCount.textContent = ""; hits = []; }
    });
    nextBtn.addEventListener("click", () => { if (!hits.length) { runSearch(); search._q = search.value; } else step(1); });
    prevBtn.addEventListener("click", () => step(-1));

    // ---------- xpath ----------
    function nsResolver(prefix) {
      if (!prefix) return null;
      const rootE = parsed.documentElement;
      if (prefix === "_" || prefix === "d") return rootE.namespaceURI || null;
      return rootE.lookupNamespaceURI(prefix) || rootE.getAttribute("xmlns:" + prefix) || null;
    }
    function runXPath() {
      const expr = xpath.value.trim();
      if (!expr) return;
      let res;
      try {
        res = parsed.evaluate(expr, parsed, nsResolver, 7 /* ORDERED_NODE_SNAPSHOT_TYPE */, null);
      } catch (e1) {
        try {
          const v = parsed.evaluate(expr, parsed, nsResolver, 0 /* ANY */, null);
          const out = v.resultType === 1 ? v.numberValue : v.resultType === 2 ? v.stringValue : v.booleanValue;
          say("Result: " + out);
          return;
        } catch (e2) { say("XPath error: " + (e2.message || e2).toString().slice(0, 120)); return; }
      }
      hits = [];
      for (let k = 0; k < res.snapshotLength && k < 2000; k++) hits.push(res.snapshotItem(k));
      hitIdx = -1;
      if (!hits.length) {
        const hasDefaultNs = !!parsed.documentElement.namespaceURI;
        searchCount.textContent = "0";
        say(hasDefaultNs ? "0 results — document has a default namespace; try //_:tag" : "0 results");
        return;
      }
      searchCount.textContent = "1/" + hits.length;
      hitIdx = 0; reveal(hits[0]);
      say(hits.length + " match" + (hits.length === 1 ? "" : "es"));
    }
    xpath.addEventListener("keydown", (e) => { if (e.key === "Enter") runXPath(); });
    xpathBtn.addEventListener("click", runXPath);

    // ---------- panels: Table / JSON / Structure ----------
    let activeView = "tree";
    function showView(v) {
      activeView = v;
      tree.style.display = v === "tree" ? "" : "none";
      raw.style.display = v === "raw" ? "block" : "none";
      panel.style.display = v === "tree" || v === "raw" ? "none" : "block";
      for (const [b, name] of [[rawBtn, "raw"], [tableBtn, "table"], [jsonBtn, "json"], [outlineBtn, "outline"]]) {
        b.setAttribute("data-on", v === name ? "1" : "0");
      }
    }
    function clearPanel() { while (panel.firstChild) panel.removeChild(panel.firstChild); }

    // --- Table view -------------------------------------------------------
    let groups = null, groupIdx = 0;
    function renderTable() {
      if (!groups) groups = XMLV.findRepeatingGroups(parsed, 2);
      clearPanel();
      if (!groups.length) {
        panel.appendChild(el(doc, "div", "xv-psub",
          "No repeating elements found — the table view needs at least two sibling elements with the same name."));
        showView("table");
        return;
      }
      const g = groups[Math.min(groupIdx, groups.length - 1)];
      const t = XMLV.buildTable(g);

      const head = el(doc, "div", "xv-phead");
      head.appendChild(el(doc, "span", "xv-ptitle", "<" + t.tag + "> × " + t.data.length));
      head.appendChild(el(doc, "span", "xv-psub", t.columns.length + " columns"));
      const csvBtn = el(doc, "button", "xv-btn", "Download CSV");
      csvBtn.addEventListener("click", () => {
        const csv = XMLV.toCsv(t.columns, view.map((r) => r.cells));
        const a = el(doc, "a");
        a.setAttribute("download", (opts.filename || "table") + "-" + t.tag + ".csv");
        a.setAttribute("href", "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURIComponent(csv));
        panel.appendChild(a); a.click(); a.remove();
        say("CSV downloaded");
      });
      const copyCsvBtn = el(doc, "button", "xv-btn", "Copy CSV");
      copyCsvBtn.addEventListener("click", async () => {
        try { await root.navigator.clipboard.writeText(XMLV.toCsv(t.columns, view.map((r) => r.cells))); say("CSV copied"); }
        catch (e) { say("Copy failed"); }
      });
      head.appendChild(csvBtn); head.appendChild(copyCsvBtn);
      if (groups.length > 1) {
        const pick = el(doc, "span", "xv-psub", "other groups:");
        head.appendChild(pick);
        groups.slice(0, 8).forEach((gg, i) => {
          const chip = el(doc, "span", "xv-chip", gg.tag + " (" + gg.rows.length + ")");
          chip.addEventListener("click", () => { groupIdx = i; renderTable(); });
          head.appendChild(chip);
        });
      }
      panel.appendChild(head);

      let view = t.data.map((cells, i) => ({ cells, i }));
      let sortCol = -1, sortDir = 1;
      const table = el(doc, "table", "xv-grid");
      const thead = el(doc, "thead");
      const trh = el(doc, "tr");
      trh.appendChild(el(doc, "th", "xv-rowno", "#"));
      t.columns.forEach((c, ci) => {
        const th = el(doc, "th");
        th.appendChild(el(doc, "span", null, c));
        const caret = el(doc, "span", "xv-sort", "");
        th.appendChild(caret);
        th.addEventListener("click", () => {
          sortDir = sortCol === ci ? -sortDir : 1;
          sortCol = ci;
          const num = view.every((r) => r.cells[ci] === "" || !isNaN(Number(r.cells[ci])));
          view.sort((a, b) => {
            const x = a.cells[ci], y = b.cells[ci];
            const c2 = num ? (Number(x || 0) - Number(y || 0)) : String(x).localeCompare(String(y));
            return c2 * sortDir;
          });
          body2();
          for (const el2 of thead.querySelectorAll(".xv-sort")) el2.textContent = "";
          caret.textContent = sortDir > 0 ? " ▲" : " ▼";
        });
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);
      const tb = el(doc, "tbody");
      table.appendChild(tb);
      function body2() {
        while (tb.firstChild) tb.removeChild(tb.firstChild);
        const MAX = 3000;
        view.slice(0, MAX).forEach((r, n) => {
          const tr = el(doc, "tr");
          tr.appendChild(el(doc, "td", "xv-rowno", String(n + 1)));
          r.cells.forEach((v) => {
            const td = el(doc, "td", v !== "" && !isNaN(Number(v)) ? "xv-num" : null, v);
            td.setAttribute("title", v);
            tr.appendChild(td);
          });
          tr.addEventListener("click", () => { showView("tree"); reveal(t.rows[r.i]); });
          tb.appendChild(tr);
        });
        if (view.length > MAX) {
          const tr = el(doc, "tr");
          const td = el(doc, "td", "xv-psub", "… " + (view.length - MAX) + " more rows (CSV export includes all)");
          td.setAttribute("colspan", String(t.columns.length + 1));
          tr.appendChild(td); tb.appendChild(tr);
        }
      }
      body2();
      panel.appendChild(table);
      showView("table");
    }
    tableBtn.addEventListener("click", () => {
      if (activeView === "table") { showView("tree"); return; }
      renderTable();
    });

    // --- JSON view --------------------------------------------------------
    let jsonText = null;
    jsonBtn.addEventListener("click", () => {
      if (activeView === "json") { showView("tree"); return; }
      if (jsonText === null) {
        try { jsonText = JSON.stringify(XMLV.docToJson(parsed), null, 2); }
        catch (e) { say("Conversion failed: " + e.message); return; }
      }
      clearPanel();
      const head = el(doc, "div", "xv-phead");
      head.appendChild(el(doc, "span", "xv-ptitle", "XML → JSON"));
      head.appendChild(el(doc, "span", "xv-psub", XMLV.formatBytes(jsonText.length)));
      const cp = el(doc, "button", "xv-btn", "Copy JSON");
      cp.addEventListener("click", async () => {
        try { await root.navigator.clipboard.writeText(jsonText); say("JSON copied"); } catch (e) { say("Copy failed"); }
      });
      const dl = el(doc, "button", "xv-btn", "Download .json");
      dl.addEventListener("click", () => {
        const a = el(doc, "a");
        a.setAttribute("download", (opts.filename || "document") + ".json");
        a.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(jsonText));
        panel.appendChild(a); a.click(); a.remove();
        say("Downloading JSON…");
      });
      head.appendChild(cp); head.appendChild(dl);
      panel.appendChild(head);
      const pre = el(doc, "pre", "xv-json");
      pre.textContent = jsonText.length > 400000 ? jsonText.slice(0, 400000) + "\n… (truncated for display; Copy/Download give the full document)" : jsonText;
      panel.appendChild(pre);
      showView("json");
    });

    // --- Structure outline + namespaces -----------------------------------
    outlineBtn.addEventListener("click", () => {
      if (activeView === "outline") { showView("tree"); return; }
      clearPanel();
      const head = el(doc, "div", "xv-phead");
      head.appendChild(el(doc, "span", "xv-ptitle", "Structure"));
      head.appendChild(el(doc, "span", "xv-psub", "every element path in this document — click to jump"));
      panel.appendChild(head);

      const ns = XMLV.namespaces(parsed);
      if (ns.length) {
        const nh = el(doc, "div", "xv-phead");
        nh.appendChild(el(doc, "span", "xv-psub", "Namespaces (click to copy an XPath prefix):"));
        for (const { prefix, uri } of ns) {
          const chip = el(doc, "span", "xv-chip", prefix + " → " + uri.replace(/^https?:\/\//, "").slice(0, 42));
          chip.setAttribute("title", uri);
          chip.addEventListener("click", async () => {
            const p2 = prefix === "(default)" ? "_" : prefix;
            xpath.value = "//" + p2 + ":";
            xpath.focus();
            say("Prefix inserted — " + (prefix === "(default)" ? "use _ for the default namespace" : prefix));
          });
          nh.appendChild(chip);
        }
        panel.appendChild(nh);
      }

      const rows = XMLV.outline(parsed).sort((a, b) => b.count - a.count || a.path.localeCompare(b.path));
      const list = el(doc, "div", "xv-olist");
      for (const r of rows.slice(0, 600)) {
        const row = el(doc, "div", "xv-orow");
        row.appendChild(el(doc, "span", "xv-ocount", String(r.count)));
        row.appendChild(el(doc, "span", "xv-opath", r.path));
        if (r.attrs.length) row.appendChild(el(doc, "span", "xv-psub", "@" + r.attrs.join(" @")));
        if (r.sample) row.appendChild(el(doc, "span", "xv-osample", r.sample));
        row.addEventListener("click", () => {
          xpath.value = "//" + r.path.split("/").pop();
          showView("tree");
          runXPath();
        });
        list.appendChild(row);
      }
      panel.appendChild(list);
      showView("outline");
    });

    // ---------- keyboard ----------
    doc.addEventListener("keydown", (e) => {
      if (e.key === "/" && doc.activeElement !== search && doc.activeElement !== xpath &&
          doc.activeElement.tagName !== "TEXTAREA" && doc.activeElement.tagName !== "INPUT") {
        e.preventDefault(); search.focus();
      }
    });

    function api() {
      return { setTheme(t) { theme = t; applyTheme(); }, root: rootEl };
    }
    return api();
  }

  XMLV.buildViewer = buildViewer;
  XMLV.viewerCss = CSS;
})(typeof globalThis !== "undefined" ? globalThis : this);
