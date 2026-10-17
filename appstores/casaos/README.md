# CasaOS / ZimaOS App Store manifest

`ModelWorkshopManager/docker-compose.yml` is an app definition for the official
[CasaOS App Store](https://github.com/IceWhaleTech/CasaOS-AppStore), written in
its v2 format: standard Compose plus a top-level `x-casaos` block (see
[Compose and x-casaos](https://github.com/IceWhaleTech/CasaOS-AppStore/blob/main/docs/specs/compose-and-x-casaos.md)).

Notes on the choices:

- **Pinned image tag** (`1.0.0`, not `latest`). That's what the store's other
  apps do, and it ties `x-casaos.version` to what actually runs. Bump both
  (and `update_at`/`release_notes`) in a follow-up PR to the store for each
  release.
- **Host port 13080.** Store apps use high ports to stay clear of CasaOS itself
  and other apps.
- **Runs as the image's default uid 1000**, with no `user:` override. CasaOS
  creates missing `/DATA/AppData/...` folders with mode 0777 before starting
  the app, so the unprivileged process can write to them.
- **`x-casaos.id` is `org.icewhale.modelworkshopmanager`**, the format the
  store's validator suggests. If the maintainers ask for a different id,
  change it.
- The store's app assets (`icon.svg`, `thumbnail.png`, `screenshot-*.png`) are
  copied from this repo when you submit, not stored here twice.
- **The `cdn.jsdelivr.net/gh/IceWhaleTech/CasaOS-AppStore@main/Apps/ModelWorkshopManager/...`
  URLs return 404 until the store PR is merged.** Every app in the store points at
  its own folder this way. The store build doesn't download them: it maps
  `Apps/ModelWorkshopManager/<file>` to the copied local file, then rewrites the
  URL to the published asset. If the files aren't copied in (step 2 below), the
  build fails on those URLs.

## Submitting

1. Fork [IceWhaleTech/CasaOS-AppStore](https://github.com/IceWhaleTech/CasaOS-AppStore)
   and clone your fork.
2. From the fork's root, with this repo checked out at `../model-workshop-manager`:

   ```bash
   mkdir -p Apps/ModelWorkshopManager
   cp ../model-workshop-manager/appstores/casaos/ModelWorkshopManager/docker-compose.yml Apps/ModelWorkshopManager/
   cp ../model-workshop-manager/public/favicon.svg Apps/ModelWorkshopManager/icon.svg
   cp ../model-workshop-manager/public/icon-512.png Apps/ModelWorkshopManager/icon.png
   cp ../model-workshop-manager/docs/screenshots/readme-hero.png Apps/ModelWorkshopManager/thumbnail.png
   cp ../model-workshop-manager/docs/screenshots/mobile-dashboard.png Apps/ModelWorkshopManager/screenshot-1.png
   cp ../model-workshop-manager/docs/screenshots/mobile-models.png Apps/ModelWorkshopManager/screenshot-2.png
   cp ../model-workshop-manager/docs/screenshots/mobile-build.png Apps/ModelWorkshopManager/screenshot-3.png
   ```

3. Validate locally:

   ```bash
   docker compose -f Apps/ModelWorkshopManager/docker-compose.yml config -q
   ./scripts/build_dist.sh
   ```

   The build should finish without errors and produce
   `dist/apps/org.icewhale.modelworkshopmanager/`.
4. Optional: install it on a CasaOS box first. In the App Store, use
   **Custom Install → Import** and paste the compose file.
5. Commit on a branch, push, and open a PR against `main` titled e.g.
   "Add Model Workshop Manager". Say in the description that it adds a new
   app, what the app does, and how you validated it (step 3, plus step 4 if
   you did it). The store's `Validate Compose And Build` check runs on the PR.
