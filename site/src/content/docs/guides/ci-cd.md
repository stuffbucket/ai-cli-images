---
title: Use in CI/CD
description: Run the CLIs in GitHub Actions (or any CI) with a one-line npx and an env-injected key.
---

The npx wrappers make CI integration a single step — no Docker boilerplate, no
image-tag bookkeeping (the wrapper version pins the image).

## GitHub Actions

```yaml
- name: Codex — lint and fix
  run: npx -y @stuffbucket/ai-cli-codex@0.135.0 -- exec "lint and fix"
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

The wrapper detects the non-TTY CI environment automatically (`-i`, no `-it`),
mounts the workspace, and forwards `OPENAI_API_KEY` because it's set.

## Pin for reproducibility

Pin the wrapper to an exact version so the run is deterministic — that version is
the CLI version and the image tag:

```sh
npx @stuffbucket/ai-cli-claude@2.1.158 -- -p "review the diff"
```

## Keyless CI

To keep the key out of the job's container entirely, run the
[injection proxy](/ai-cli-images/guides/self-hosted/#keep-the-key-out-of-the-container)
as a sidecar/service and point the CLI at it with `*_BASE_URL`.

## Using the image directly

You can also `docker run` the image in a step, or reference it as a job
`container:` — though the wrapper handles the mount/TTY/auth wiring for you. The
images run as a non-root user; see
[Runtimes & rootless](/ai-cli-images/guides/runtimes/).
