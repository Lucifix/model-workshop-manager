# Security Policy

Model Workshop Manager is a single-user, self-hosted app designed to run on
a LAN or behind a VPN (Tailscale/WireGuard) — not exposed directly to the
open internet (see the README "Security" section). Most realistic risk is
therefore in the auth/session layer and in anything that touches the
filesystem (photo uploads, backups, import/export).

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security reports.

Instead, use GitHub's private reporting: go to the **Security** tab of this
repo → **Report a vulnerability**. This opens a private draft advisory
visible only to you and the maintainer — no public disclosure until it's
resolved.

Include:

- A description of the issue and its potential impact.
- Steps to reproduce, or a proof of concept if you have one.
- The version/commit you tested against.

You should get a response within a few days. Since this is a one-person
project without a dedicated security team, please be patient — but reports
will be taken seriously and credited (unless you prefer otherwise) once
fixed.

## Supported versions

As a young, actively-developed project, only the latest release/`main` is
supported. There's no LTS branch at this stage.

## Scope

In scope: the app itself (backend, frontend, Docker Compose setup, auth,
session handling, file upload/storage, backup/restore).

Out of scope: vulnerabilities that require an already-compromised host,
issues in third-party dependencies (report those upstream), or the
consequences of running this app exposed directly to the public internet
against the documented guidance.
