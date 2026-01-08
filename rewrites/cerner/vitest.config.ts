import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
