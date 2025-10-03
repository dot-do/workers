import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'Integration Tests',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    teardownTimeout: 10000,
    globals: true,
    environment: 'node',
    pool: 'forks', // Use forks for better isolation
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially for consistency
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.ts',
        '**/setup.ts',
      ],
    },
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/integration-results.json',
      html: './test-results/integration-results.html',
    },
    bail: 0, // Don't bail on first failure
    retry: 1, // Retry flaky tests once
    sequence: {
      shuffle: false, // Run tests in order
    },
  },
})
