/* Content script: take over raw XML documents with the tree viewer.
   Must never break a normal page — every path is guarded and any
   uncertainty means "do nothing". */
(function () {
  "use strict";
  const XMLV = self.XMLV;
  if (!XMLV) return;

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
      return base.replace(/\.[^.]+$/, "") || "document";
    } catch (e) { return "document"; }
  }

  let xml;
  try { xml = xmlSource(); } catch (e) { xml = null; }
  if (!xml || !XMLV.looksLikeXml(xml)) return;

  function boot(theme) {
    try {
      const H = "http://www.w3.org/1999/xhtml";
      const htmlEl = document.createElementNS(H, "html");
      const head = document.createElementNS(H, "head");
      const meta = document.createElementNS(H, "meta");
      meta.setAttribute("charset", "utf-8");
      const title = document.createElementNS(H, "title");
      title.textContent = filenameFromUrl() + " – XML Viewer";
      head.appendChild(meta); head.appendChild(title);
      const body = document.createElementNS(H, "body");
      body.setAttribute("style", "margin:0");
      htmlEl.appendChild(head); htmlEl.appendChild(body);
      document.replaceChild(htmlEl, document.documentElement);
      XMLV.buildViewer(document, body, xml, {
        theme: theme || "auto",
        filename: filenameFromUrl(),
        onTheme(t) { try { chrome.storage.sync.set({ theme: t }); } catch (e) {} },
      });
    } catch (e) { /* leave the page as-is */ }
  }

  try {
    chrome.storage.sync.get({ theme: "auto" }, (v) => boot(v && v.theme));
  } catch (e) { boot("auto"); }
})();
