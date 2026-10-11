import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Sets env vars for every test file before any app code loads.
    setupFiles: ['./tests/setup.ts'],
    // Database tests share one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
