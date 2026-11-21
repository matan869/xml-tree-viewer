/* Content script: take over raw JSON and XML documents with the viewer.
   Must never break a normal page — every path is guarded, any uncertainty
   means "do nothing", and a failed takeover puts the original page back. */
(function () {
  "use strict";
  const XMLV = self.XMLV;
  if (!XMLV) return;

  // ---------- JSON ----------
  // application/json, text/json, anything+json (ld, geo, problem, vnd.*),
  // JSON Lines / NDJSON / json-seq.
  const JSON_CT = /^(application|text)\/(?:[\w.-]+\+)?(?:x-)?(?:nd)?json(?:l|-seq|lines)?$/;
  const JSON_MAX = 50 * 1048576;        // a response typed as JSON
  const PLAIN_JSON_MAX = 10 * 1048576;  // text/plain that turns out to be JSON

  function jsonSource() {
    const ct = (document.contentType || "").toLowerCase();
    const typed = JSON_CT.test(ct);
    if (!typed && ct !== "text/plain") return null;
    // Chrome shows a text response as <body><pre>…</pre></body>, newer builds
    // add their own "pretty-print" strip next to it. Anything else = a real page.
    if (!(document instanceof HTMLDocument) || !document.body) return null;
    let pre = null;
    for (const c of document.body.children) {
      if (c.tagName === "PRE" && !pre) { pre = c; continue; }
      if (/json-formatter/i.test(c.className || "")) continue;
      return null;
    }
    if (!pre) return null;
    const text = pre.textContent;
    if (!text || text.length > (typed ? JSON_MAX : PLAIN_JSON_MAX)) return null;
    if (typed) return { text, ast: null };   // invalid JSON still opens: the viewer shows where it breaks
    if (!XMLV.looksLikeJson(text)) return null;
    try { return { text, ast: XMLV.parseJson(text) }; } catch (e) { return null; }
  }

  // ---------- XML ----------
  function xmlSource() {
    const ct = (document.contentType || "").toLowerCase();

    // Chrome's built-in "no style information" XML view keeps the original
    // document inside this element. Most reliable source when present.
    const srcDiv = document.getElementById("webkit-xml-viewer-source-xml");
    if (srcDiv) {
      const s = new XMLSerializer();
      let out = "";
      for (const n of srcDiv.childNodes) out += s.serializeToString(n);
      return out;
    }

    // SVG served standalone renders as an image; XHTML is a web page. Skip both.
    if (ct === "image/svg+xml" || ct === "application/xhtml+xml") return null;

    const isXmlCt = ct === "text/xml" || ct === "application/xml" || /\+xml$/.test(ct);

    if (isXmlCt && document instanceof XMLDocument) {
      // An XML doc Chrome DID style (xml-stylesheet/XSLT output) renders as a
      // real page — leave those alone. Heuristic: the built-in viewer path was
      // already handled above, so only take over docs with no linked style.
      for (const n of document.childNodes) {
        if (n.nodeType === 7 && n.target === "xml-stylesheet") return null;
      }
      return new XMLSerializer().serializeToString(document);
    }

    // .xml served as text/plain (common on file:// and misconfigured servers):
    // body is one big text blob.
    if ((ct === "text/plain" || ct === "") &&
        /\.(xml|rss|atom|xsd|xsl|xslt|wsdl|gpx|kml|plist|svg|opml|dae|csproj|config|nfo|xliff|tmx|musicxml)([?#]|$)/i
          .test(location.pathname) &&
        document.body && document.body.children.length <= 1 &&
        XMLV.looksLikeXml(document.body.textContent)) {
      return document.body.textContent;
    }
    return null;
  }

  function filenameFromUrl() {
    try {
      const p = decodeURIComponent(location.pathname);
      const base = p.slice(p.lastIndexOf("/") + 1);
      return base.replace(/\.[^.]+$/, "") || location.hostname || "document";
    } catch (e) { return "document"; }
  }

  let found = null;
  try { const j = jsonSource(); if (j) found = { kind: "json", text: j.text, ast: j.ast }; } catch (e) { found = null; }
  if (!found) {
    let xml = null;
    try { xml = xmlSource(); } catch (e) { xml = null; }
    if (xml && XMLV.looksLikeXml(xml)) found = { kind: "xml", text: xml };
  }
  if (!found) return;

  function freshBody(titleText) {
    const H = "http://www.w3.org/1999/xhtml";
    const htmlEl = document.createElementNS(H, "html");
    const head = document.createElementNS(H, "head");
    const meta = document.createElementNS(H, "meta");
    meta.setAttribute("charset", "utf-8");
    const title = document.createElementNS(H, "title");
    title.textContent = titleText;
    head.appendChild(meta); head.appendChild(title);
    const body = document.createElementNS(H, "body");
    htmlEl.appendChild(head); htmlEl.appendChild(body);
    document.replaceChild(htmlEl, document.documentElement);
    return body;
  }

  function boot(settings) {
    if (found.kind === "json" && settings && settings.json === false) return;   // switched off in the popup
    const theme = (settings && settings.theme) || "auto";
    const onTheme = (t) => { try { chrome.storage.sync.set({ theme: t }); } catch (e) {} };
    const original = document.documentElement;
    const name = filenameFromUrl();
    try {
      if (found.kind === "json") {
        const body = freshBody(name + " – JSON Viewer");
        XMLV.buildJsonViewer(document, body, found.text, { theme, filename: name, ast: found.ast, onTheme });
      } else {
        const body = freshBody(name + " – XML Viewer");
        body.setAttribute("style", "margin:0");
        XMLV.buildViewer(document, body, found.text, { theme, filename: name, onTheme });
      }
    } catch (e) {
      try { if (document.documentElement !== original) document.replaceChild(original, document.documentElement); } catch (e2) {}
    }
  }

  try {
    chrome.storage.sync.get({ theme: "auto", json: true }, (v) => boot(v));
  } catch (e) { boot(null); }
})();
