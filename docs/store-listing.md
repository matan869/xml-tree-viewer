# Chrome Web Store listing — XML Viewer & Formatter

## Name (45 max)
XML Viewer & Formatter – Tree, XPath

## Summary (132 max)
XML as a collapsible tree, a sortable table, or JSON. XPath, CSV export, pretty print, dark mode. Offline, free, no tracking.

## Category
Developer Tools

## Description
Most XML extensions make you open a popup and paste your file in — then show you the same tags you already had. This one just works: open any XML URL or file, and it renders instantly as a collapsible, colour-coded tree in the full browser window. Nothing to paste. Nothing to click.

Then it does four things no other XML extension does.

★ TABLE VIEW
Any XML with repeating elements — an RSS feed, a product feed, a sitemap, an invoice's line items — becomes a real sortable table. Columns are built automatically from the child elements and attributes. Click a header to sort, click a row to jump straight back to that node in the tree.

★ EXPORT TO CSV
One click turns that table into a CSV for Excel or Google Sheets. Finally read the XML your supplier, bank or accountant sent you.

★ XML → JSON
Convert the whole document to clean JSON and copy or download it. Repeated tags become arrays, attributes become @name.

★ STRUCTURE OUTLINE
For a 40,000-line file nobody documented: every element path with its occurrence count, its attributes and a sample value. Click any path to jump to it. Declared namespaces are listed too, and one click drops the right prefix into the XPath box.

BUILT FROM THE COMPLAINTS ABOUT EVERY OTHER XML EXTENSION
• "It only shows the raw text, same as Notepad." — Here you get a real tree: fold a 10,000-row file to one line, colour-coded tags, attributes and values, child counts on every node.
• "It doesn't work on XML URLs, only on files I paste in." — This renders XML served from any URL automatically: API responses, feeds, sitemaps, SOAP. Also local file:// files (switch on "Allow access to file URLs") and drag-and-drop.
• "No full screen, too much scrolling on big files." — It takes the whole window, and rendering is lazy, so multi-megabyte documents open in milliseconds instead of freezing the tab.
• "Everything is collapsed and there's no way to open it all." — Expand all and Collapse all, always one click away.
• "The format button does nothing." — Every control is covered by an automated test suite that runs against real live feeds before each release.

EVERYTHING ELSE
• XPath search: //item[@id], count(//row), namespace-aware
• Full-text search across tags, attributes and text, with next / previous
• Pretty print and Raw view with line numbers; copy or download the formatted XML
• Click any node to copy its exact XPath
• Parse errors shown with the broken line highlighted, instead of a blank page
• Dark mode: auto, light or dark

NO TRACKING. NO INJECTED ADS. EVER.
This extension makes zero network requests. It cannot show you a popup on a shopping page, cannot touch your affiliate links, cannot see the sites you visit. It reads XML documents and nothing else. The only stored setting is your light/dark preference.

Do not take our word for it — the entire source code is public:
https://github.com/matan869/xml-tree-viewer

WORKS WITH
RSS and Atom feeds, sitemaps, SOAP and WSDL, XSD schemas, GPX, KML, plist, OPML, and e-invoice formats including UBL, FatturaPA, XRechnung and Peppol.

Free forever, MIT licensed. If it saves you time, a rating helps other people find it.

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
