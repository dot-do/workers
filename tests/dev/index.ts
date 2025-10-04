/**
 * Test Worker for Development Testing
 *
 * This worker is used for local development testing with `wrangler dev`.
 * It has service bindings to deployed workers (yaml, esbuild), allowing
 * tests to run locally while calling deployed workers via RPC.
 *
 * Usage:
 *   cd tests/dev
 *   wrangler dev
 *
 * In another terminal:
 *   pnpm vitest run
 *
 * The service bindings automatically RPC to deployed workers when running
 * under `wrangler dev`. No API tokens or remote:true config needed -
 * OAuth handles authentication.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'

interface Env {
  YAML_SERVICE: any
  ESBUILD_SERVICE: any
}

export default class TestWorker extends WorkerEntrypoint<Env> {
  async fetch() {
    return new Response('Test worker for development testing\n\nRun: wrangler dev', {
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

// Export env for tests
export { Env }
