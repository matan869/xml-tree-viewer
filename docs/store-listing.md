# Chrome Web Store listing — JSON & XML Viewer

Source of truth for the console's Store listing and Privacy tabs. The Name and Summary are
read-only in the console: they come from `manifest.json` (`name`, `description`).

Store policy treats a bare list of formats or synonyms as keyword spam, so every format name below
sits inside a sentence about the feature that reads it. Keep it that way.

## Name (manifest `name`, 75 max)
JSON & XML Viewer and Formatter

## Summary (manifest `description`, 132 max)
Formats JSON and XML as a collapsible tree, a sortable table or raw text. No ads, no tracking, zero network requests. Open source.

## Category
Developer Tools

## Description
Open any JSON or XML URL and it is formatted at once, in the full browser window: a collapsible tree, a sortable table, or raw text with line numbers. Nothing to paste, no popup to open, no ads, no tracking.

★ JSON EXACTLY AS IT WAS SENT
Most viewers run JSON through the browser's own parser, which quietly rounds every integer above 9,007,199,254,740,991. A 19-digit order, user or message id loses its last digits, and you copy the wrong number. This viewer reads the text itself: big ids stay exact, decimals keep the spelling they were sent with, keys stay in their original order, and a duplicated key is shown instead of silently dropped.

★ LISTS OF RECORDS BECOME A TABLE
When a response holds a list of records (users, orders, products, events), the Table button lays it out as columns. Nested fields get their own columns, such as user.address.city, numbers sort as numbers, and Download CSV or Copy CSV hands the table to Excel or Google Sheets. Click a row to jump to that record in the tree.

★ BROKEN JSON? IT SAYS WHERE, AND WHY
Instead of a blank page or "Unexpected token", you get the line, the column and the reason in plain words: a missing comma, a trailing comma, single quotes, a comment, Python's True or None, an unclosed bracket. The full text is shown with the broken line highlighted.

★ FIND ANYTHING, COPY THE PATH
Search keys and values at once (press / to start) and step through the matches with Enter. Click any value to see its path, such as $.data[3].email, then copy the path or the value. Links inside the data are clickable. Copy the whole document formatted or minified, or download it.

★ BIG RESPONSES DON'T FREEZE THE TAB
Large documents open folded to a sensible depth and long lists render 500 items at a time, so multi-megabyte responses stay responsive. A file of JSON Lines, one record per line, opens as a single list, and the anti-hijacking prefix some APIs put before their JSON, like )]}', is skipped and mentioned.

★ XML GETS THE SAME CARE
XML pages open as a colour-coded tree with child counts on every node, XPath search (//item[@id], count(//row)), full-text search, and a sortable table for any repeating element, such as the items of an RSS feed or the URLs of a sitemap. Convert a document to JSON, export a table to CSV, or get the structure outline: every element path with its count and a sample value.

★ E-INVOICES AND BANK STATEMENTS, AS DOCUMENTS
Received an XML invoice you cannot read? Since the EU e-invoicing mandates (Germany 2025, Belgium and Poland 2026, France 2026-2027, Italy FatturaPA), millions of people get structured XML instead of a PDF. The viewer recognises the format and lays it out as a normal invoice: supplier and customer, line items, VAT breakdown, totals, IBAN and payment terms, with a Print / Save as PDF button. It reads the UBL 2.1, Peppol BIS (EN 16931), XRechnung, ZUGFeRD / Factur-X and FatturaPA layouts. ISO 20022 camt.053 and camt.052 bank statements become a readable statement with every transaction, exportable to CSV.

★ WORKS WHERE YOU NEED IT
It formats JSON and XML served from any URL: API responses, feeds, config files, SOAP. Local files open too once you switch on "Allow access to file URLs" for the extension, and the toolbar button opens a page where you can drop a file or paste text. Dark mode follows your system, or stays light or dark. Already use another JSON tool? Switch off automatic JSON formatting in the toolbar popup and keep the rest.

NO TRACKING. NO INJECTED ADS. EVER.
This extension makes zero network requests. Your API responses, invoices and bank statements never leave your computer. It contains no code that shows popups on shopping pages, rewrites affiliate links or records the sites you visit: it formats JSON and XML pages and does nothing else. The only stored settings are your theme and the JSON on/off switch.

Do not take our word for it — the entire source code is public:
https://github.com/matan869/xml-tree-viewer

Free and open source (MIT). If it saves you time, a rating helps other people find it.

## Privacy policy URL
https://github.com/matan869/xml-tree-viewer/blob/master/PRIVACY.md

## Single purpose description
Display raw JSON and XML documents (from the web or local files) as a readable, collapsible, searchable tree, with formatting tools.

## Permission justifications
- storage: Saves two preferences locally: the theme (auto/light/dark) and whether JSON pages are formatted automatically.
- Host access (*://*/*, file:///*): The content script must run on any URL to detect whether the response is a raw JSON or XML document; it renders only those and leaves every other page untouched. No data is read from other pages and nothing is transmitted anywhere.
- Remote code: none. All code is packaged.

## Data usage disclosures
Collects nothing. All checkboxes "No". Certify no data collected/transferred.

## Assets
- Icon 128: icons/icon128.png (drawn by `store-assets/make-icons.mjs`)
- Screenshots (1280×800), in this order: store-assets/v2/shot-1-json-tree.png, shot-2-json-table.png,
  shot-3-json-error.png, shot-4-xml-tree.png, shot-5-e-invoice.png (`store-assets/make-shots.mjs`)
- Small promo tile 440×280: store-assets/promo-440x280.png (`store-assets/make-promo.mjs`)
- Marquee promo tile 1400×560: store-assets/v2/marquee-1400x560.png (`store-assets/make-promo.mjs`)
- v1 screenshots (n1-n5, screenshot-*-1280x800.png) are kept for history only.

## Search-relevant phrasing already in description
json viewer, json formatter, format json, pretty print json, json to csv, json table, invalid json,
big numbers, xml viewer, xml formatter, xml tree, xpath, rss viewer, sitemap viewer, e-invoice xml
