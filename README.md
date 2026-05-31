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

- `latest` — most recent build of the default branch.
- `<version>` — the exact CLI version baked in (e.g. `claude-code:2.1.158`).
  Pin to this for reproducible environments.

### Why the bases differ

`claude-code` and `codex` run cleanly on Alpine (musl), so they use the smaller
Alpine base. The Copilot CLI's native agent binary segfaults under musl, so
`copilot` uses the glibc Debian "slim" base where it runs correctly.

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

These CLIs need your own credentials — nothing is baked in. Pass them at run
time via environment variables and/or by mounting the CLI's config directory:

```sh
# API key via env
docker run --rm -it -v "$PWD:/work" \
  -e ANTHROPIC_API_KEY ghcr.io/stuffbucket/claude-code

# Persist login between runs by mounting the config dir
docker run --rm -it -v "$PWD:/work" \
  -v "$HOME/.claude:/home/node/.claude" ghcr.io/stuffbucket/claude-code
```

Config dirs: Claude Code `~/.claude`, Copilot `~/.copilot`, Codex `~/.codex`
(inside the container, `$HOME` is `/home/node`).

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
