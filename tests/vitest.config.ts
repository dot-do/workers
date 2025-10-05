import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds per test
    hookTimeout: 60000, // 60 seconds for setup/teardown
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['../*/src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
      ],
    },
    // Run tests sequentially by default (can be overridden)
    sequence: {
      concurrent: false,
    },
    // Retry failed tests
    retry: 1,
    // Environment variables
    env: {
      TEST_API_BASE_URL: process.env.TEST_API_BASE_URL || 'http://localhost:8787',
      TEST_MCP_SERVER_URL: process.env.TEST_MCP_SERVER_URL || 'https://mcp.do',
    },
  },
})
