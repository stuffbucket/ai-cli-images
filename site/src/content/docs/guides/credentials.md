---
title: Credentials
description: Supply your own keys at runtime — by env var or a mounted config dir.
---

These images ship **no credentials by design**. You supply your own at run time,
two ways (mix as needed):

1. **Non-interactive (env var)** — set the CLI's auth env var; `-e NAME` (no
   value) forwards it from your shell. Best for CI.
2. **Interactive login (mounted config)** — run with `-it`, log in once, and
   mount the CLI's config dir so the session persists across runs.

## Per-CLI contract

| CLI | Auth env var(s) | Config dir | Interactive login |
| --- | --- | --- | --- |
| `claude-code` | `ANTHROPIC_API_KEY` | `/home/node/.claude` | `-it`, or `claude auth` |
| `copilot` | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` (in order); or BYOK | `/home/node/.copilot` | `/login` in session |
| `codex` | `OPENAI_API_KEY` | `/home/node/.codex` | `codex login` (ChatGPT) |

Each image also declares this in labels, discoverable without docs:

```sh
docker inspect ghcr.io/stuffbucket/claude-code \
  --format '{{json .Config.Labels}}' \
  | jq '."co.stuffbucket.cli.auth.env", ."co.stuffbucket.cli.config.dir"'
```

## Examples

```sh
# CI / scripting — key from the host environment
docker run --rm -v "$PWD:/workspace" -e ANTHROPIC_API_KEY \
  ghcr.io/stuffbucket/claude-code -p "summarize this repo"

# Interactive — log in once, persist it on the host
docker run --rm -it -v "$PWD:/workspace" \
  -v "$HOME/.codex:/home/node/.codex" ghcr.io/stuffbucket/codex
```

Inside the container `$HOME` is `/home/node`. To run **without** a vendor key at
all, see [Self-hosted models](/ai-cli-images/guides/self-hosted/).
