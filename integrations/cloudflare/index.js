/**
 * @dotdo/worker-cloudflare - Cloudflare SDK as RPC worker
 *
 * Exposes Cloudflare API via multi-transport RPC:
 * - Workers RPC: env.CLOUDFLARE.zones.list()
 * - REST: GET /api/zones.list
 * - CapnWeb: WebSocket RPC
 * - MCP: JSON-RPC 2.0
 */
import Cloudflare from 'cloudflare';
import { env } from 'cloudflare:workers';
import { RPC } from '@dotdo/rpc';
const cloudflare = new Cloudflare({ apiToken: env.CLOUDFLARE_API_TOKEN });
export default RPC(cloudflare);
