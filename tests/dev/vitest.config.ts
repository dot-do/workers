import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

/**
 * Development Testing Configuration
 *
 * Tests in this directory run with `wrangler dev`, which automatically
 * connects to deployed workers via service bindings.
 *
 * Prerequisites:
 * 1. Workers must be deployed (yaml, esbuild, etc.)
 * 2. Run `wrangler dev` in this directory
 * 3. Run tests in another terminal
 *
 * The service bindings in wrangler.jsonc automatically RPC to deployed
 * workers when running under `wrangler dev`. No API tokens needed -
 * wrangler OAuth handles authentication.
 */
export default defineWorkersConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.jsonc',
        },
      },
    },
  },
})
