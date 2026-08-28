# What the competitors' reviewers actually complain about

Pulled from every review on the Chrome Web Store, 2026-08-28. This is the
source for the store description; each bullet in the listing answers one of
these verbatim complaints.

## XML Viewer — 200,000 users, 2.1 stars, 252 ratings

The single most repeated complaint, in ~12 separate reviews: **it is no better
than a text editor.**
- "useless - notepad does the same" (4 found helpful)
- "No better than text editor like Notepad++" (3)
- "Completely useless. Just use your favorite text editor for equivalent functionality."
- "didn't work at all, worse than notepad."
- "Slightly better than notepad, but still doesn't display xml output (text appears
  in outline form, but still shows all tags)" (2)
- "not useful, just a plaintext viewer."
- "A notepad is better"
- "Useless DUD application... just use Note Pad on your PC..."

Second theme: **it does not render XML URLs; you must paste or pick a file.**
- "I was looking for an extension that opened XML URLs in the browser, like IE did."
- "Not working for URL and web xml" (2)
- "need to view XML that's been returned from an API response - can only view it if
  I hit View Source.. it looks like it wants me to select files, copy/paste etc."
- "Doesn't work as promised. cant open files from google drive." (2)

Third theme: **broken / does nothing.**
- "I loaded an XML file and clicked 'Format XML' and nothing happened. Does not work."
- "Wouldn't even open the first xml file I tried. Waste of my time."
- "Did anyone at Google even try this useless extension?" (3)

Fourth: **cramped window on big files, and spam.**
- "no full screen and hardly usable at all."
- "Since most of the XML will be big, so it good to have access to bigger window
  that have less scrolling"
- "Doesn't work, completely useless, AND spammy as h*ll."
- "Slow. no other fuctionality like replace."

## XML Viewer — 30,000 users, 1.7 stars
- "This extension is not trusted by Enhanced Safe Browsing."
- "Dont work." / "Does not work" / "Doesnt work :(" / "No lee XML" (5)

## XML Formatter — 10,000 users, 3.3 stars (last updated 2022)
- "Of no work, cant even handle large data, plus you have to manually select xml
  data to format, which doesn't even work."

## XML Reader — 1,000 users, 4.4 stars (the good small one)
Its only substantive complaint, and we ship the fix:
- "Most of branches are opened collapsed and there is no option for toggle
  all/all-in-branch." The developer replied that dedicated Expand All / Collapse
  All controls were still missing.

## JSON Formatter — 2,000,000 users, 4.3 stars — THE OPENING

Not an XML tool, but the closest analogue and the biggest tool in the category.
Since March 2026 it bundles the "Give Freely" affiliate/donation SDK, and its
recent reviews are a wall of one stars, many with 10-20 "found this helpful":
- "Hijacks page with donation modal" (17)
- "Untrustworthy. Highjacker. Malicious pop-ups. Should be removed." (18)
- "ADWARE disappointed with the donation code injection - uninstalling after many years" (13)
- "Injects geolocation tracking and hijacks affiliate IDs." (13)
- "supply chain hijack" (15)
- "really not acceptable for a json parses extension to inject donation pop-ups in
  checkout pages. used for many years, until today." (20)
- "Malwarebyte detected this extension to be PUP.Optional.Hijacker" (4)

Implication for our positioning: a large, actively angry audience is looking for
a data-formatting extension that provably does nothing but format data. Our
"zero network requests, open source, reads XML and nothing else" claim is not
boilerplate here — it is the exact thing these people are leaving over.
