# JSON & XML Viewer and Formatter

A fast, private JSON and XML viewer for Chrome. Open any JSON or XML document — from the
web or your disk — and get a collapsible, searchable tree, a sortable table or raw text
instead of a wall of text.

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/imdmebimekmeonolgkcghkbhahiaoibm)**

## JSON

- **Exact numbers**: its own parser keeps big integers (19-digit ids), decimal spelling,
  key order and duplicate keys exactly as sent — `JSON.parse` rounds anything above 2^53
- **Collapsible tree** with lazy rendering: long arrays show 500 items at a time
- **Table view** for arrays of records: nested fields flattened to dotted columns,
  numeric sort, CSV download / copy, click a row to jump to it in the tree
- **Errors in plain words** with line and column ("Missing comma before "features"")
  and the broken line highlighted
- **Search** keys and values (`/` to focus, Enter / Shift+Enter to step), **copy path**
  (`$.data[3]["first name"]`) and **copy value**, clickable links
- JSON Lines read as one list; anti-XSSI prefixes (`)]}'`, `while(1);`) skipped
- Copy formatted or minified, download; switch automatic JSON formatting off in the popup

## XML

- **Collapsible tree** with child counts, lazy-rendered so 10 MB+ files stay fast
- **XPath search** (`//item[@id]`, `count(//row)`, namespace-aware — use `//_:tag` for default namespaces)
- **Table view** for repeating elements (RSS items, sitemap URLs, product feeds), CSV export
- **XML → JSON**, structure outline, copy XPath of any node
- **E-invoices and bank statements** rendered as documents: UBL 2.1 / Peppol BIS,
  XRechnung, ZUGFeRD / Factur-X, FatturaPA, ISO 20022 camt.053 / camt.052
- XSLT-styled XML pages and standalone SVG images are deliberately left untouched

## Both

- **Raw view** with line numbers; **dark mode** (auto / light / dark)
- **Local files**: works on `file://` URLs (enable "Allow access to file URLs" in the
  extension settings) and via drag & drop / paste in the built-in viewer page

## Privacy

Everything runs locally in your browser. No network requests, no analytics, no
tracking, no account. The only permission besides page access is `storage`, used
to remember the theme and the JSON on/off switch. See [PRIVACY.md](PRIVACY.md).

## Development

No build step — plain JS, loadable as an unpacked extension.

```
node tests/json.mjs      # JSON parser unit tests
node tests/jsonui.mjs    # JSON viewer UI tests (Playwright)
node tests/run.mjs       # XML unit tests (formatter, tokenizer)
node tests/ui.mjs        # XML viewer UI tests (Playwright)
node tests/e2e.mjs       # full extension test in real Chromium
python3 build.py         # produce build/xml-viewer-vX.Y.Z.zip for the stores
```

## License

MIT
