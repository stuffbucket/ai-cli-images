"use strict";
// Unit tests for buildArgs — pure, no docker required.
const assert = require("node:assert");
const { buildArgs } = require("./index.js");

let pass = 0;
function t(name, fn) {
  fn();
  console.log(`  ✓ ${name}`);
  pass++;
}

const baseEnv = { AI_CLI_WORKDIR: "/repo" };

t("codex (baked): image tag + workspace, no install volume", () => {
  const a = buildArgs({ cli: "codex", version: "0.135.0" }, ["--version"], baseEnv, false);
  assert.deepStrictEqual(a, [
    "run", "--rm", "-i",
    "-v", "/repo:/workspace",
    "--add-host=host.docker.internal:host-gateway",
    "ghcr.io/stuffbucket/ai-cli-codex:0.135.0",
    "--version",
  ]);
});

t("claude-code (deferred): adds the persistent install volume", () => {
  const a = buildArgs({ cli: "claude-code", version: "2.1.158" }, [], baseEnv, false);
  const i = a.indexOf("aicli-claude-code:/home/node/.local");
  assert.ok(i > 0 && a[i - 1] === "-v", "deferred image gets a -v install volume");
  assert.ok(a.includes("ghcr.io/stuffbucket/ai-cli-claude:2.1.158"));
});

t("forwards only auth env vars that are set", () => {
  const env = { ...baseEnv, ANTHROPIC_API_KEY: "sk-x", ANTHROPIC_BASE_URL: "" };
  const a = buildArgs({ cli: "claude-code", version: "2.1.158" }, [], env, false);
  // both are 'set' (defined) -> both forwarded by name
  const flags = a.filter((x, i) => a[i - 1] === "-e");
  assert.ok(flags.includes("ANTHROPIC_API_KEY"));
  assert.ok(flags.includes("ANTHROPIC_BASE_URL"));
  assert.ok(!flags.includes("ANTHROPIC_AUTH_TOKEN")); // not set
});

t("TTY -> -it, non-TTY -> -i", () => {
  assert.ok(buildArgs({ cli: "codex", version: "1" }, [], baseEnv, true).includes("-it"));
  assert.ok(buildArgs({ cli: "codex", version: "1" }, [], baseEnv, false).includes("-i"));
});

t("registry override via AI_CLI_REGISTRY", () => {
  const a = buildArgs({ cli: "codex", version: "1" }, [], { ...baseEnv, AI_CLI_REGISTRY: "reg.local/x" }, false);
  assert.ok(a.includes("reg.local/x/ai-cli-codex:1"));
});

t("AI_CLI_ENV adds extra pass-through vars; AI_CLI_DOCKER_ARGS appended", () => {
  const env = { ...baseEnv, AI_CLI_ENV: "FOO, BAR", AI_CLI_DOCKER_ARGS: "--network none" };
  const a = buildArgs({ cli: "codex", version: "1" }, ["x"], env, false);
  const flags = a.filter((x, i) => a[i - 1] === "-e");
  assert.ok(flags.includes("FOO") && flags.includes("BAR"));
  assert.ok(a.includes("--network") && a.includes("none"));
});

t("unknown cli throws", () => {
  assert.throws(() => buildArgs({ cli: "nope", version: "1" }, [], baseEnv, false));
});

console.log(`core: ${pass} passed`);
