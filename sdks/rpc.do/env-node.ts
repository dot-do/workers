/**
 * rpc.do/env/node - Node.js environment adapter
 *
 * Import this at your Node.js app's entry point to configure all .do SDKs
 * to use process.env for environment variables.
 *
 * @example
 * ```typescript
 * // app.ts (entry point)
 * import 'rpc.do/env/node'
 * import { workflows } from 'workflows.do'
 * import { tasks } from 'tasks.do'
 *
 * // All SDKs now have access to process.env
 * const flows = await workflows.list()
 * ```
 */

import { setEnv } from './index.js'

// Set the global environment from Node.js process.env
if (typeof process !== 'undefined' && process.env) {
  setEnv(process.env as Record<string, string | undefined>)
}
