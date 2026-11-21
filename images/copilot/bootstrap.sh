#!/usr/bin/env sh
# Deferred installer.
#
# This image deliberately does NOT bake in the CLI (its license does not grant
# redistribution rights). Instead, on first run we install the pinned version
# from the official npm registry into a prefix that you can persist with a
# volume, then exec it. Distributing this image therefore does not redistribute
# the CLI — each user fetches it themselves under the vendor's install-and-run
# terms.
#
# Driven by env (set in the Dockerfile, overridable at run time):
#   CLI_PACKAGE  npm package to install        e.g. @anthropic-ai/claude-code
#   CLI_BIN      executable it provides         e.g. claude
#   CLI_VERSION  exact version to pin (or latest)
#   NPM_CONFIG_PREFIX  install location (declared a VOLUME for persistence)
set -eu

# Copilot (>= 1.0.112) refuses a storage directory it doesn't own or that is
# group/other-writable. ~/.copilot is private to the image's `node` user; when
# running as any other uid (e.g. --user "$(id -u):$(id -g)" / OpenShift), use a
# private per-uid COPILOT_HOME instead. An explicit COPILOT_HOME always wins, and
# a ~/.copilot bind-mounted from the host is used as-is when this uid owns it.
# This must run before the version probe below, which itself runs copilot.
owned_by_me() { [ "$(stat -c %u "$1" 2>/dev/null)" = "$(id -u)" ]; }
if [ -z "${COPILOT_HOME:-}" ] && ! owned_by_me "${HOME}/.copilot"; then
  for dir in "${HOME}/.copilot-$(id -u)" "${TMPDIR:-/tmp}/copilot-$(id -u)"; do
    if mkdir -p "$dir" 2>/dev/null && chmod 0700 "$dir" 2>/dev/null && owned_by_me "$dir"; then
      export COPILOT_HOME="$dir"
      break
    fi
  done
fi

prefix="${NPM_CONFIG_PREFIX:-/home/node/.local}"
bin="${prefix}/bin/${CLI_BIN}"
want="${CLI_VERSION:-latest}"

current=""
if [ -x "$bin" ]; then
  current="$("$bin" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || true)"
fi

# (Re)install when missing, or when a pinned version differs from what's there.
if [ ! -x "$bin" ] || { [ "$want" != "latest" ] && [ "$want" != "$current" ]; }; then
  echo "ai-cli-images: installing ${CLI_PACKAGE}@${want} into ${prefix}" \
       "(first run / version change — needs network; persists if ${prefix} is a volume)…" >&2
  npm install -g "${CLI_PACKAGE}@${want}" 1>&2
fi

exec "$bin" "$@"
