"use strict";

// Credential-injection proxy (the Vercel-Sandbox pattern).
//
// The container/agent points its *_BASE_URL at this proxy and never holds the
// real vendor key. The proxy — running on the trusted side (your CI host, a
// sidecar, an egress gateway) — strips any client-supplied auth, injects the
// real key into the upstream request, and streams the response back (SSE-safe).
//
// Optionally it gates injection on a short-lived scoped token the container does
// hold (`requireToken`), mirroring Vercel's OIDC handshake: the container proves
// identity with a disposable token; the long-lived key stays out of the agent.

const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

// Auth-bearing headers we always strip from the inbound request so the client
// can neither leak nor override credentials.
const SENSITIVE = ["authorization", "x-api-key", "api-key", "x-ai-cli-token"];

function createProxy(opts) {
  const upstream = new URL(opts.upstream);
  const injectHeader = (opts.injectHeader || "authorization").toLowerCase();
  const valuePrefix = opts.valuePrefix || "";
  const key = opts.key || "";
  const requireToken = opts.requireToken || null;
  const agentLib = upstream.protocol === "http:" ? http : https;

  return http.createServer((req, res) => {
    // Optional scoped-token gate.
    if (requireToken && req.headers["x-ai-cli-token"] !== requireToken) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "ai-cli-key-proxy: missing or invalid x-ai-cli-token" }));
      req.resume();
      return;
    }

    // Compose upstream path = upstream base path + incoming path.
    const base = upstream.pathname.replace(/\/$/, "");
    const path = base + req.url;

    const headers = { ...req.headers };
    for (const h of SENSITIVE) delete headers[h];
    delete headers.host;
    headers.host = upstream.host;
    headers[injectHeader] = valuePrefix + key;

    const upstreamReq = agentLib.request(
      {
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port || (upstream.protocol === "http:" ? 80 : 443),
        method: req.method,
        path,
        headers,
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
        upstreamRes.pipe(res); // streams SSE/token responses unbuffered
      },
    );

    upstreamReq.on("error", (e) => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `ai-cli-key-proxy: upstream error: ${e.message}` }));
    });

    req.pipe(upstreamReq);
  });
}

function start(opts) {
  const server = createProxy(opts);
  const port = opts.port || 8787;
  const host = opts.host || "0.0.0.0";
  server.listen(port, host, () => {
    const where = `${host}:${port}`;
    console.error(
      `ai-cli-key-proxy: listening on http://${where} -> ${opts.upstream} ` +
        `(injecting ${opts.injectHeader || "authorization"}${opts.requireToken ? "; token-gated" : ""})`,
    );
  });
  return server;
}

module.exports = { createProxy, start, SENSITIVE };
