# Data Source Research (Phase 1)

Researched August 2026. This determines the ingestion architecture: **no automated
catalog source is safe to depend on**, so the app is built import-first (CSV/JSON/manual),
with optional convenience lookups layered on top.

## Summary table

| Source | Official API | Public API | Scraping technically possible | Scraping allowed by ToS | Redistributable | Verdict |
|---|---|---|---|---|---|---|
| Revell (revell.com / Revell USA) | No | No | Yes (standard e-commerce HTML) | Not addressed for kit data; storefront ToS is consumer-oriented, not a data license | No | **Do not depend on.** No developer program, no data feed. |
| Tamiya (tamiya.com / tamiyausa.com) | No | No | Yes | Not addressed | No | **Do not depend on.** Same situation — retail site only. |
| AK Interactive (ak-interactive.com) | No | No | Yes (Shopify-style storefront) | Not addressed | No | **Do not depend on.** Product pages exist but no data program. |
| Scalemates | No | No (community web app only) | Technically yes, but it's a crowd-sourced database, not a manufacturer source — quality varies and reuse isn't authorized | Not granted; the FAQ describes a curated web/search-engine product, not a data API, and it explicitly restricts what gets crawled *into* it (i.e. they scrape others, don't invite others to scrape them) | No stated redistribution rights; per-user "stash" CSV/Excel export exists but that's a personal export of *your own* stash, not a bulk catalog dump | **Do not scrape.** Fine as a *manual reference link* (open the kit's Scalemates page in a new tab) and as a source a user can hand-paste data from, not as an automated provider. |
| UPCitemdb (barcode/EAN/UPC/GTIN lookup) | Yes — documented free tier | Yes | N/A (real API) | Yes, within stated limits | Terms allow use of returned data in your own app | **Usable as an optional convenience provider.** ~100 free lookups/day. Coverage is generic retail product data (title, brand, image) — it will resolve "this barcode is Tamiya Acrylic Mini X-2 Blue" but won't give hobby-specific structure (paint type, finish) or Revell/Tamiya kit metadata reliably, since many kits/paints simply aren't in a general UPC database. |
| ean-search.org | Account required for API | Paid tiers, small free allowance | N/A | Explicitly *prohibits* automated crawling of the public web pages, but API use is sanctioned | Yes, within account terms | Same category as UPCitemdb — optional, generic, not hobby-specific. |

## Conclusion

There is **no manufacturer or aggregator that publishes a documented, redistribution-safe
API for model-kit or hobby-paint catalog data.** This is a known reality in the scale-modeling
space — Scalemates itself is the closest thing to a "catalog API" and it doesn't offer one to
third parties. Building automated ingestion against any of these would mean either scraping a
retail storefront (fragile, ToS-ambiguous, breaks on redesign) or scraping a community database
that doesn't license its data out (ethically and possibly contractually worse).

**Architectural consequence:** the app is designed **import-first**, not **fetch-first**:

1. A generic `CatalogProvider` interface (search/get models, search paints) is defined so a real
   API-backed provider can be dropped in later *if* a manufacturer ever ships one.
2. The only implemented providers in the MVP are:
   - **Manual entry** (always available, zero dependencies)
   - **CSV/JSON import** (bulk-load a spreadsheet you maintain, or one exported from
     somewhere else — including your own copy-paste from Scalemates)
   - **Barcode lookup via UPCitemdb** (optional, off by default, needs no API key for the
     free tier) as a quick-fill convenience for paints/kits that happen to be in a general
     UPC database — never as the primary path
3. Every catalog row stores `source` + `source_url` so provenance is visible and nothing
   pretends to be more authoritative than it is.
4. Nothing in the app assumes catalog completeness. Manual creation is a first-class,
   equally-supported path everywhere the spec calls for an "Add" workflow.

If you want richer paint-requirement data per kit (e.g. "Revell 05239 needs Revell 05 White"),
realistically the fastest path is **you entering it once** as you build (the app captures this
naturally via Project Paints) or a one-time CSV you assemble by hand from instruction sheets —
not a scraper. This is called out explicitly in the seed data (§23 of the brief): no invented
model-paint requirements are shipped, only the two real examples the brief itself specified.
