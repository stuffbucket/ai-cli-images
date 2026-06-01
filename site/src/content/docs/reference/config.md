---
title: Config & labels
description: The in-image configuration contract — paths, labels, and env knobs.
---

Every image declares its own contract via OCI and `co.stuffbucket.cli.*` labels,
so it's discoverable with `docker inspect` — no docs required.

## Paths

| Path | Purpose |
| --- | --- |
| `/workspace` | bind-mount your project here (alias: `/work`) |
| `/home/node` | `$HOME`; config/login lives under it |
| `/home/node/.local` | deferred-install location (mount a volume to persist) |
| `/usr/local/share/licenses/<cli>/` | the bundled CLI license |

## Labels

| Label | Meaning |
| --- | --- |
| `org.opencontainers.image.base.name` | the base image (e.g. `node:24-alpine`) |
| `org.opencontainers.image.version` | the CLI version baked/pinned |
| `org.opencontainers.image.source` | this repository |
| `co.stuffbucket.cli.auth.env` | env var(s) for default-vendor auth |
| `co.stuffbucket.cli.endpoint.env` / `.flag` | self-hosted / custom endpoint override |
| `co.stuffbucket.cli.config.dir` | mount to persist an interactive login |
| `co.stuffbucket.cli.workspace.dir` | the workspace mount point (`/workspace`) |
| `co.stuffbucket.cli.install.mode` | `deferred` or `baked` |

```sh
docker inspect ghcr.io/stuffbucket/codex --format '{{json .Config.Labels}}' | jq .
```

## Wrapper env knobs

These affect the `npx` wrappers (see [npx wrappers](/ai-cli-images/guides/npx-wrappers/)):
`AI_CLI_REGISTRY`, `AI_CLI_ENV`, `AI_CLI_MATCH_USER`, `AI_CLI_DOCKER_ARGS`,
`AI_CLI_WORKDIR`.

## CLI auth & endpoint env

| CLI | Auth | Custom endpoint |
| --- | --- | --- |
| Claude Code | `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` | `ANTHROPIC_BASE_URL`; `CLAUDE_CODE_USE_BEDROCK` / `_USE_VERTEX` |
| Copilot | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN` | `COPILOT_PROVIDER_BASE_URL` (+ `COPILOT_PROVIDER_*`) |
| Codex | `OPENAI_API_KEY` | `--oss --local-provider`, or `model_providers` in `~/.codex/config.toml` |
