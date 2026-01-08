import { defineConfig } from 'vitest/config'

// Use standard vitest config that delegates to package-level configs
// Tests run from packages/do using its own vitest.config.ts (Node environment)
export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'sdks/*/test/**/*.test.ts', 'sdks/*/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
