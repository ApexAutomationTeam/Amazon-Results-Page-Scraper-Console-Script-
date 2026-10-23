# Amazon Results-Page Scraper (Console Script)

**Turn any Amazon search results page into a clean spreadsheet, with no extension, no install and no product-page visits.** Paste one script into the browser console and a file downloads. Built for Amazon sites that share the same results layout; price formats and EN/ES text from `.com`, `.es` and `.co.uk` style sites are handled.

> **Heads-up:** Amazon changes its page structure (DOM) regularly. A script that works today can stop working after an Amazon update and will then need to be updated. See [Maintenance & support](#maintenance--support).

> Built by [Apex Automation Team](https://apexautomationteam.com/). See real automation builds running on the **[Sample Works page](https://apexautomationteam.com/sample-works/)**.

---

## At a glance

| | |
|---|---|
| **Type** | Browser console script (JavaScript), runs on the page you have open |
| **Input** | An Amazon search results page (the product list, "PLP") |
| **Output** | `.xls` colour-coded research sheet (Full) or `.csv` (Lite) |
| **Install** | None. Chrome / Edge / Firefox DevTools console |
| **Dependencies** | None |
| **Languages understood** | English and Spanish labels, prices (`$1,299.99` and `1.299,00 €`), review counts (`1.2K`, `1,2 mil`) and delivery dates (`Jul 3`, `6 de julio`) |
| **Scripts** | `scripts/amazon-plp-scraper-full.js`, `scripts/amazon-plp-scraper-lite.js` |

## Which script?

| | **Full** | **Lite** |
|---|---|---|
| File | `amazon-plp-scraper-full.js` | `amazon-plp-scraper-lite.js` |
| Output | Colour-coded Excel file (`.xls`) | Plain CSV |
| Columns | 16 incl. store, links, delivery cost, pros, cons, red flags, final recommendation | 9: ASIN, Title, Price, Rating, Reviews, Delivery, OnTime, Badge, Link |
| Scoring / recommendation | Yes (rules below) | No |
| Best for | Buying research, shortlists, client reports | Fast raw data for your own analysis |

## How to use

1. Open an Amazon **search results** page in **desktop layout**. Press `Ctrl + Shift + M` to leave mobile/responsive mode if it is on.
2. Make sure the search is the one you want (no stray category filter such as `i=garden`), for example `https://www.amazon.com/s?k=mattress`.
3. Scroll so the results you want have loaded.
4. Press `F12` > **Console**.
5. Type `allow pasting` and press Enter (Chrome blocks pasting until you do).
6. Paste the script, press Enter. The file downloads and a message shows how many products were saved.

Work one results page at a time; the Lite file name includes the page number (`amz_mattress_p2.csv`).

## Settings

Edit the lines at the top of the script before pasting.

| Setting | Default | Meaning |
|---|---|---|
| `MIN_PRICE` (Full) | `5` | Skip listings cheaper than this (scam / accessory filter). Uses the listing's own currency |
| `DEADLINE` | `null` | Set `new Date(2026,6,14)` to flag whether delivery arrives by that date (month is 0-based: 6 = July). `null` turns the delivery check off |
| `SKIP_SPONSORED` | `true` | Ignore ads inside the results list |

## Full output columns

`#`, Item Name, Store/Vendor, Store Link, Product Link, Total Price, Delivery Cost, Setup/Installation Cost, Estimated Delivery, Return Policy, Rating, Reviews, Pros, Cons, Red Flags, Final Recommendation.

Rows are coloured **green** (top pick), **yellow** (recommended / acceptable) or **red** (skip).

### How the recommendation is scored

| Signal | Points |
|---|---|
| Rating 4.4+ / 4.0+ / 3.5+ | +3 / +2 / +1 |
| Reviews 1,000+ / 200+ / 50+ | +3 / +2 / +1 |
| Arrives by deadline (or no deadline set) | +2 |
| Misses the deadline | -3 |
| Very cheap and under 50 reviews | -1 |

**7+** top pick, **5-6** recommended, **3-4** acceptable, **below 3** skip. Pros, cons and red flags also react to review volume, price band, badges (Best Seller, Overall Pick, limited-time deal), refurbished / import / digital-code listings and regional rating labels (USK, PEGI, ESRB). The title-keyword rules lean towards games and electronics; extend them for your niche. Price bands (20 / 80 / 200) are in the listing currency, so adjust them for your category.

## Troubleshooting

| Problem | Fix |
|---|---|
| Console refuses to paste | Type `allow pasting`, press Enter, then paste again |
| `0 products - scroll the page and retry` | You are on a mobile layout, a non-results page, or nothing has loaded yet. Switch to desktop layout, scroll, retry |
| Wrong products | Check the URL for category filters like `i=garden` and use a plain search URL |
| Excel warns the format and extension do not match | Expected for the Full file: it is an HTML table saved as `.xls` so colours survive. Click **Yes** to open it |
| A field is empty, or the script stopped working after it worked before | Amazon probably changed its page structure. Email us (see [Maintenance & support](#maintenance--support)) |
| Prices look wrong in a currency you use | Email us an example price string |

## Known limitations

- It reads only the results currently on the page. Amazon lazy-loads, so scroll first, and run it again on each page.
- Amazon changes its page markup often. If a field comes back empty, the CSS selectors near the top of the scraping block need an update.
- Sponsored detection relies on common ad markers (`AdHolder`, the "Sponsored" / "Patrocinado" label). Check that it behaves correctly on your own page, and set `SKIP_SPONSORED = false` to keep everything.
- The delivery check uses the first date shown in a delivery message and assumes the year of `DEADLINE` (or the current year).
- Store / vendor comes from the results card (brand row, else the first word of the title); the store link is a brand search, not a seller page.
- Return policy and setup cost are placeholder text, because they are not on the results page.
- Logic is tested against sample results markup, not against every Amazon domain or layout.

## Maintenance & support

Amazon changes its DOM (page structure, CSS classes and labels) regularly, and it does so without notice. Because this script reads the page directly, **it can stop working or return empty fields after an Amazon update, and it then has to be updated.** This is normal for any scraper of a live website, not a one-off bug.

**Found an issue?** Email **[contact@apexautomationteam.com](mailto:contact@apexautomationteam.com)** so we can look into it. To help us fix it fast, include:

- which Amazon site you used (for example `amazon.es`) and the search URL
- which script (Full or Lite) and what you saw (empty column, `0 products`, wrong value)
- a screenshot of the results page and, if possible, the console output (`F12` > Console)

## Need a scraper for another site?

This project is a worked example of how a custom scraper is built: read what the page already shows, validate every field, and export clean data. **We can build the same kind of scraper for any website or process, to your exact spec,** and keep it updated when the site changes.

- Tell us the site, the data you need and the output format (Excel, CSV, Google Sheets, API).
- We review it, test it and run a free feasibility check to settle the scope.
- Contact: **[contact@apexautomationteam.com](mailto:contact@apexautomationteam.com)** | **[Apex Automation Team](https://apexautomationteam.com/)** | see more builds on the **[Sample Works page](https://apexautomationteam.com/sample-works/)**.

## Responsible use

This script only reads the page you already opened in your own browser. Amazon's terms restrict automated data collection, so use it for personal research and modest volumes, do not hammer the site, and check the terms that apply to you and your use case. Prefer an official API or data feed where one fits. The authors accept no liability for misuse.

## More from Apex Automation Team

Automation, web scraping, QA and back-office systems. Watch real builds run on the **[Sample Works page](https://apexautomationteam.com/sample-works/)** or write to [contact@apexautomationteam.com](mailto:contact@apexautomationteam.com).

## License

Add your preferred license (for example MIT) before publishing.
