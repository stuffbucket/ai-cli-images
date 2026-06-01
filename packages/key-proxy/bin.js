#!/usr/bin/env node
"use strict";
// CLI entry: configure the injection proxy entirely from env so the key is read
// from the environment (never a process arg / shell history).
//
//   PROXY_UPSTREAM       required, e.g. https://api.anthropic.com
//   PROXY_PORT           default 8787
//   PROXY_INJECT_HEADER  header to inject (default authorization;
//                        use x-api-key for Anthropic's native API)
//   PROXY_VALUE_PREFIX   e.g. "Bearer " for Authorization (default "")
//   PROXY_KEY_ENV        name of the env var holding the real key
//                        (preferred); or PROXY_KEY with the literal value
//   PROXY_REQUIRE_TOKEN  if set, clients must send x-ai-cli-token: <value>
const { start } = require("./index.js");

const upstream = process.env.PROXY_UPSTREAM;
if (!upstream) {
  console.error("ai-cli-key-proxy: PROXY_UPSTREAM is required (e.g. https://api.anthropic.com)");
  process.exit(2);
}
const keyEnv = process.env.PROXY_KEY_ENV;
const key = keyEnv ? process.env[keyEnv] : process.env.PROXY_KEY;
if (!key) {
  console.error("ai-cli-key-proxy: no key found (set PROXY_KEY_ENV to a populated env var, or PROXY_KEY)");
  process.exit(2);
}

start({
  upstream,
  port: Number(process.env.PROXY_PORT) || 8787,
  injectHeader: process.env.PROXY_INJECT_HEADER || "authorization",
  valuePrefix: process.env.PROXY_VALUE_PREFIX || "",
  key,
  requireToken: process.env.PROXY_REQUIRE_TOKEN || null,
});
