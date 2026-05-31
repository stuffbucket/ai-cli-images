# syntax=docker/dockerfile:1
# GitHub Copilot CLI, containerized.
# Copilot ships a native agent binary that segfaults under Alpine/musl, so this
# uses the glibc Debian "slim" base where the binary runs correctly. The CLI
# also requires Node 24+.
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-slim

# Pinned by versions.json; overridden per build by CI.
ARG CLI_VERSION=latest

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends bash ca-certificates git \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g "@github/copilot@${CLI_VERSION}" \
  && npm cache clean --force

LABEL org.opencontainers.image.title="copilot" \
  org.opencontainers.image.description="GitHub Copilot CLI in a container" \
  org.opencontainers.image.source="https://github.com/stuffbucket/ai-cli-images" \
  org.opencontainers.image.documentation="https://github.com/stuffbucket/ai-cli-images#credentials" \
  org.opencontainers.image.base.name="docker.io/library/node:24-slim" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.version="${CLI_VERSION}"

# Configuration contract (no credentials are baked in — supply them at runtime).
#   auth.env    : env var(s) that authenticate non-interactively
#   config.dir  : mount this to persist an interactive login between runs
LABEL co.stuffbucket.cli.auth.env="COPILOT_GITHUB_TOKEN,GH_TOKEN,GITHUB_TOKEN" \
  co.stuffbucket.cli.config.dir="/home/node/.copilot"

# Run unprivileged. /work is where you mount your project.
RUN mkdir -p /work && chown node:node /work
USER node
WORKDIR /work

ENTRYPOINT ["copilot"]
