# ai-cli-images

Small, ready-to-run container images for AI coding-assistant CLIs, published to
the GitHub Container Registry for the community.

Each image bundles one CLI on a minimal base, runs as an unprivileged user, and
mounts your project at `/work`. Multi-arch (`linux/amd64`, `linux/arm64`).

## Images

| Image | CLI | Base | Pull |
| --- | --- | --- | --- |
| `claude-code` | [Anthropic Claude Code](https://www.npmjs.com/package/@anthropic-ai/claude-code) | `node:24-alpine` | `docker pull ghcr.io/stuffbucket/claude-code` |
| `copilot` | [GitHub Copilot CLI](https://www.npmjs.com/package/@github/copilot) | `node:24-slim` | `docker pull ghcr.io/stuffbucket/copilot` |
| `codex` | [OpenAI Codex CLI](https://www.npmjs.com/package/@openai/codex) | `node:24-alpine` | `docker pull ghcr.io/stuffbucket/codex` |

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

Mount your project into `/work` and run the CLI (the image's entrypoint is the
CLI itself, so anything after the image name is passed straight to it):

```sh
# Claude Code — check version
docker run --rm ghcr.io/stuffbucket/claude-code --version

# Run a CLI against the current directory
docker run --rm -it -v "$PWD:/work" ghcr.io/stuffbucket/codex

# Drop into a shell instead of the CLI
docker run --rm -it --entrypoint bash -v "$PWD:/work" ghcr.io/stuffbucket/claude-code
```

### Credentials

**The expectation: these images ship _no_ credentials by design.** Each is just
the CLI on a clean base — you supply your own account/keys at run time. There
are two ways to do that, and you can mix them:

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

### Bind-mount permissions

Images run as the unprivileged `node` user (uid 1000). If your host files have a
different owner, add `--user "$(id -u):$(id -g)"`.

## How it's built

- `versions.json` is the source of truth: image name → pinned CLI version.
- `.github/workflows/build.yml` turns that into a build matrix and pushes each
  image multi-arch to `ghcr.io/stuffbucket/<name>` on every push to `main`,
  weekly (for base-image security updates), and on demand.
- `.github/workflows/update-versions.yml` checks npm weekly and opens a PR when
  a newer CLI version ships.

## Adding an image

1. Create `images/<name>/Dockerfile` (take `CLI_VERSION` as an `ARG`, install
   `<package>@${CLI_VERSION}`, set OCI labels, run as `node`, entrypoint = CLI).
2. Add `"<name>": "<version>"` to `versions.json`.
3. If you want automatic version bumps, add the npm package to the map in
   `update-versions.yml`.

That's it — the matrix and registry path are derived from `versions.json`.

## License

MIT. The CLIs themselves are under their own licenses and are installed from
their official npm packages at build time; this repo only packages them.
