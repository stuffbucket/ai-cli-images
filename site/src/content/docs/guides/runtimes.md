---
title: Runtimes & rootless
description: It just works on Docker Desktop and Linux — plus the few flags you only need for specific setups.
---

## The basic command — no special flags

On **Docker Desktop** (macOS/Windows) and on **Linux**, this is all you need:

```sh
docker run --rm -it -v "$PWD:/workspace" ghcr.io/stuffbucket/ai-cli-codex
```

…or just `npx -y @stuffbucket/ai-cli-codex`. No `--user`, no `--add-host`, no uid
juggling. That's the path for the large majority of use.

## Why are there extra flags elsewhere?

Most containers are self-contained — they don't touch your files and don't call
back to your machine, so they need nothing special. These CLIs do **both**: they
edit your mounted project, and they may talk to a model endpoint. Those two
host-integration points are the *only* reason any extra flag exists, and you add
one **only if you hit its specific case**:

| Add this | Only when |
| --- | --- |
| `--add-host=host.docker.internal:host-gateway` | you point the CLI at a model server on your **host** **and** you're not on Docker Desktop (where it's built in). |
| `--user "$(id -u):$(id -g)"` | on **native Linux**, files the CLI writes come out owned by uid 1000 and your host user isn't 1000. |
| `--userns=keep-id:uid=1000,gid=1000` | you use **rootless Podman**. |

On Docker Desktop, using a vendor API (not a local model), you need none of them.

## Rootless by design

The CLIs run as the unprivileged **`node` user (uid/gid 1000)** — `USER node` is
baked into every image and nothing at runtime needs root, so they also run under
rootless Podman / rootless Docker. `$HOME` and `/workspace` are gid-0
group-writable, so even an arbitrary `--user` can still write config and login.

## macOS notes

Everything runs in a Linux VM (Docker Desktop, Colima, Lima, OrbStack), so it's
functionally identical to Linux. The one real quirk is that bind-mount I/O is
slower than native Linux; for big repos, `colima start --mount-type=virtiofs`
helps.

## Colima / Lima

Same images, no rebuild. Colima's VM user is uid 1000, which matches the
container's `node` user, so bind mounts behave. Add
`--add-host=host.docker.internal:host-gateway` only if you reach a host service.

## Incus

You don't need a system container — Incus runs the OCI images directly:

```sh
incus remote add ghcr https://ghcr.io --protocol oci
incus launch ghcr:stuffbucket/ai-cli-codex codex -- --version
```

Incus instances are persistent, so the first-run install into `/home/node/.local`
survives restarts — no named volume needed. (Incus's OCI support is best for
non-interactive use; for interactive CLIs, Docker or Podman is smoother.)
