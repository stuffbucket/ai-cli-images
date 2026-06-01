---
title: The images
description: What each image contains, the base choices, tags, and the deferred-install model.
---

Each image bundles one CLI on a minimal base, runs as the unprivileged `node`
user, and mounts your project at `/workspace` (alias `/work`).

| Image | CLI | Base | Install |
| --- | --- | --- | --- |
| `claude-code` | Anthropic Claude Code | `node:24-alpine` | deferred |
| `copilot` | GitHub Copilot CLI | `node:24-slim` | deferred |
| `codex` | OpenAI Codex CLI | `node:24-alpine` | baked |

## Why the bases differ

`claude-code` and `codex` run cleanly on Alpine (musl), so they use the smaller
Alpine base. The Copilot CLI's native agent binary segfaults under musl, so
`copilot` uses the glibc Debian "slim" base where it runs correctly. The base is
recorded in each image's `org.opencontainers.image.base.name` label, and base
images are pinned by digest.

## Deferred install vs baked

The two proprietary CLIs (`claude-code`, `copilot`) are **not** baked into the
image — their licenses don't grant general redistribution. Instead the image
ships only Node plus a launcher that installs the pinned CLI version from the
official npm registry **on first run**, into `/home/node/.local`:

- mount a volume there (`-v claude-cli:/home/node/.local`) to persist it across
  runs — otherwise it re-installs each fresh container;
- the first run needs network; later runs start immediately.

`codex` is Apache-2.0, so it is baked in directly for a faster, network-free
start. The mode is recorded in the `co.stuffbucket.cli.install.mode` label. See
[Licensing & redistribution](/ai-cli-images/reference/licensing/).

## Tags

The base variant is a tag suffix, like the official `node`/`python` images:

| Tag | Example | Meaning |
| --- | --- | --- |
| `<version>-<base>` | `codex:0.135.0-alpine` | Immutable, reproducible pin. |
| `<version>` | `codex:0.135.0` | CLI version, floating base. |
| `<base>` | `codex:alpine` | Latest build of that base. |
| `latest` | `codex:latest` | Latest build on the default branch. |

Pin `<version>-<base>` for reproducibility; track `latest`/`<base>` to get
auto-patched rebuilds (images are rebuilt at least weekly for base-OS security
updates).
