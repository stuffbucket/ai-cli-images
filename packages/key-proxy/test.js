"use strict";
// Tests: the proxy injects the real key, strips client-supplied auth, streams the
// body back, and enforces the optional scoped-token gate.
const http = require("node:http");
const assert = require("node:assert");
const { createProxy } = require("./index.js");

function listen(server) {
  return new Promise((res) => server.listen(0, "127.0.0.1", () => res(server.address().port)));
}
function get(port, path, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, method: "POST", headers }, (r) => {
      let body = "";
      r.on("data", (c) => (body += c));
      r.on("end", () => resolve({ status: r.statusCode, body }));
    });
    req.on("error", reject);
    req.end("{}");
  });
}

(async () => {
  let pass = 0;
  // Fake upstream echoes the auth header it received.
  let seen = null;
  const upstream = http.createServer((req, res) => {
    seen = { auth: req.headers["authorization"], xApiKey: req.headers["x-api-key"] };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, path: req.url }));
  });
  const upPort = await listen(upstream);

  // 1) injects the key, strips the client's bogus auth, forwards path+body.
  const proxy = createProxy({
    upstream: `http://127.0.0.1:${upPort}/v1`,
    injectHeader: "authorization",
    valuePrefix: "Bearer ",
    key: "REAL-SECRET",
  });
  const pPort = await listen(proxy);
  const r1 = await get(pPort, "/messages", { authorization: "Bearer CLIENT-FAKE", "content-type": "application/json" });
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(seen.auth, "Bearer REAL-SECRET", "upstream must see the injected key");
  assert.notStrictEqual(seen.auth, "Bearer CLIENT-FAKE", "client auth must be stripped");
  assert.ok(JSON.parse(r1.body).path === "/v1/messages", "upstream base path + request path");
  console.log("  ✓ injects real key, strips client auth, joins paths");
  pass++;

  // 2) token gate: without the token -> 401; with it -> passes.
  const gated = createProxy({
    upstream: `http://127.0.0.1:${upPort}/v1`,
    injectHeader: "x-api-key",
    key: "K",
    requireToken: "scoped-123",
  });
  const gPort = await listen(gated);
  const denied = await get(gPort, "/messages", {});
  assert.strictEqual(denied.status, 401, "missing token -> 401");
  const ok = await get(gPort, "/messages", { "x-ai-cli-token": "scoped-123" });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(seen.xApiKey, "K", "injects x-api-key when configured");
  console.log("  ✓ scoped-token gate (401 without, 200 with) + x-api-key injection");
  pass++;

  proxy.close(); gated.close(); upstream.close();
  console.log(`key-proxy: ${pass} passed`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
