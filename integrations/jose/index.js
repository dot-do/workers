/**
 * @dotdo/worker-jose - jose JWT library as RPC worker
 *
 * Exposes jose via multi-transport RPC:
 * - Workers RPC: env.JOSE.jwtVerify(token, key)
 * - REST: GET /api/jwtVerify?token=...
 * - CapnWeb: WebSocket RPC
 * - MCP: JSON-RPC 2.0
 */
import * as jose from 'jose';
import { RPC } from '@dotdo/rpc';
export default RPC(jose);
