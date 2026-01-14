/**
 * Vitest Configuration for workers.do
 *
 * Uses @cloudflare/vitest-pool-workers for real Durable Object testing
 * with miniflare. NO MOCKS - real SQLite storage.
 *
 * Run with: npx vitest run
 *
 * @see https://developers.cloudflare.com/workers/testing/vitest-integration/
 */

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import { resolve } from 'path'

export default defineWorkersConfig({
  resolve: {
    alias: {
      // Point dotdo/objects to DOBase which provides the DO class
      'dotdo/objects': resolve(__dirname, 'node_modules/dotdo/dist/objects/DOBase.js'),
    },
  },
  test: {
    // Enable globals (describe, it, expect) without imports
    globals: true,

    // Include test files
    include: ['tests/**/*.test.ts'],

    // Pool configuration for Cloudflare Workers
    poolOptions: {
      workers: {
        // Use the wrangler config for DO bindings
        wrangler: { configPath: './wrangler.jsonc' },

        // Isolate storage between tests for deterministic results
        // Each test starts with clean DO state
        isolatedStorage: true,

        // Single worker mode for stability
        singleWorker: true,

        // Miniflare options
        miniflare: {
          // Enable verbose logging in debug mode
          verbose: process.env.DEBUG === 'true',

          // Compatibility settings matching wrangler.jsonc
          compatibilityDate: '2026-01-08',
          compatibilityFlags: ['nodejs_compat'],
        },
      },
    },

    // Test timeout (DO operations may be slower)
    testTimeout: 15_000,
    hookTimeout: 15_000,

    // Run tests sequentially for isolation
    sequence: {
      concurrent: false,
    },
  },
})
