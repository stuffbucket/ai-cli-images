#!/usr/bin/env node
// Sync the docs site with the repo's source of truth.
//
// Reads ../versions.json and writes src/data/versions.json (enriched with the
// image tag and npx wrapper name per CLI) so the docs render current versions
// without hand-editing. Run before `astro dev`/`astro build`.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..'); // repo root (site/scripts -> repo)
const versions = JSON.parse(readFileSync(join(root, 'versions.json'), 'utf8'));

// Wrapper short-name overrides (must match scripts/gen-clis.mjs).
const SHORT = { 'claude-code': 'claude' };

const CLI_LABEL = {
  'claude-code': 'Claude Code',
  copilot: 'GitHub Copilot',
  codex: 'OpenAI Codex',
};

const data = Object.fromEntries(
  Object.entries(versions).map(([image, meta]) => {
    const short = SHORT[image] || image;
    return [
      image,
      {
        image,
        label: CLI_LABEL[image] || image,
        version: meta.version,
        base: meta.base,
        tag: `${meta.version}-${meta.base}`,
        wrapper: `@stuffbucket/ai-cli-${short}`,
        ghcr: `ghcr.io/stuffbucket/${image}`,
      },
    ];
  }),
);

const out = join(here, '..', 'src', 'data');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'versions.json'), JSON.stringify(data, null, 2) + '\n');
console.log(`synced ${Object.keys(data).length} versions -> src/data/versions.json`);
