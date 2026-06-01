// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// GitHub Pages project site: served at https://stuffbucket.github.io/ai-cli-images
const GITHUB_USER = 'stuffbucket';
const REPO_NAME = 'ai-cli-images';

export default defineConfig({
  site: `https://${GITHUB_USER}.github.io`,
  base: `/${REPO_NAME}`,
  integrations: [
    starlight({
      title: 'ai-cli-images',
      description:
        'Container images and version-synced npx wrappers for AI coding-assistant CLIs — Claude Code, GitHub Copilot, and OpenAI Codex.',
      lastUpdated: true,
      editLink: {
        baseUrl: `https://github.com/${GITHUB_USER}/${REPO_NAME}/edit/main/site/`,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: `https://github.com/${GITHUB_USER}/${REPO_NAME}`,
        },
      ],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 },
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Quick start', slug: 'getting-started/quickstart' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'The images', slug: 'guides/images' },
            { label: 'npx wrappers', slug: 'guides/npx-wrappers' },
            { label: 'Credentials', slug: 'guides/credentials' },
            { label: 'Self-hosted models', slug: 'guides/self-hosted' },
            { label: 'Use in CI/CD', slug: 'guides/ci-cd' },
            { label: 'Runtimes & rootless', slug: 'guides/runtimes' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Config & labels', slug: 'reference/config' },
            { label: 'Licensing & redistribution', slug: 'reference/licensing' },
            { label: 'How it is built', slug: 'reference/architecture' },
          ],
        },
      ],
    }),
  ],
});
