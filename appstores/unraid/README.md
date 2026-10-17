# Unraid Community Apps template

Community Apps template for [Model Workshop Manager](https://github.com/Lucifix/model-workshop-manager).

This folder is laid out as the root of a **separate** templates repository
(`Lucifix/unraid-templates`), following the Community Apps
[builder guide](https://ca.unraid.net/submit/help/builders) and its
[starter repository](https://github.com/unraid/unraid-community-apps-starter):
Community Apps expects `ca_profile.xml` at the repository root and scans the
whole repository, so it gets its own small repo instead of living in the app's
root. The template pulls the published image, so it doesn't need anything else
from this repo.

```text
ca_profile.xml                      repository profile shown in Community Apps
templates/model-workshop-manager.xml the Docker template
```

`TemplateURL` and `WebPage` assume the repo is named `unraid-templates`. Both
return 404 until that repo exists. Pick a different name and you'll need to
update both.

## Unraid-specific defaults

- **Runs as `99:100`** (`--user 99:100` under _Extra Parameters_). This replaces
  `APP_UID`/`APP_GID` from `docker-compose.yml`, which are Compose-only and
  have no effect as container variables. Unraid creates missing appdata paths
  owned by `nobody:users`, so the image's default uid 1000 couldn't write there.
- **Data and backups are sibling folders** under
  `/mnt/user/appdata/model-workshop-manager/`. Nesting the backups folder
  inside the data folder would make every backup include the previous ones.
- **Host port 8080 → container port 3000**, same as the docs.

## Submitting

1. Create a public repo `Lucifix/unraid-templates`. Copy this folder's
   contents to its root, along with this project's `LICENSE` (CA requires an
   OSI-approved license at the repo root). Push to `main`.
2. Check that
   `https://raw.githubusercontent.com/Lucifix/unraid-templates/main/templates/model-workshop-manager.xml`
   loads.
3. Optional but common: open a support thread in the Unraid forums'
   _Docker Containers_ section. Add its URL as `<Forum>` in `ca_profile.xml`
   and as `<Support>` in the template.
4. Sign in at <https://ca.unraid.net/submit/new>, enter the repo URL, then run
   **Validate** and **Scan**. Fix anything they report, push, and run them again.
5. Submit for review once every check passes.

Once the templates repo is live, edit the template there. Either delete this
folder or keep the two in sync.
