# Chrome Web Store listing — XML Viewer & Formatter

## Name (45 max)
XML Viewer & Formatter – Tree, XPath

## Summary (132 max)
Opens XML as a collapsible tree: pretty print, XPath, search, dark mode. Works offline on web & local files. Free, no tracking.

## Category
Developer Tools

## Description
Tired of XML looking like a wall of text? This extension turns any XML file into a clean, collapsible, syntax-highlighted tree — automatically, the moment you open it.

WHAT IT DOES
• Automatically renders XML pages (feeds, sitemaps, APIs, config files) as an interactive tree
• Collapsible nodes with child counts — fold a 10,000-row file to one line
• XPath search: //item[@id], count(//row), namespace-aware
• Full-text search across tags, attributes and text, with next/previous
• Pretty print & Raw view with line numbers — copy or download the formatted XML
• Click any node → Copy its exact XPath
• Clear parse errors with the broken line highlighted
• Dark mode (auto / light / dark)
• Handles huge files: lazy rendering keeps multi-MB documents smooth

WORKS EVERYWHERE
• XML from the web: RSS, Atom, sitemaps, SOAP/WSDL, XSD schemas, GPX, KML, plist
• E-invoices: UBL, FatturaPA, XRechnung, Peppol — open the XML your accountant sent you and actually read it
• Local files: file:// URLs (enable "Allow access to file URLs"), or drag & drop / paste into the built-in viewer page

PRIVATE BY DESIGN
Everything runs 100% locally in your browser. No network requests, no analytics, no account, no tracking — ever. The extension is open source:
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
