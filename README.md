# ai-cli-images

Small, ready-to-run container images for AI coding-assistant CLIs, published to
the GitHub Container Registry for the community.

Each image bundles one CLI on a minimal base, runs as an unprivileged user, and
mounts your project at `/work`. Multi-arch (`linux/amd64`, `linux/arm64`).

## Images

| Image | CLI | Base | Install | Pull |
| --- | --- | --- | --- | --- |
| `claude-code` | [Anthropic Claude Code](https://www.npmjs.com/package/@anthropic-ai/claude-code) | `node:24-alpine` | deferred¹ | `docker pull ghcr.io/stuffbucket/claude-code` |
| `copilot` | [GitHub Copilot CLI](https://www.npmjs.com/package/@github/copilot) | `node:24-slim` | deferred¹ | `docker pull ghcr.io/stuffbucket/copilot` |
| `codex` | [OpenAI Codex CLI](https://www.npmjs.com/package/@openai/codex) | `node:24-alpine` | baked | `docker pull ghcr.io/stuffbucket/codex` |

¹ **Deferred install.** `claude-code` and `copilot` are proprietary and their
licenses don't grant general redistribution, so these images do **not** contain
the CLI. On first run the launcher installs the pinned version from the official
npm registry into `/home/node/.local`; mount a volume there to persist it across
runs (otherwise it re-installs each fresh container). `codex` is Apache-2.0, so it
is baked in directly. The mode is recorded in the `co.stuffbucket.cli.install.mode`
label. See [Licensing & redistribution](#licensing--redistribution).

### Tags

The base variant (`alpine` / `slim`) is encoded as a tag suffix, the same way
the official `node`/`python` images do it. For each image:

| Tag | Example | Meaning |
| --- | --- | --- |
| `<version>-<base>` | `claude-code:2.1.158-alpine` | Fully explicit, reproducible pin. |
| `<version>` | `claude-code:2.1.158` | CLI version, default base. |
| `<base>` | `claude-code:alpine`, `copilot:slim` | Floating — latest build of that base. |
| `latest` | `claude-code:latest` | Most recent build of the default branch. |

Today each image has exactly one base, so all four point at the same build; the
suffix exists so the base is unambiguous in a digest/lockfile and so an image
can gain a second base later without breaking existing pins.

### Why the bases differ

`claude-code` and `codex` run cleanly on Alpine (musl), so they use the smaller
Alpine base. The Copilot CLI's native agent binary segfaults under musl, so
`copilot` uses the glibc Debian "slim" base where it runs correctly. The base of
any image is also recorded in its `org.opencontainers.image.base.name` label.

## Usage

Mount your project into `/work` (alias `/workspace`) and run the CLI — anything
after the image name is passed straight to it:

```sh
# Run a CLI against the current directory
docker run --rm -it -v "$PWD:/work" ghcr.io/stuffbucket/codex

# Drop into a shell instead of the CLI
docker run --rm -it --entrypoint bash -v "$PWD:/work" ghcr.io/stuffbucket/codex
```

For the **deferred-install** images (`claude-code`, `copilot`), add a named
volume so the runtime-installed CLI persists across runs instead of being
re-fetched each time:

```sh
docker run --rm -it \
  -v "$PWD:/work" \
  -v claude-cli:/home/node/.local \      # persists the installed CLI
  -v "$HOME/.claude:/home/node/.claude" \ # persists your login
  ghcr.io/stuffbucket/claude-code
```

The first run needs network (to fetch the CLI from npm); subsequent runs reuse
the volume and start immediately.

### Running on Colima / Podman / native Linux

On Docker Desktop the defaults just work. Off Docker Desktop the container's
`node` uid (1000) and `host.docker.internal` aren't auto-provided, so:

```sh
docker run --rm -it \
  -v "$PWD:/work" \
  --user "$(id -u):$(id -g)" \                       # match host file ownership (native Linux)
  --add-host=host.docker.internal:host-gateway \     # reach a model server on the host
  ghcr.io/stuffbucket/codex
# Podman (rootless): add  --userns=keep-id:uid=1000,gid=1000
# Colima:            colima start --mount-type=virtiofs   (better uid mapping + I/O perf)
```

Home dirs are owned by gid 0 and group-writable, so an arbitrary `--user` can
still write config/login (and install, for the deferred images).

### Credentials

**The expectation: these images ship _no_ credentials by design.** Each is just
the CLI on a clean base — you supply your own account/keys at run time, **or
point the CLI at a self-hosted model and skip the vendor key entirely** (see
[Self-hosted & custom models](#self-hosted--custom-models)). For the default
vendor path there are two ways, and you can mix them:

1. **Non-interactive (env var):** set the CLI's auth env var. Best for CI and
   scripting. `-e NAME` (no value) forwards the variable from your shell.
2. **Interactive login (mounted config):** run with `-it` and log in once; mount
   the CLI's config dir so the session persists across `docker run`s.

Each image declares its own contract — discoverable without reading these docs:

```sh
docker inspect ghcr.io/stuffbucket/claude-code \
  --format '{{json .Config.Labels}}' | jq '."co.stuffbucket.cli.auth.env", ."co.stuffbucket.cli.config.dir"'
# "ANTHROPIC_API_KEY"
# "/home/node/.claude"
```

| Image | Auth env var(s) | Config dir (mount to persist login) | Interactive login |
| --- | --- | --- | --- |
| `claude-code` | `ANTHROPIC_API_KEY` | `/home/node/.claude` | run with `-it`, or `claude auth` |
| `copilot` | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` (in that order); or BYOK via `COPILOT_PROVIDER_BASE_URL` + `COPILOT_PROVIDER_API_KEY` | `/home/node/.copilot` | `/login` inside the session |
| `codex` | `OPENAI_API_KEY` | `/home/node/.codex` | `codex login` (ChatGPT) |

```sh
# CI / scripting — key from the host environment
docker run --rm -v "$PWD:/work" -e ANTHROPIC_API_KEY \
  ghcr.io/stuffbucket/claude-code -p "summarize this repo"

# Interactive — log in once, persist it on the host
docker run --rm -it -v "$PWD:/work" \
  -v "$HOME/.codex:/home/node/.codex" ghcr.io/stuffbucket/codex

# Reuse an existing host login (e.g. Copilot/gh token)
docker run --rm -it -v "$PWD:/work" -e GH_TOKEN \
  ghcr.io/stuffbucket/copilot
```

Inside the container `$HOME` is `/home/node`. Mounting a host config dir
(`-v "$HOME/.claude:/home/node/.claude"`) reuses a login you already have.

### Self-hosted & custom models

You don't need a vendor account at all — each CLI can be pointed at a
self-hosted or OpenAI/Anthropic-compatible endpoint (LiteLLM, vLLM, Ollama,
LM Studio, a gateway, Bedrock/Vertex). The override mechanism per image is also
in the `co.stuffbucket.cli.endpoint.*` label.

```sh
# Claude Code -> any Anthropic-compatible endpoint (key optional; a bearer
# token or a dummy key satisfies the client)
docker run --rm -it -v "$PWD:/work" \
  -e ANTHROPIC_BASE_URL=http://host.docker.internal:4000 \
  -e ANTHROPIC_AUTH_TOKEN=local \
  ghcr.io/stuffbucket/claude-code
# (Bedrock/Vertex instead: -e CLAUDE_CODE_USE_BEDROCK=1 / -e CLAUDE_CODE_USE_VERTEX=1)

# Copilot -> BYOK; with a provider base URL, GitHub auth is NOT required
docker run --rm -it -v "$PWD:/work" \
  -e COPILOT_PROVIDER_BASE_URL=http://host.docker.internal:11434/v1 \
  -e COPILOT_PROVIDER_TYPE=openai \
  ghcr.io/stuffbucket/copilot
# (COPILOT_PROVIDER_API_KEY is optional — only if your endpoint requires it)

# Codex -> built-in OSS providers, no OpenAI key
docker run --rm -it -v "$PWD:/work" \
  ghcr.io/stuffbucket/codex --oss --local-provider ollama
```

For a custom (non-OSS) endpoint, Codex uses `~/.codex/config.toml` instead of an
env var — mount `-v "$HOME/.codex:/home/node/.codex"` and add:

```toml
[model_providers.local]
name = "local"
base_url = "http://host.docker.internal:1234/v1"
env_key = "LOCAL_API_KEY"   # may be a dummy value for local servers
```

> **Reaching a model on your host:** from inside the container, use
> `host.docker.internal` (Docker Desktop) in the URL, or on Linux run with
> `--network host` (or `--add-host=host.docker.internal:host-gateway`).

### Bind-mount permissions

Images run as the unprivileged `node` user (uid 1000). If your host files have a
different owner, add `--user "$(id -u):$(id -g)"`.

## Use it in CI/CD (`npx`)

Each image has a matching npm wrapper whose **version is locked 1:1 to the CLI**,
so you never deal with `docker run` flags or image tags — and the package and the
image can never drift (the wrappers are generated from `versions.json` and
published in the same CI run as the images).

```sh
# runs ghcr.io/stuffbucket/codex:0.135.0 against the current directory
npx @stuffbucket/codex@0.135.0 -- exec "run the tests"

# latest
npx -y @stuffbucket/claude-code -p "summarize this repo"
```

The wrapper mounts `$PWD` at `/work`, detects TTY vs CI, forwards the CLI's
auth/endpoint env vars **that are set** (the value stays on the host side of
`-e NAME`), adds a persistent volume for the deferred-install CLIs, and wires
`host.docker.internal`. Tunables (env): `AI_CLI_REGISTRY` (use a mirror),
`AI_CLI_ENV="FOO,BAR"` (forward extra vars), `AI_CLI_MATCH_USER=1` (run as your
uid:gid on native Linux), `AI_CLI_DOCKER_ARGS` (extra docker flags).

```yaml
# GitHub Actions step — no Docker boilerplate, key injected as env
- run: npx -y @stuffbucket/codex@0.135.0 -- exec "lint and fix"
  env: { OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }} }
```

For keyless runs (the key never enters the container), front any image with the
injection proxy — [`@stuffbucket/ai-cli-key-proxy`](packages/key-proxy) — see
[`examples/key-proxy/`](examples/key-proxy).

## Repository layout

This is an npm-workspaces monorepo:

| Path | What |
| --- | --- |
| `images/<cli>/` | the Docker image contexts (published to GHCR) |
| `packages/core/` | `@stuffbucket/ai-cli-core` — shared `docker run` translator |
| `packages/clis/<cli>/` | `@stuffbucket/<cli>` — generated npx wrappers (1:1 with the CLI) |
| `packages/key-proxy/` | `@stuffbucket/ai-cli-key-proxy` — credential-injection proxy |
| `scripts/gen-clis.mjs` | regenerates the wrappers from `versions.json` (`npm run gen`) |

## How it's built

- `versions.json` is the source of truth: image name → pinned CLI version.
- `.github/workflows/build.yml` turns that into a build matrix and pushes each
  image multi-arch to `ghcr.io/stuffbucket/<name>` on every push to `main`,
  weekly (for base-image security updates), and on demand — with SBOM +
  provenance attestations. Its `publish-npm` job then publishes the npx wrappers
  **in the same run**, so the npm package version === the image tag === the CLI
  version (needs an `NPM_TOKEN` secret; without it, images still publish).
- `.github/workflows/update-versions.yml` checks npm weekly and opens a PR that
  bumps the pinned CLI versions, refreshes the digest-pinned base images, and
  regenerates the wrappers.
- `.github/workflows/cleanup-packages.yml` prunes old image versions (hygiene).
- Base images are digest-pinned and all third-party actions are SHA-pinned.

## Adding an image

1. Create `images/<name>/Dockerfile` (take `CLI_VERSION` as an `ARG`, install
   `<package>@${CLI_VERSION}`, set OCI labels, run as `node`, entrypoint = CLI).
2. Add `"<name>": "<version>"` to `versions.json`.
3. If you want automatic version bumps, add the npm package to the map in
   `update-versions.yml`.

That's it — the matrix and registry path are derived from `versions.json`.

## Licensing & redistribution

**This repository** (Dockerfiles, workflows, scripts) is **MIT**.

**The bundled CLIs are not** — and we handle each according to its terms. Every
CLI's license ships in its image at `/usr/local/share/licenses/<cli>/` and in
`images/<cli>/THIRD_PARTY_LICENSE`.

| CLI | License | How we ship it |
| --- | --- | --- |
| `codex` | **Apache-2.0** (OSI) | **Baked in.** Redistribution is permitted (incl. commercial); we include the required `LICENSE` + `NOTICE`. |
| `copilot` | **GitHub Copilot CLI License** (proprietary) | **Deferred install.** Its grant is conditional (unmodified, value-added, non-standalone), so we don't redistribute it — the image fetches it from npm at first run. |
| `claude-code` | **Anthropic proprietary — all rights reserved** | **Deferred install.** No redistribution grant, so we don't redistribute it — the image fetches it from npm at first run. |

**Why deferred install.** For the two proprietary CLIs, the published image
contains **no CLI bits** — only Node and a launcher. Distributing the image is
therefore not redistributing the CLI; each user fetches it themselves from the
official npm registry under the vendor's install-and-run terms (the case all
three licenses clearly allow). `codex` (Apache-2.0) carries no such restriction,
so it is baked in for a faster, network-free start.

If you fork or publish these, review the per-CLI terms above for your use case.
