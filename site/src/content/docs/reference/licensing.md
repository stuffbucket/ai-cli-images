---
title: Licensing & redistribution
description: This repo is MIT; the bundled CLIs are not — and we handle each per its terms.
---

**This repository** (Dockerfiles, workflows, wrappers, proxy) is **MIT**.

**The bundled CLIs are not** — and each is handled according to its license.
Every CLI's license ships in its image at `/usr/local/share/licenses/<cli>/` and
in `images/<cli>/THIRD_PARTY_LICENSE`.

| CLI | License | How we ship it |
| --- | --- | --- |
| `codex` | **Apache-2.0** (OSI) | **Baked in** — redistribution permitted; we include the required `LICENSE` + `NOTICE`. |
| `copilot` | **GitHub Copilot CLI License** (proprietary) | **Deferred install** — its grant is conditional, so the image fetches it from npm at first run. |
| `claude-code` | **Anthropic, all rights reserved** | **Deferred install** — no redistribution grant, so the image fetches it from npm at first run. |

## Why deferred install

For the two proprietary CLIs, the published image contains **no CLI bits** — only
Node and a launcher. Distributing the image is therefore not redistributing the
CLI; each user fetches it from the official npm registry under the vendor's
install-and-run terms (the case all three licenses clearly allow). `codex`
(Apache-2.0) carries no such restriction, so it is baked in for a faster,
network-free start.

If you fork or publish these, review the per-CLI terms for your use case.
