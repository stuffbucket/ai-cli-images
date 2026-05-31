# syntax=docker/dockerfile:1
# Anthropic Claude Code CLI, containerized.
# Claude Code runs cleanly on musl, so this uses the small Alpine base.
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine

# Pinned by versions.json; overridden per build by CI.
ARG CLI_VERSION=latest

# bash for interactive use, git because the agent typically works inside a repo.
RUN apk add --no-cache bash ca-certificates git \
  && npm install -g "@anthropic-ai/claude-code@${CLI_VERSION}" \
  && npm cache clean --force

LABEL org.opencontainers.image.title="claude-code" \
  org.opencontainers.image.description="Anthropic Claude Code CLI in a container" \
  org.opencontainers.image.source="https://github.com/stuffbucket/ai-cli-images" \
  org.opencontainers.image.documentation="https://github.com/stuffbucket/ai-cli-images#credentials" \
  org.opencontainers.image.base.name="docker.io/library/node:24-alpine" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.version="${CLI_VERSION}"

# Configuration contract (no credentials are baked in — supply them at runtime).
#   auth.env    : env var(s) that authenticate non-interactively
#   config.dir  : mount this to persist an interactive login between runs
LABEL co.stuffbucket.cli.auth.env="ANTHROPIC_API_KEY" \
  co.stuffbucket.cli.config.dir="/home/node/.claude"

# Run unprivileged. /work is where you mount your project.
RUN mkdir -p /work && chown node:node /work
USER node
WORKDIR /work

ENTRYPOINT ["claude"]
