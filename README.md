# XML Viewer & Formatter – Tree, XPath

A fast, private XML viewer for Chrome. Open any XML file — from the web or your
disk — and get a collapsible syntax-highlighted tree instead of a wall of text.

**[Install from the Chrome Web Store](https://chromewebstore.google.com/)** *(link added after review)*

## Features

- **Collapsible tree** with child counts, lazy-rendered so 10 MB+ files stay fast
- **XPath search** (`//item[@id]`, `count(//row)`, namespace-aware — use `//_:tag` for default namespaces)
- **Text search** across tags, attributes and text, with next/previous navigation
- **Pretty print / Raw view** with line numbers; copy or download the formatted XML
- **Copy XPath** of any node with one click
- **Parse errors** shown with the exact line highlighted
- **Dark mode** (auto / light / dark)
- **Local files**: works on `file://` URLs (enable "Allow access to file URLs" in the
  extension settings) and via drag & drop / paste in the built-in viewer page
- Handles RSS, Atom, XSD, WSDL, GPX, KML, plist, SVG-as-XML, e-invoice XML (UBL,
  FatturaPA, XRechnung), and any other XML dialect

## Privacy

Everything runs locally in your browser. No network requests, no analytics, no
tracking, no account. The only permission besides page access is `storage`, used
to remember your theme choice. See [PRIVACY.md](PRIVACY.md).

XSLT-styled XML pages and standalone SVG images are deliberately left untouched.

## Development

No build step — plain JS, loadable as an unpacked extension.

```
node tests/run.mjs   # unit tests (formatter, tokenizer)
node tests/ui.mjs    # UI tests (Playwright)
node tests/e2e.mjs   # full extension test in real Chromium
python3 build.py     # produce build/xml-viewer-vX.Y.Z.zip for the stores
```

## License

MIT
