/**
 * @dotdo/rpc-client/env/node - Node.js Environment Adapter
 *
 * Import this at your Node.js entry point to configure all .do SDKs
 * to use process.env for environment variables.
 *
 * @example
 * ```typescript
 * // app.ts (entry point)
 * import '@dotdo/rpc-client/env/node'
 * import { llm } from 'llm.do'
 * import { payments } from 'payments.do'
 *
 * // All SDKs now use process.env
 * const result = await llm.complete({ prompt: 'Hello' })
 * ```
 *
 * @packageDocumentation
 */

import { setEnv } from './env.js'

// Set the global environment from Node.js process.env
if (typeof process !== 'undefined' && process.env) {
  setEnv(process.env as Record<string, string | undefined>)
}
