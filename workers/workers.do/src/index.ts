/**
 * workers.do - Worker Registry Service
 *
 * Minimal passthrough worker that forwards all requests to WorkersRegistryDO.
 * The DO handles all routing internally via DOBase from dotdo.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WorkersRegistryDO } from './workers-registry-do'

export { WorkersRegistryDO }

interface Env {
  WORKERS_REGISTRY: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Env }>()

// CORS for browser clients
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'workers.do' }))

// Landing page
app.get('/', (c) => c.json({
  service: 'workers.do',
  status: 'healthy',
  version: '2.0.0',
  description: 'Worker registry service'
}))

// Get user ID from auth token
function getUserId(c: { req: { header: (name: string) => string | undefined } }): string {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return 'anonymous'
  }
  // Hash token for user ID
  const token = auth.slice(7)
  return `user_${token.slice(0, 8)}`
}

// All other requests -> passthrough to DO
app.all('*', async (c) => {
  const userId = getUserId(c)
  const id = c.env.WORKERS_REGISTRY.idFromName(userId)
  const stub = c.env.WORKERS_REGISTRY.get(id)
  return stub.fetch(c.req.raw)
})

export default app
