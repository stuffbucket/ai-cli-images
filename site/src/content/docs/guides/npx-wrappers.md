---
title: npx wrappers
description: Version-synced npm packages that run the matching image — no Docker boilerplate.
---

Every image has a matching npm wrapper whose **version is locked 1:1 to the
CLI**, so the package and the image can never drift. The wrappers are generated
from `versions.json` and published in the same CI run as the images.

```sh
npx @stuffbucket/ai-cli-codex@0.135.0 -- exec "run the tests"
```

`npx @stuffbucket/ai-cli-codex@0.135.0` runs `ghcr.io/stuffbucket/codex:0.135.0`.

## Packages

| Package | Runs |
| --- | --- |
| `@stuffbucket/ai-cli-claude` | `ghcr.io/stuffbucket/claude-code` |
| `@stuffbucket/ai-cli-copilot` | `ghcr.io/stuffbucket/copilot` |
| `@stuffbucket/ai-cli-codex` | `ghcr.io/stuffbucket/codex` |
| `@stuffbucket/ai-cli-key-proxy` | the credential-injection proxy |
| `@stuffbucket/ai-cli-core` | shared `docker run` translator (a dependency) |

## What the wrapper does

For the chosen CLI it builds a `docker run` with CI-friendly defaults:

- mounts `$PWD` at `/workspace`;
- adds `-it` for an interactive TTY, or `-i` under CI;
- forwards the CLI's auth/endpoint env vars **that are set** (the value stays on
  the host side of `-e NAME`, never embedded);
- adds a persistent volume for the deferred-install CLIs;
- wires `--add-host=host.docker.internal:host-gateway`.

## Tunables (env)

| Variable | Effect |
| --- | --- |
| `AI_CLI_REGISTRY` | use a registry mirror instead of `ghcr.io/stuffbucket` |
| `AI_CLI_ENV="FOO,BAR"` | forward extra env vars into the container |
| `AI_CLI_MATCH_USER=1` | run as your `uid:gid` (native Linux bind-mount ownership) |
| `AI_CLI_DOCKER_ARGS` | append arbitrary `docker run` flags |
| `AI_CLI_WORKDIR` | mount a different directory than `$PWD` |

## Anything after `--`

Everything after the package name is passed straight to the CLI:

```sh
npx -y @stuffbucket/ai-cli-claude -- -p "write a test for utils.ts"
```
