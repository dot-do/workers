/**
 * Policy Engine Worker - Edge enforcement at 300+ locations
 *
 * Main worker for policy evaluation and enforcement
 */

import { Hono } from 'hono'
import { PolicyEvaluator } from './evaluator'
import { PolicyCache } from './cache'
import type { Policy, PolicyContext, PolicyEvaluationResult } from '../policy/types'
import { PolicySchema, PolicyContextSchema } from '../policy/types'

type Bindings = {
  POLICY_KV: KVNamespace
  POLICY_DB: D1Database
  RATE_LIMIT_DO: DurableObjectNamespace
  ANALYTICS: AnalyticsEngineDataset
}

const app = new Hono<{ Bindings: Bindings }>()

// ===== Policy Evaluation Endpoints =====

/**
 * Evaluate a policy against a context
 */
app.post('/evaluate', async (c) => {
  try {
    const body = await c.req.json()
    const policyId = body.policyId as string
    const context = PolicyContextSchema.parse(body.context)

    // Get policy from cache or DB
    const cache = new PolicyCache(c.env.POLICY_KV)
    let policy = await cache.get(policyId)

    if (!policy) {
      // Fetch from D1
      const result = await c.env.POLICY_DB.prepare('SELECT * FROM policies WHERE id = ? AND status = ?').bind(policyId, 'active').first<Policy>()

      if (!result) {
        return c.json({ error: 'Policy not found or not active' }, 404)
      }

      policy = result
      await cache.put(policy)
    }

    // Evaluate policy
    const evaluator = new PolicyEvaluator()
    const result = await evaluator.evaluate(policy, context)

    // Log to Analytics Engine
    c.env.ANALYTICS.writeDataPoint({
      indexes: [policyId, context.action, result.decision.allowed ? 'allow' : 'deny'],
      blobs: [result.decision.reason || '', context.subject.id as string],
      doubles: [result.decision.evaluationTimeMs],
    })

    return c.json(result)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Evaluate multiple policies (all must pass)
 */
app.post('/evaluate/batch', async (c) => {
  try {
    const body = await c.req.json()
    const policyIds = body.policyIds as string[]
    const context = PolicyContextSchema.parse(body.context)

    const cache = new PolicyCache(c.env.POLICY_KV)
    const policies: Policy[] = []

    // Get all policies
    for (const policyId of policyIds) {
      let policy = await cache.get(policyId)

      if (!policy) {
        const result = await c.env.POLICY_DB.prepare('SELECT * FROM policies WHERE id = ? AND status = ?').bind(policyId, 'active').first<Policy>()

        if (result) {
          policy = result
          await cache.put(policy)
          policies.push(policy)
        }
      } else {
        policies.push(policy)
      }
    }

    // Evaluate all policies
    const evaluator = new PolicyEvaluator()
    const result = await evaluator.evaluateAll(policies, context)

    // Log to Analytics Engine
    c.env.ANALYTICS.writeDataPoint({
      indexes: [policyIds.join(','), context.action, result.decision.allowed ? 'allow' : 'deny'],
      blobs: [result.decision.reason || '', context.subject.id as string],
      doubles: [result.decision.evaluationTimeMs],
    })

    return c.json(result)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Check access (convenience endpoint for RBAC/ABAC)
 */
app.post('/access/check', async (c) => {
  try {
    const body = await c.req.json()
    const { subject, resource, action, environment } = body

    const context: PolicyContext = {
      subject,
      resource,
      action,
      environment,
    }

    // Find applicable access control policies
    const result = await c.env.POLICY_DB.prepare(`
      SELECT * FROM policies
      WHERE type = 'access-control'
      AND status = 'active'
      AND json_extract(rules, '$.resource') IN (?, '*')
    `)
      .bind(resource.name)
      .all<Policy>()

    if (!result.results || result.results.length === 0) {
      return c.json({ allowed: false, reason: 'No applicable policies found' })
    }

    // Evaluate all applicable policies
    const evaluator = new PolicyEvaluator()
    const evalResult = await evaluator.evaluateAll(result.results, context)

    return c.json(evalResult.decision)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Check rate limit (calls Durable Object)
 */
app.post('/ratelimit/check', async (c) => {
  try {
    const body = await c.req.json()
    const { key, limit = 100, window = 60 } = body

    // Get Durable Object instance
    const id = c.env.RATE_LIMIT_DO.idFromName(key)
    const stub = c.env.RATE_LIMIT_DO.get(id)

    // Call Durable Object
    const response = await stub.fetch(`http://do/check?key=${key}&limit=${limit}&window=${window}`, {
      method: 'POST',
    })

    const result = await response.json()

    return c.json(result, response.status)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

// ===== Policy Management Endpoints =====

/**
 * Create policy
 */
app.post('/policies', async (c) => {
  try {
    const body = await c.req.json()
    const policy = PolicySchema.parse(body)

    // Insert into D1
    await c.env.POLICY_DB.prepare(
      `INSERT INTO policies (id, name, description, type, status, priority, version, rules, metadata, created_at, updated_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        policy.id,
        policy.name,
        policy.description || null,
        policy.type,
        policy.status,
        policy.priority,
        policy.version,
        JSON.stringify(policy.rules),
        JSON.stringify(policy.metadata || {}),
        policy.createdAt,
        policy.updatedAt,
        policy.createdBy
      )
      .run()

    // Cache in KV
    const cache = new PolicyCache(c.env.POLICY_KV)
    await cache.put(policy)

    return c.json(policy, 201)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Get policy by ID
 */
app.get('/policies/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const cache = new PolicyCache(c.env.POLICY_KV)

    let policy = await cache.get(id)

    if (!policy) {
      const result = await c.env.POLICY_DB.prepare('SELECT * FROM policies WHERE id = ?').bind(id).first<Policy>()

      if (!result) {
        return c.json({ error: 'Policy not found' }, 404)
      }

      policy = result
      await cache.put(policy)
    }

    return c.json(policy)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * List policies
 */
app.get('/policies', async (c) => {
  try {
    const type = c.req.query('type')
    const status = c.req.query('status') || 'active'

    let query = 'SELECT * FROM policies WHERE status = ?'
    const bindings: string[] = [status]

    if (type) {
      query += ' AND type = ?'
      bindings.push(type)
    }

    const result = await c.env.POLICY_DB.prepare(query)
      .bind(...bindings)
      .all<Policy>()

    return c.json(result.results || [])
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Update policy
 */
app.put('/policies/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    // Increment version
    const existing = await c.env.POLICY_DB.prepare('SELECT version FROM policies WHERE id = ?').bind(id).first<{ version: number }>()

    if (!existing) {
      return c.json({ error: 'Policy not found' }, 404)
    }

    const policy = PolicySchema.parse({ ...body, id, version: existing.version + 1, updatedAt: new Date().toISOString() })

    // Update in D1
    await c.env.POLICY_DB.prepare(
      `UPDATE policies SET
       name = ?, description = ?, type = ?, status = ?, priority = ?, version = ?,
       rules = ?, metadata = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        policy.name,
        policy.description || null,
        policy.type,
        policy.status,
        policy.priority,
        policy.version,
        JSON.stringify(policy.rules),
        JSON.stringify(policy.metadata || {}),
        policy.updatedAt,
        id
      )
      .run()

    // Update cache
    const cache = new PolicyCache(c.env.POLICY_KV)
    await cache.put(policy)

    return c.json(policy)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Delete policy
 */
app.delete('/policies/:id', async (c) => {
  try {
    const id = c.req.param('id')

    await c.env.POLICY_DB.prepare('DELETE FROM policies WHERE id = ?').bind(id).run()

    const cache = new PolicyCache(c.env.POLICY_KV)
    await cache.delete(id)

    return c.json({ deleted: true })
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

// ===== Health Check =====

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

export default app
export { RateLimitDO } from '../rate-limit/durable-object'
