# Chrome Web Store listing — XML Viewer

## Name (75 max, ~50 shown)
XML Viewer & Formatter: Tree, Table, JSON, E-Invoice

## Summary (132 max)
XML viewer & formatter: readable tree, sortable table, XML to JSON, CSV, XPath. Opens UBL, XRechnung, FatturaPA & camt.053 files.

## Category
Developer Tools

## Description
Most XML extensions make you open a popup and paste your file in — then show you the same tags you already had. This one just works: open any XML URL or file and it renders instantly, in the full browser window.

★ IT OPENS E-INVOICES AS ACTUAL INVOICES
Received an XML invoice you cannot read? Since the EU e-invoicing mandates (Germany 2025, Belgium and Poland 2026, France 2026-2027, Italy FatturaPA) millions of people get sent structured XML instead of a PDF. This extension recognises the format and lays it out as a normal invoice: supplier and customer, line items, VAT breakdown, totals, IBAN and payment terms — with a Print / Save as PDF button.
It reads the UBL 2.1, Peppol BIS (EN 16931), XRechnung, ZUGFeRD / Factur-X and FatturaPA layouts.

★ IT OPENS BANK STATEMENTS TOO
ISO 20022 camt.053 and camt.052 become a readable statement: opening and closing balance, money in, money out, and every transaction with counterparty, reference and date — exportable to CSV for your accounting software.

★ TABLE VIEW FOR ANY XML
Any XML with repeating elements — an RSS feed, a product feed, a sitemap — becomes a sortable table. Columns are built automatically from the child elements and attributes. Click a header to sort, click a row to jump back to that node.

★ EXPORT TO CSV · XML → JSON · STRUCTURE OUTLINE
One click turns a table into CSV for Excel or Google Sheets. Convert the whole document to clean JSON and copy or download it. Or get the structure outline: every element path with its count, attributes and a sample value, for the 40,000-line file nobody documented.

BUILT FROM THE COMPLAINTS ABOUT EVERY OTHER XML EXTENSION
• "It only shows the raw text, same as Notepad." — Here you get a real tree: fold a 10,000-row file to one line, colour-coded tags, attributes and values, child counts on every node.
• "It doesn't work on XML URLs, only files I paste in." — This renders XML served from any URL automatically: API responses, feeds, sitemaps, SOAP. Also local file:// files (switch on "Allow access to file URLs") and drag-and-drop.
• "No full screen, too much scrolling on big files." — It takes the whole window and renders lazily, so multi-megabyte documents open in milliseconds instead of freezing the tab.
• "Everything is collapsed and there's no way to open it all." — Expand all and Collapse all, always one click away.
• "The format button does nothing." — Every control is covered by an automated test suite that runs against real live feeds before each release.

EVERYTHING ELSE
• XPath search: //item[@id], count(//row), namespace-aware
• Full-text search across tags, attributes and text, with next / previous
• Pretty print and Raw view with line numbers; copy or download the formatted XML
• Click any node to copy its exact XPath
• Parse errors shown with the broken line highlighted, instead of a blank page
• Dark mode: auto, light or dark
• Right-to-left aware: Hebrew and Arabic values display correctly

NO TRACKING. NO INJECTED ADS. EVER.
This extension makes zero network requests. Your invoices and bank statements never leave your computer. It cannot show you a popup on a shopping page, cannot touch your affiliate links, cannot see the sites you visit. It reads XML and nothing else. The only stored setting is your light/dark preference.

Do not take our word for it — the entire source code is public:
https://github.com/matan869/xml-tree-viewer

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
- Screenshots (1280×800): store-assets/n1-invoice.png, n2-statement.png, n3-table.png, n4-tree-dark.png, n5-json.png
- Small promo tile 440×280: store-assets/promo-440x280.png

## Search-relevant phrasing already in description
xml viewer, xml formatter, xml tree, pretty print xml, open xml file, view xml, xpath, rss viewer, sitemap viewer, e-invoice xml
