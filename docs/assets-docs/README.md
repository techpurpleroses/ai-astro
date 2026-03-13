# Asset Sync And Audit

This folder stores generated outputs for asset migration from the scraper dataset into the app repository.

## Scripts

- `scripts/assets/sync-scraped-assets.ps1`
  - Syncs files from `../astro-asset-scrapper/astro-scraper/downloaded_assets` into `public/assets/scraped` (or a custom target such as `public/assets/scraped-catalog`).
  - Applies deterministic category mapping (zodiac sign variants, moon, events, reports, palm, icons, backgrounds, videos).
  - Updates (based on selected output paths), for example:
    - `docs/assets/asset-sync-catalog-manifest.csv`
    - `docs/assets/asset-sync-catalog-summary.json`

- `scripts/assets/audit-asset-usage.ps1`
  - Scans `src` for static `/assets/...` references.
  - Reports missing references and scraped assets that are not wired yet.
  - Builds zodiac variant index to help choose consistent icon style sets.
  - Updates:
    - `docs/assets/asset-usage-summary.json`
    - `docs/assets/asset-usage-unreferenced.csv`
    - `docs/assets/zodiac-variant-index.csv`
