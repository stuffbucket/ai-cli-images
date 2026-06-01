---
title: How it is built
description: The monorepo layout, the version-sync pipeline, and the supply-chain posture.
---

This is an npm-workspaces monorepo: the Docker images and the npm packages live
together and are released in lockstep.

## Layout

| Path | What |
| --- | --- |
| `images/<cli>/` | Docker image contexts (published to GHCR) |
| `packages/core/` | `@stuffbucket/ai-cli-core` — shared `docker run` translator |
| `packages/clis/<cli>/` | `@stuffbucket/ai-cli-<cli>` — generated npx wrappers |
| `packages/key-proxy/` | `@stuffbucket/ai-cli-key-proxy` — credential-injection proxy |
| `scripts/gen-clis.mjs` | regenerates the wrappers from `versions.json` |
| `site/` | this documentation site |

## The version-sync pipeline

- `versions.json` is the single source of truth: image → `{ version, base }`.
- `build.yml` turns it into a build matrix and pushes each image multi-arch to
  `ghcr.io/stuffbucket/<name>`, then its `publish-npm` job publishes the npx
  wrappers **in the same run** — so the npm version === image tag === CLI
  version, 1:1.
- `update-versions.yml` weekly: bumps CLI versions from npm, refreshes the
  digest-pinned base images, regenerates the wrappers, and opens a PR.
- `cleanup-packages.yml`: prunes old image versions (hygiene).

## Supply chain

- Base images pinned by **digest** (refreshed weekly for security patches).
- Every third-party GitHub Action pinned to a **commit SHA**.
- Images built with **SBOM + SLSA provenance** attestations.
- npm wrappers published via **OIDC trusted publishing** — no long-lived token.
- Strict allowlist `.dockerignore` per image context.

## Image internals

- `node:24` base (Alpine for claude-code/codex, slim for copilot).
- `tini` as PID 1 for clean signal handling in a TTY.
- Non-root `node` user; gid-0-owned, group-writable `$HOME` and `/workspace` for
  arbitrary-`--user` support.
- `/work` is a symlink to `/workspace`.
