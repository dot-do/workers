/**
 * rpc.do/env - Cloudflare Workers environment adapter
 *
 * Import this at your Worker's entry point to configure all .do SDKs
 * to use Cloudflare Workers environment bindings.
 *
 * @example
 * ```typescript
 * // worker.ts (entry point)
 * import 'rpc.do/env'
 * import { workflows } from 'workflows.do'
 * import { tasks } from 'tasks.do'
 *
 * export default {
 *   async fetch(request, env, ctx) {
 *     // All SDKs now have access to env bindings
 *     const flows = await workflows.list()
 *     return Response.json(flows)
 *   }
 * }
 * ```
 */

import { env } from 'cloudflare:workers'
import { setEnv } from './index.js'

// Set the global environment from Cloudflare Workers
setEnv(env as Record<string, string | undefined>)
