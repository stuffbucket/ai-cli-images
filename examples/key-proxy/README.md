# Keyless agent via the injection proxy

Demonstrates the [Vercel Sandbox](https://vercel.com/docs/sandbox) credential
pattern with these images: the model API key reaches **only** a small proxy on
the trusted side; the agent container never holds it.

```
host env: ANTHROPIC_API_KEY ──▶ key-proxy ──(injects x-api-key)──▶ api.anthropic.com
                                    ▲
claude container ── ANTHROPIC_BASE_URL=http://key-proxy:8787 ──┘   (no key here)
```

## Run it

```sh
ANTHROPIC_API_KEY=sk-... \
  docker compose -f examples/key-proxy/compose.yml run --rm claude -p "say hi"
```

The `claude` service is configured with only `ANTHROPIC_BASE_URL` (the proxy) and
a throwaway `ANTHROPIC_AUTH_TOKEN`; the real key is passed solely to `key-proxy`.

## Without compose

Run the proxy anywhere on the trusted side (host, sidecar, egress gateway):

```sh
PROXY_UPSTREAM=https://api.anthropic.com \
PROXY_INJECT_HEADER=x-api-key \
PROXY_KEY_ENV=ANTHROPIC_API_KEY \
  npx -y @stuffbucket/ai-cli-key-proxy
```

then point any of the images at it:

```sh
docker run --rm -it -v "$PWD:/work" \
  --add-host=host.docker.internal:host-gateway \
  -e ANTHROPIC_BASE_URL=http://host.docker.internal:8787 \
  -e ANTHROPIC_AUTH_TOKEN=local \
  ghcr.io/stuffbucket/claude-code
```

## Hardening: scoped tokens

Set `PROXY_REQUIRE_TOKEN=<scoped-token>` on the proxy and have the container send
`x-ai-cli-token: <scoped-token>` (configure it as a custom header where the CLI
supports one, or front the proxy with your own auth). The proxy rejects requests
without it — mirroring Vercel's short-lived-OIDC handshake, so a leaked container
still can't reach the upstream without the disposable token.
