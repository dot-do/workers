/**
 * workers.do - The complete platform for building on Cloudflare Workers
 *
 * Umbrella package that re-exports:
 * - workers.do/middleware → @dotdo/middleware
 * - workers.do/auth → @dotdo/auth
 * - workers.do/rpc → @dotdo/rpc
 * - workers.do/snippets → @dotdo/snippets
 * - workers.do/router → Router functionality
 */

// Re-exports
export * from '@dotdo/rpc'
export * from '@dotdo/edge-api'
export { DO } from 'dotdo'

// Core types
export type { DOConfig, DOEnv } from 'dotdo'

// Version info
export const version = '0.0.1'

// Default export for worker deployment
import { EdgeAPI } from '@dotdo/edge-api'

export default EdgeAPI({
  info: () => ({
    name: 'workers.do',
    version,
    description: 'The complete platform for building on Cloudflare Workers',
  }),
  health: () => ({ ok: true, timestamp: Date.now() }),
})
