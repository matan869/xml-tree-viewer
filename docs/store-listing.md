# Chrome Web Store listing — XML Viewer & Formatter

## Name (45 max)
XML Viewer & Formatter – Tree, XPath

## Summary (132 max)
XML as a collapsible tree, a sortable table, or JSON. XPath, CSV export, pretty print, dark mode. Offline, free, no tracking.

## Category
Developer Tools

## Description
Tired of XML looking like a wall of text? This extension turns any XML file into a clean, collapsible, syntax-highlighted tree — automatically, the moment you open it. Then it does four things no other XML extension does.

★ TABLE VIEW — the one you'll actually use
Any XML with repeating elements (an RSS feed, a product feed, a sitemap, an invoice's line items) becomes a real sortable table. Columns are built from the child elements and attributes, click a header to sort, click a row to jump back to that node in the tree.

★ EXPORT TO CSV
One click turns that table into a CSV you can open in Excel or Google Sheets. Finally read the XML your supplier, bank or accountant sent you.

★ XML → JSON
Convert the whole document to clean JSON, then copy or download it. Repeated tags become arrays, attributes become @name.

★ STRUCTURE OUTLINE
For a 40,000-line file nobody documented: every element path with its occurrence count, attributes and a sample value. Click any path to jump straight to it. Declared namespaces are listed too, and one click drops the right prefix into the XPath box.

EVERYTHING ELSE
• Collapsible tree with child counts, lazy-rendered so multi-MB files stay fast
• XPath search: //item[@id], count(//row), namespace-aware
• Full-text search across tags, attributes and text with next/previous
• Pretty print / Raw view with line numbers; copy or download formatted XML
• Click any node to copy its exact XPath
• Parse errors shown with the broken line highlighted
• Dark mode (auto / light / dark)

WORKS EVERYWHERE
• XML from the web: RSS, Atom, sitemaps, SOAP/WSDL, XSD schemas, GPX, KML, plist
• E-invoices: UBL, FatturaPA, XRechnung, Peppol
• Local files: file:// URLs (enable "Allow access to file URLs"), or drag & drop / paste into the built-in viewer page

PRIVATE BY DESIGN
Everything runs 100% locally in your browser. No network requests, no analytics, no account, no tracking — ever. Open source:
https://github.com/matan869/xml-tree-viewer

Free forever. If it saves you time, a rating helps others find it.

## Privacy policy URL
https://github.com/matan869/xml-tree-viewer/blob/master/PRIVACY.md

## Single purpose description
Render XML documents (from the web or local files) as a readable, collapsible, searchable tree with formatting tools.

## Permission justifications
- storage: Saves the user's theme preference (auto/light/dark) locally.
- Host access (*://*/*, file:///*): The content script must run on any URL to detect whether the response is a raw XML document; it renders only raw XML pages and leaves every other page untouched. No data is read from non-XML pages and nothing is transmitted anywhere.
- Remote code: none. All code is packaged.

## Data usage disclosures
Collects nothing. All checkboxes "No". Certify no data collected/transferred.

## Assets
- Icon 128: icons/icon128.png
- Screenshots (1280×800): store-assets/shot1-tree-light.png, shot2-tree-dark.png, shot3-raw-dark.png, shot4-landing.png
- Small promo tile 440×280: store-assets/promo-440x280.png

## Search-relevant phrasing already in description
xml viewer, xml formatter, xml tree, pretty print xml, open xml file, view xml, xpath, rss viewer, sitemap viewer, e-invoice xml
