# Missing Assets Report

## Sync Status

- Source assets discovered: `686` (`683` images + `3` videos)
- Missing in repo after sync: `0`
- Catalog target: `public/assets/scraped-catalog`
- Manifest: `docs/assets/asset-sync-catalog-manifest.csv`
- Summary: `docs/assets/asset-sync-catalog-summary.json`

## Still Not Wired In UI

Based on static code-path scan:

- Unique `/assets/...` paths in code: `80`
- Missing referenced files: `0`
- Scraped assets not directly wired yet: `686`

See:

- `docs/assets/asset-usage-summary.json`
- `docs/assets/asset-usage-unreferenced.csv`

## High-Volume Buckets In Catalog

- `misc/raw-hash`: 278
- `misc/unclassified`: 108
- `ui/icons/variants`: 71
- `backgrounds/variants`: 23
- `features/palm/variants`: 15
- `today/moon/phases/variants`: 12
- `today/horoscope/variants`: 11
- `reports/variants`: 9

## Zodiac Variant Consistency

- Every sign now has multiple scraped variants indexed in:
  - `docs/assets/zodiac-variant-index.csv`
- Canonical app icons (`public/assets/zodiac/*.png`) were normalized to one consistent 160x160 gold-style set across all 12 signs.
