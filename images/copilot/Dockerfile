# syntax=docker/dockerfile:1
# GitHub Copilot CLI — deferred-install launcher (Debian slim, glibc).
#
# This image does NOT contain the Copilot CLI. Its license grants redistribution
# only conditionally (unmodified, value-added, non-standalone), so rather than
# bake it in, the image ships Node + a bootstrap that installs the pinned version
# from the official npm registry on first run, into /home/node/.local (persist it
# with a volume). The slim/glibc base is required because Copilot's native binary
# segfaults under Alpine/musl, and the CLI needs Node 24+. See README
# "Licensing & redistribution".
FROM node:24-slim@sha256:242549cd46785b480c832479a730f4f2a20865d61ea2e404fdb2a5c3d3b73ecf

# Pinned by versions.json; overridden per build by CI. Installed at RUN-time, not build.
ARG CLI_VERSION=latest

# tini = correct PID-1 signal handling / zombie reaping for clean Ctrl-C in a TTY.
RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends bash ca-certificates git tini \
  && rm -rf /var/lib/apt/lists/*

ENV CLI_PACKAGE="@github/copilot" \
    CLI_BIN="copilot" \
    CLI_VERSION="${CLI_VERSION}" \
    HOME="/home/node" \
    NPM_CONFIG_PREFIX="/home/node/.local" \
    PATH="/home/node/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

COPY bootstrap.sh /usr/local/bin/bootstrap
COPY THIRD_PARTY_LICENSE /usr/local/share/licenses/copilot/THIRD_PARTY_LICENSE

LABEL org.opencontainers.image.title="copilot" \
  org.opencontainers.image.description="GitHub Copilot CLI (deferred-install launcher)" \
  org.opencontainers.image.source="https://github.com/stuffbucket/ai-cli-images" \
  org.opencontainers.image.documentation="https://github.com/stuffbucket/ai-cli-images#credentials" \
  org.opencontainers.image.base.name="docker.io/library/node:24-slim" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.version="${CLI_VERSION}"

# Configuration contract (no credentials are baked in — supply them at runtime).
#   auth.env     : GitHub token env var(s) for the default (GitHub-routed) models
#   endpoint.env : BYOK — point at a self-hosted / custom OpenAI-compatible
#                  endpoint; GitHub auth is then not required (key optional for
#                  local providers like Ollama)
#   config.dir   : mount this to persist an interactive login between runs
#   workspace.dir: bind-mount your project here (alias /work)
#   install.mode : "deferred" — the CLI is fetched on first run, not baked in
LABEL co.stuffbucket.cli.auth.env="COPILOT_GITHUB_TOKEN,GH_TOKEN,GITHUB_TOKEN" \
  co.stuffbucket.cli.endpoint.env="COPILOT_PROVIDER_BASE_URL" \
  co.stuffbucket.cli.config.dir="/home/node/.copilot" \
  co.stuffbucket.cli.workspace.dir="/workspace" \
  co.stuffbucket.cli.install.mode="deferred"

# Run unprivileged, but allow an arbitrary --user (uid != 1000) to still write
# config/login/install: own everything to gid 0 and mirror user perms to group
# (the OpenShift "arbitrary uid" pattern). /work is kept as an alias of
# /workspace for backward compatibility.
RUN mkdir -p /home/node/.local /home/node/.copilot /workspace \
  && ln -s /workspace /work \
  && chown -R node:0 /home/node /workspace \
  && chmod -R g=u /home/node /workspace
USER node
WORKDIR /workspace

# Persist the runtime-installed CLI across runs: docker run -v copilot-cli:/home/node/.local
VOLUME ["/home/node/.local"]

ENTRYPOINT ["tini", "--", "/usr/local/bin/bootstrap"]
