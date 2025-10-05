/**
 * Cloudflare Worker - OpenFeature Provider API
 * Provides REST API for flag management and evaluation
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { OpenFeature, EvaluationContext } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '../provider'
import type { CloudflareEnv } from '../provider/types'

type Bindings = CloudflareEnv

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', cors())
app.use('*', logger())

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Initialize provider
let provider: CloudflareWorkersProvider | null = null

async function getProvider(env: CloudflareEnv): Promise<CloudflareWorkersProvider> {
  if (!provider) {
    provider = new CloudflareWorkersProvider({
      env,
      cacheTTL: parseInt(env.CACHE_TTL_SECONDS || '300'),
      enableAnalytics: env.ENABLE_ANALYTICS === 'true',
    })
    await provider.initialize()
  }
  return provider
}

// Evaluate flag endpoint
app.post('/evaluate/:flagKey', async (c) => {
  const flagKey = c.req.param('flagKey')
  const body = await c.req.json<{
    defaultValue: any
    context?: EvaluationContext
  }>()

  try {
    const provider = await getProvider(c.env)
    OpenFeature.setProvider(provider)
    const client = OpenFeature.getClient()

    const type = typeof body.defaultValue

    let result
    switch (type) {
      case 'boolean':
        result = await client.getBooleanDetails(flagKey, body.defaultValue, body.context)
        break
      case 'string':
        result = await client.getStringDetails(flagKey, body.defaultValue, body.context)
        break
      case 'number':
        result = await client.getNumberDetails(flagKey, body.defaultValue, body.context)
        break
      case 'object':
        result = await client.getObjectDetails(flagKey, body.defaultValue, body.context)
        break
      default:
        return c.json({ error: 'Unsupported type' }, 400)
    }

    return c.json(result)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

// Get flag definition
app.get('/flags/:flagKey', async (c) => {
  const flagKey = c.req.param('flagKey')

  try {
    const flag = await c.env.DB.prepare('SELECT * FROM flags WHERE key = ? LIMIT 1').bind(flagKey).first()

    if (!flag) {
      return c.json({ error: 'Flag not found' }, 404)
    }

    return c.json(flag)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

// List all flags
app.get('/flags', async (c) => {
  const enabled = c.req.query('enabled')
  const type = c.req.query('type')

  try {
    let query = 'SELECT * FROM flags WHERE 1=1'
    const params: any[] = []

    if (enabled !== undefined) {
      query += ' AND enabled = ?'
      params.push(enabled === 'true' ? 1 : 0)
    }

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    query += ' ORDER BY key ASC'

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({ flags: results, total: results?.length || 0 })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

// Create flag
app.post('/flags', async (c) => {
  const body = await c.req.json<{
    key: string
    type: 'boolean' | 'string' | 'number' | 'object'
    defaultValue: any
    enabled?: boolean
    description?: string
    tags?: string[]
  }>()

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO flags (key, type, defaultValue, enabled, description, tags)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(body.key, body.type, JSON.stringify(body.defaultValue), body.enabled !== false ? 1 : 0, body.description || null, JSON.stringify(body.tags || []))
      .run()

    if (!result.success) {
      return c.json({ error: 'Failed to create flag' }, 500)
    }

    // Invalidate cache
    await c.env.CACHE.delete(`flag:${body.key}:*`)

    return c.json({ success: true, key: body.key }, 201)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

// Update flag
app.put('/flags/:flagKey', async (c) => {
  const flagKey = c.req.param('flagKey')
  const body = await c.req.json<{
    defaultValue?: any
    enabled?: boolean
    description?: string
    tags?: string[]
  }>()

  try {
    const updates: string[] = []
    const params: any[] = []

    if (body.defaultValue !== undefined) {
      updates.push('defaultValue = ?')
      params.push(JSON.stringify(body.defaultValue))
    }

    if (body.enabled !== undefined) {
      updates.push('enabled = ?')
      params.push(body.enabled ? 1 : 0)
    }

    if (body.description !== undefined) {
      updates.push('description = ?')
      params.push(body.description)
    }

    if (body.tags !== undefined) {
      updates.push('tags = ?')
      params.push(JSON.stringify(body.tags))
    }

    updates.push('updatedAt = datetime("now")')

    if (updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400)
    }

    params.push(flagKey)

    const result = await c.env.DB.prepare(`UPDATE flags SET ${updates.join(', ')} WHERE key = ?`).bind(...params).run()

    if (!result.success) {
      return c.json({ error: 'Failed to update flag' }, 500)
    }

    // Invalidate cache
    await c.env.CACHE.delete(`flag:${flagKey}:*`)

    return c.json({ success: true, key: flagKey })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

// Delete flag
app.delete('/flags/:flagKey', async (c) => {
  const flagKey = c.req.param('flagKey')

  try {
    const result = await c.env.DB.prepare('DELETE FROM flags WHERE key = ?').bind(flagKey).run()

    if (!result.success) {
      return c.json({ error: 'Failed to delete flag' }, 500)
    }

    // Invalidate cache
    await c.env.CACHE.delete(`flag:${flagKey}:*`)

    return c.json({ success: true, key: flagKey })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

// Analytics endpoint
app.get('/analytics/:flagKey', async (c) => {
  const flagKey = c.req.param('flagKey')
  const limit = parseInt(c.req.query('limit') || '100')

  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM flag_events WHERE flagKey = ? ORDER BY timestamp DESC LIMIT ?').bind(flagKey, limit).all()

    return c.json({ events: results, total: results?.length || 0 })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

export default app
