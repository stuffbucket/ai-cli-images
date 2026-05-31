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
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.version="${CLI_VERSION}"

# Run unprivileged. /work is where you mount your project.
RUN mkdir -p /work && chown node:node /work
USER node
WORKDIR /work

ENTRYPOINT ["codex"]
