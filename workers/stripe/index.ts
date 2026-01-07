/**
 * @dotdo/worker-stripe - Stripe SDK as RPC worker
 *
 * Exposes Stripe via multi-transport RPC:
 * - Workers RPC: env.STRIPE.customers.create(data)
 * - REST: POST /api/customers.create
 * - CapnWeb: WebSocket RPC
 * - MCP: JSON-RPC 2.0
 */

import Stripe from 'stripe'
import { env } from 'cloudflare:workers'
import { RPC } from '@dotdo/rpc'

const stripe = new Stripe(env.STRIPE_SECRET_KEY)

export default RPC(stripe)
