# Changelog

Notable changes per release. Docker images are published for every tag as
`ghcr.io/lucifix/model-workshop-manager:<version>` (and on Docker Hub); pin one with
`APP_IMAGE_TAG` in `.env`.

## [1.0.0] — 2026-10-17

First tagged release.

- **Catalog & inventory** — models, paints, and supplies, with the catalog kept separate from what
  you own. One-click starter paint catalog: 10,000+ paints from 30+ brands via the community
  [miniature-paints](https://github.com/Arcturus5404/miniature-paints) dataset.
- **Add a kit fast** — scan a barcode from a photo, get warned if you already own it, and
  optionally pre-fill name, brand, and box art from UPCitemdb (off by default; enable in Settings).
- **Builds** — guided build setup, progress log with photos (entries editable and deletable),
  "required vs. owned" paint matching, one-tap shopping list for missing paints, and a wishlist.
- **Self-hosting** — multi-arch (`amd64` + `arm64`) image on GHCR and Docker Hub, first-run setup
  screen instead of env-var credentials, auto-generated session secret, in-app backups plus an
  optional nightly snapshot sidecar.
- **Installable PWA** on phone and desktop.

[1.0.0]: https://github.com/Lucifix/model-workshop-manager/releases/tag/v1.0.0
