# syntax=docker/dockerfile:1
# OpenAI Codex CLI, containerized.
# Codex's native binary runs on musl, so this uses the small Alpine base.
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine

# Pinned by versions.json; overridden per build by CI.
ARG CLI_VERSION=latest

# libstdc++/libgcc are the native binary's runtime deps; git for in-repo work.
RUN apk add --no-cache bash ca-certificates git libstdc++ libgcc \
  && npm install -g "@openai/codex@${CLI_VERSION}" \
  && npm cache clean --force

LABEL org.opencontainers.image.title="codex" \
  org.opencontainers.image.description="OpenAI Codex CLI in a container" \
  org.opencontainers.image.source="https://github.com/stuffbucket/ai-cli-images" \
  org.opencontainers.image.documentation="https://github.com/stuffbucket/ai-cli-images#credentials" \
  org.opencontainers.image.base.name="docker.io/library/node:24-alpine" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.version="${CLI_VERSION}"

# Configuration contract (no credentials are baked in — supply them at runtime).
#   auth.env    : env var(s) that authenticate non-interactively
#   config.dir  : mount this to persist an interactive login between runs
LABEL co.stuffbucket.cli.auth.env="OPENAI_API_KEY" \
  co.stuffbucket.cli.config.dir="/home/node/.codex"

# Run unprivileged. /work is where you mount your project.
RUN mkdir -p /work && chown node:node /work
USER node
WORKDIR /work

ENTRYPOINT ["codex"]
