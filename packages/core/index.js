"use strict";

// Shared runner for the @stuffbucket/<cli> npx wrappers.
//
// Each thin wrapper calls run({ cli, version }, argv): we translate that into a
// `docker run` of ghcr.io/stuffbucket/<cli>:<version> with CI-friendly defaults
// (workspace mount, TTY detection, auth/endpoint env pass-through, a persistent
// volume for the deferred-install images, host-gateway for self-hosted models).
//
// The wrapper's version === the CLI version === the image tag (1:1), so
// `npx @stuffbucket/claude-code@2.1.158` runs the claude-code:2.1.158 image.

const { spawnSync } = require("node:child_process");

// Per-CLI runtime contract — kept in lockstep with the image labels
// (co.stuffbucket.cli.*). `deferred` mirrors install.mode.
const CLI = {
  "claude-code": {
    image: "claude-code",
    deferred: true,
    env: ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL"],
    config: "/home/node/.claude",
  },
  copilot: {
    image: "copilot",
    deferred: true,
    env: [
      "COPILOT_GITHUB_TOKEN",
      "GH_TOKEN",
      "GITHUB_TOKEN",
      "COPILOT_PROVIDER_BASE_URL",
      "COPILOT_PROVIDER_API_KEY",
      "COPILOT_PROVIDER_TYPE",
    ],
    config: "/home/node/.copilot",
  },
  codex: {
    image: "codex",
    deferred: false,
    env: ["OPENAI_API_KEY"],
    config: "/home/node/.codex",
  },
};

// Naive shell-ish splitter for AI_CLI_DOCKER_ARGS (space-separated, quotes honored).
function splitArgs(s) {
  const out = s.match(/"[^"]*"|'[^']*'|\S+/g) || [];
  return out.map((a) => a.replace(/^['"]|['"]$/g, ""));
}

// Build the full `docker` argv. Pure (reads env via `env` arg) so it is testable
// without invoking docker.
function buildArgs({ cli, version }, argv = [], env = process.env, tty = undefined) {
  const spec = CLI[cli];
  if (!spec) throw new Error(`unknown cli: ${cli}`);
  const registry = env.AI_CLI_REGISTRY || "ghcr.io/stuffbucket";
  const image = `${registry}/${spec.image}:${version}`;

  const interactive =
    tty !== undefined
      ? tty
      : Boolean(process.stdin.isTTY && process.stdout.isTTY) && !env.CI;

  const args = ["run", "--rm"];
  args.push(interactive ? "-it" : "-i");

  // Workspace at /work (alias /workspace).
  const workdir = env.AI_CLI_WORKDIR || process.cwd();
  args.push("-v", `${workdir}:/work`);

  // Match host file ownership off Docker Desktop (harmless on Docker Desktop).
  if (env.AI_CLI_MATCH_USER === "1") {
    // Caller opts in; uid/gid resolved by the shell via the wrapper if needed.
    args.push("--user", `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 0}`);
  }

  // Reach a model server on the host (Colima/Podman/native Linux).
  args.push("--add-host=host.docker.internal:host-gateway");

  // Persist the runtime-installed CLI for the deferred images.
  if (spec.deferred) {
    args.push("-v", `aicli-${spec.image}:/home/node/.local`);
  }

  // Forward auth/endpoint env vars that are actually set (value stays on the host
  // side of `-e NAME`, never embedded in the image).
  for (const name of spec.env) {
    if (env[name] !== undefined) args.push("-e", name);
  }
  // Extra user-specified env: AI_CLI_ENV="FOO,BAR"
  if (env.AI_CLI_ENV) {
    for (const name of env.AI_CLI_ENV.split(",").map((s) => s.trim()).filter(Boolean)) {
      args.push("-e", name);
    }
  }

  // Escape hatch for arbitrary docker flags.
  if (env.AI_CLI_DOCKER_ARGS) args.push(...splitArgs(env.AI_CLI_DOCKER_ARGS));

  args.push(image, ...argv);
  return args;
}

function run(target, argv = []) {
  let args;
  try {
    args = buildArgs(target, argv);
  } catch (e) {
    console.error(`ai-cli: ${e.message}`);
    process.exit(2);
  }
  const r = spawnSync("docker", args, { stdio: "inherit" });
  if (r.error) {
    if (r.error.code === "ENOENT") {
      console.error("ai-cli: docker not found on PATH. Install Docker (or Podman with a `docker` shim).");
    } else {
      console.error(`ai-cli: failed to start docker: ${r.error.message}`);
    }
    process.exit(127);
  }
  process.exit(r.status == null ? 1 : r.status);
}

module.exports = { run, buildArgs, CLI };
