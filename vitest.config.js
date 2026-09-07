import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,mjs}'],
    // UI tests opt into jsdom per-file with `// @vitest-environment jsdom`
    environmentMatchGlobs: [],
  },
});
