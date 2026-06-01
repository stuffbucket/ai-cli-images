# syntax=docker/dockerfile:1
# Anthropic Claude Code CLI — deferred-install launcher (Alpine, musl).
#
# This image does NOT contain the Claude Code CLI. Because the CLI is proprietary
# (all rights reserved, no redistribution grant), the image ships only Node + a
# bootstrap that installs the pinned version from the official npm registry on
# first run, into /home/node/.local (persist it with a volume). Distributing this
# image does not redistribute the CLI. See README "Licensing & redistribution".
FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14

# Pinned by versions.json; overridden per build by CI. Installed at RUN-time, not build.
ARG CLI_VERSION=latest

# tini = correct PID-1 signal handling / zombie reaping for clean Ctrl-C in a TTY.
RUN apk add --no-cache bash ca-certificates git tini

ENV CLI_PACKAGE="@anthropic-ai/claude-code" \
    CLI_BIN="claude" \
    CLI_VERSION="${CLI_VERSION}" \
    HOME="/home/node" \
    NPM_CONFIG_PREFIX="/home/node/.local" \
    PATH="/home/node/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

COPY bootstrap.sh /usr/local/bin/bootstrap
COPY THIRD_PARTY_LICENSE /usr/local/share/licenses/claude-code/THIRD_PARTY_LICENSE

LABEL org.opencontainers.image.title="ai-cli-claude" \
  org.opencontainers.image.description="Anthropic Claude Code CLI (deferred-install launcher)" \
  org.opencontainers.image.source="https://github.com/stuffbucket/ai-cli-images" \
  org.opencontainers.image.documentation="https://github.com/stuffbucket/ai-cli-images#credentials" \
  org.opencontainers.image.base.name="docker.io/library/node:24-alpine" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.version="${CLI_VERSION}"

# Configuration contract (no credentials are baked in — supply them at runtime).
#   auth.env     : env var(s) that authenticate against the default vendor
#   endpoint.env : point at a self-hosted / custom endpoint (a vendor key is then
#                  optional — use ANTHROPIC_AUTH_TOKEN, or a dummy ANTHROPIC_API_KEY)
#   config.dir   : mount this to persist an interactive login between runs
#   workspace.dir: bind-mount your project here (alias /work)
#   install.mode : "deferred" — the CLI is fetched on first run, not baked in
LABEL co.stuffbucket.cli.auth.env="ANTHROPIC_API_KEY" \
  co.stuffbucket.cli.endpoint.env="ANTHROPIC_BASE_URL" \
  co.stuffbucket.cli.config.dir="/home/node/.claude" \
  co.stuffbucket.cli.workspace.dir="/workspace" \
  co.stuffbucket.cli.install.mode="deferred"

# Run unprivileged, but allow an arbitrary --user (uid != 1000) to still write
# config/login/install: own everything to gid 0 and mirror user perms to group
# (the OpenShift "arbitrary uid" pattern). /work is kept as an alias of
# /workspace for backward compatibility.
RUN mkdir -p /home/node/.local /home/node/.claude /workspace \
  && ln -s /workspace /work \
  && chown -R node:0 /home/node /workspace \
  && chmod -R g=u /home/node /workspace
USER node
WORKDIR /workspace

# Persist the runtime-installed CLI across runs: docker run -v claude-cli:/home/node/.local
VOLUME ["/home/node/.local"]

ENTRYPOINT ["tini", "--", "/usr/local/bin/bootstrap"]
