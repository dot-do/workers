/**
 * @dotdo/worker-workos - WorkOS SDK as RPC worker
 *
 * Exposes WorkOS via multi-transport RPC:
 * - Workers RPC: env.ORG.sso.getAuthorizationUrl(options)
 * - REST: POST /api/sso.getAuthorizationUrl
 * - CapnWeb: WebSocket RPC
 * - MCP: JSON-RPC 2.0
 */

import { WorkOS } from '@workos-inc/node'
import { env } from 'cloudflare:workers'
import { RPC } from '@dotdo/rpc'

const workos = new WorkOS(env.WORKOS_API_KEY)

export default RPC(workos)
