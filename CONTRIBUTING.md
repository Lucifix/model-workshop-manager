# Contributing

Thanks for considering a contribution to Model Workshop Manager. This is a
small, single-maintainer project — response times may be slow, but PRs and
issues are genuinely welcome.

## Before you start

For anything beyond a small fix, open an issue first describing what you
want to change and why. This avoids wasted work on a PR that doesn't fit the
project's direction — in particular, see "Things not to fix" in
[AGENTS.md](AGENTS.md) for a few areas that are intentionally out of scope
(e.g. single-user auth, no manufacturer-site scraping).

## Dev setup

See [AGENTS.md](AGENTS.md) for layout, install/run commands, and coding
conventions — that's the canonical reference, not duplicated here.

## Making a PR

- Keep PRs focused on one change. Unrelated cleanup makes review harder, not
  easier.
- Run `npm run lint:fix` and `npm run fmt` (repo root) before pushing — CI
  runs both and will fail the build otherwise.
- Add/update backend tests for behavior changes (`cd apps/backend && npm test`).
  The frontend has no test setup yet.
- Follow the existing conventions: Zod validation via `parseBody()`, the
  `CatalogProvider` interface for any new external/optional data source (see
  [apps/backend/src/providers/types.ts](apps/backend/src/providers/types.ts)),
  comments that explain *why* not *what*.

### Sign off your commits (DCO)

Every commit must include a `Signed-off-by` line certifying you wrote it or
otherwise have the right to submit it under the project's license (see
[DCO](DCO) for the exact text). Add it with `git commit -s`, or add the line
manually:

```
Signed-off-by: Your Name <your.email@example.com>
```

Any name and email consistently associated with you is fine (a GitHub handle
works). A CI check will block PRs with unsigned commits.

## Contributing catalog data (paints, kits, manufacturers)

There's no shared community catalog file in this repo yet — today, catalog
data comes from the CSV import path (documented in
[apps/backend/src/providers/csvImportProvider.ts](apps/backend/src/providers/csvImportProvider.ts))
or hand entry, per-user. If you're interested in building out a shared,
community-maintained seed dataset (a real paint/kit catalog beyond the
handful of illustrative rows in `apps/backend/src/db/seed.ts`), open an issue
to discuss the shape first — this is a place where design input is
especially welcome before code gets written.

Whatever the source, don't submit data scraped from manufacturer or
aggregator sites (see the ToS note in `providers/types.ts`) — hand-entered
data from public spec sheets, or your own collection, is fine.

## Reporting bugs / requesting features

Use the issue templates. For anything security-relevant, see
[SECURITY.md](SECURITY.md) instead of a public issue.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Please read
it before participating.
