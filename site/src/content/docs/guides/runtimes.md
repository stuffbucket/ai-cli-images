---
title: Runtimes & rootless
description: Docker Desktop, native Linux, Colima/Lima, Podman, and Incus — plus how the CLIs run rootless.
---

## Rootless by design

The CLIs run as the unprivileged **`node` user (uid/gid 1000)** — `USER node` is
baked into every image. Nothing in the runtime path needs root: the deferred
install writes to `/home/node/.local`, config dirs are node-owned, and
`/workspace` is gid-0 group-writable (so even an arbitrary `--user` can write).
Root is used only at build time.

Because there's no runtime root dependency, the images also run under **rootless
engines** (rootless Podman / rootless Docker).

## macOS vs Linux

Functionally identical (multi-arch, native on Apple Silicon and Intel/Linux).
macOS-only caveats: bind-mount I/O is slower (VirtioFS), and
`host.docker.internal` is built-in on Docker Desktop but needs
`--add-host=host.docker.internal:host-gateway` elsewhere.

## Colima / Podman / native Linux

Off Docker Desktop, the container `node` uid (1000) and `host.docker.internal`
aren't auto-provided:

```sh
docker run --rm -it \
  -v "$PWD:/workspace" \
  --user "$(id -u):$(id -g)" \                   # match host file ownership (native Linux)
  --add-host=host.docker.internal:host-gateway \ # reach a model on the host
  ghcr.io/stuffbucket/codex
# Podman (rootless): add  --userns=keep-id:uid=1000,gid=1000
# Colima:            colima start --mount-type=virtiofs
```

The gid-0 writable home means an arbitrary `--user` still writes config/login.

## Incus

You don't need to build a system container — Incus runs the OCI images directly
as application containers:

```sh
incus remote add ghcr https://ghcr.io --protocol oci
incus launch ghcr:stuffbucket/codex codex -- --version
```

The deferred-install model fits Incus well: instances are persistent, so the
first-run install into `/home/node/.local` survives restarts in the instance's
own rootfs — no named volume needed. Incus's OCI application-container support is
less mature than Docker/Podman for interactive CLIs; for day-to-day interactive
use, Docker or Podman is smoother.
