---
title: Quick start
description: Run an AI CLI in seconds, via npx or docker.
---

There are two equivalent ways to run any of the CLIs: the **`npx` wrapper**
(simplest) or **`docker run`** directly. Both run the same multi-arch image and
mount your project at `/workspace`.

## via npx

```sh
# latest
npx -y @stuffbucket/ai-cli-codex -- exec "run the tests"

# pinned to an exact version (reproducible) — current versions are on "The images"
npx @stuffbucket/ai-cli-claude@<version> -p "summarize this repo"
```

Packages follow `@stuffbucket/ai-cli-<cli>`: `ai-cli-claude`, `ai-cli-copilot`,
`ai-cli-codex`. The wrapper mounts `$PWD` at `/workspace`, detects TTY vs CI,
forwards the CLI's auth env vars that are set, and (for the proprietary CLIs)
keeps a persistent volume for the runtime-installed CLI.

## via docker

```sh
docker run --rm -it -v "$PWD:/workspace" ghcr.io/stuffbucket/ai-cli-codex
```

For the **deferred-install** images (`claude-code`, `copilot`), add a named
volume so the runtime-installed CLI persists across runs:

```sh
docker run --rm -it \
  -v "$PWD:/workspace" \
  -v claude-cli:/home/node/.local \       # persists the installed CLI
  -v "$HOME/.claude:/home/node/.claude" \ # persists your login
  ghcr.io/stuffbucket/ai-cli-claude
```

## Authenticate

Nothing is baked in — pass your key as an env var (`-e NAME` forwards it from
your shell), or log in interactively with `-it`:

```sh
docker run --rm -v "$PWD:/workspace" -e ANTHROPIC_API_KEY \
  ghcr.io/stuffbucket/ai-cli-claude -p "explain this codebase"
```

See [Credentials](/ai-cli-images/guides/credentials/) for every CLI's auth env
and config dir, and [Self-hosted models](/ai-cli-images/guides/self-hosted/) to
run without a vendor key at all.

## Tags

Pin to `<version>-<base>` for a reproducible, immutable image (e.g.
`codex:<version>-alpine`); `latest`, `<version>`, and `<base>` are floating. The
`npx` wrapper version equals the CLI version, so pinning the wrapper pins the
image.
