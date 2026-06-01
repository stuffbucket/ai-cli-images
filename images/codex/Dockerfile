# syntax=docker/dockerfile:1
# OpenAI Codex CLI, containerized (Alpine, musl).
# Codex is Apache-2.0, so the CLI is baked in directly (redistribution is
# permitted; we ship the required LICENSE + NOTICE). Its native binary runs on
# musl, so this uses the small Alpine base.
FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14

# Pinned by versions.json; overridden per build by CI.
ARG CLI_VERSION=latest

# libstdc++/libgcc are the native binary's runtime deps; git for in-repo work;
# tini for correct PID-1 signal handling / zombie reaping (clean Ctrl-C in a TTY).
RUN apk add --no-cache bash ca-certificates git libstdc++ libgcc tini \
  && npm install -g "@openai/codex@${CLI_VERSION}" \
  && npm cache clean --force

ENV HOME="/home/node"

COPY THIRD_PARTY_LICENSE NOTICE /usr/local/share/licenses/codex/

LABEL org.opencontainers.image.title="ai-cli-codex" \
  org.opencontainers.image.description="OpenAI Codex CLI in a container" \
  org.opencontainers.image.source="https://github.com/stuffbucket/ai-cli-images" \
  org.opencontainers.image.documentation="https://github.com/stuffbucket/ai-cli-images#credentials" \
  org.opencontainers.image.base.name="docker.io/library/node:24-alpine" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.version="${CLI_VERSION}"

# Configuration contract (no credentials are baked in — supply them at runtime).
#   auth.env      : env var that authenticates against the default vendor (OpenAI)
#   endpoint.flag : self-hosted / custom models are selected via flags or config,
#                   not an env var — `--oss --local-provider ollama|lmstudio`, or
#                   a [model_providers] entry with base_url in ~/.codex/config.toml
#   config.dir    : mount this to persist login / config.toml between runs
#   workspace.dir : bind-mount your project here (alias /work)
#   install.mode  : "baked" — the CLI is installed in the image (Apache-2.0)
LABEL co.stuffbucket.cli.auth.env="OPENAI_API_KEY" \
  co.stuffbucket.cli.endpoint.flag="--oss --local-provider <ollama|lmstudio>" \
  co.stuffbucket.cli.config.dir="/home/node/.codex" \
  co.stuffbucket.cli.workspace.dir="/workspace" \
  co.stuffbucket.cli.install.mode="baked"

# Run unprivileged, but allow an arbitrary --user (uid != 1000) to still write
# config/login: own everything to gid 0 and mirror user perms to group
# (the OpenShift "arbitrary uid" pattern). /work is kept as an alias of
# /workspace for backward compatibility.
RUN mkdir -p /home/node/.codex /workspace \
  && ln -s /workspace /work \
  && chown -R node:0 /home/node /workspace \
  && chmod -R g=u /home/node /workspace
USER node
WORKDIR /workspace

ENTRYPOINT ["tini", "--", "codex"]
