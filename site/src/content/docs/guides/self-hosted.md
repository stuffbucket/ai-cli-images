---
title: Self-hosted models
description: Point any CLI at a self-hosted or custom endpoint — no vendor key required — or keep the key out of the container entirely.
---

You don't need a vendor account at all: each CLI can target a self-hosted or
OpenAI/Anthropic-compatible endpoint (LiteLLM, vLLM, Ollama, LM Studio, a
gateway, Bedrock/Vertex). The override is also recorded in the
`co.stuffbucket.cli.endpoint.*` label.

```sh
# Claude Code -> any Anthropic-compatible endpoint (key optional)
docker run --rm -it -v "$PWD:/workspace" \
  -e ANTHROPIC_BASE_URL=http://host.docker.internal:4000 \
  -e ANTHROPIC_AUTH_TOKEN=local \
  ghcr.io/stuffbucket/ai-cli-claude
# Bedrock/Vertex: -e CLAUDE_CODE_USE_BEDROCK=1 / -e CLAUDE_CODE_USE_VERTEX=1

# Copilot -> BYOK; with a provider base URL, GitHub auth is NOT required
docker run --rm -it -v "$PWD:/workspace" \
  -e COPILOT_PROVIDER_BASE_URL=http://host.docker.internal:11434/v1 \
  -e COPILOT_PROVIDER_TYPE=openai \
  ghcr.io/stuffbucket/ai-cli-copilot

# Codex -> built-in OSS providers, no OpenAI key
docker run --rm -it -v "$PWD:/workspace" \
  ghcr.io/stuffbucket/ai-cli-codex --oss --local-provider ollama
```

For a custom (non-OSS) Codex endpoint, use `~/.codex/config.toml`:

```toml
[model_providers.local]
name = "local"
base_url = "http://host.docker.internal:1234/v1"
env_key = "LOCAL_API_KEY"   # may be a dummy value for local servers
```

:::note[Reaching a model on your host]
From inside the container, use `host.docker.internal` in the URL, or on Linux
run with `--add-host=host.docker.internal:host-gateway` (or `--network host`).
:::

## Keep the key out of the container

The `@stuffbucket/ai-cli-key-proxy` package implements the Vercel-Sandbox
pattern: the key reaches only a small proxy on the trusted side; the agent
container holds just the proxy URL.

```sh
PROXY_UPSTREAM=https://api.anthropic.com \
PROXY_INJECT_HEADER=x-api-key \
PROXY_KEY_ENV=ANTHROPIC_API_KEY \
  npx -y @stuffbucket/ai-cli-key-proxy
```

then point the image at it via `ANTHROPIC_BASE_URL`. The proxy strips any
client-supplied auth, injects the real key upstream, and can gate on a
short-lived scoped token (`PROXY_REQUIRE_TOKEN`). See
[`examples/key-proxy/`](https://github.com/stuffbucket/ai-cli-images/tree/main/examples/key-proxy)
for a compose setup.
