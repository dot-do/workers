/**
 * Pattern Matching Engine
 *
 * Complex Event Processing (CEP) with Analytics Engine SQL
 * - SQL-based pattern matching
 * - Threshold triggers
 * - Sequence detection
 * - Anomaly detection
 * - Time-window aggregations
 */

import { Hono } from 'hono'
import type { Env, Pattern, ApiResponse, TimeWindow } from '../types'
import { PatternSchema } from '../types'

const app = new Hono<{ Bindings: Env }>()

// ============================================================================
// Pattern Management Endpoints
// ============================================================================

/**
 * POST /patterns
 * Create a new pattern
 */
app.post('/patterns', async (c) => {
  try {
    const body = await c.req.json()
    const pattern = PatternSchema.parse({
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Store pattern in D1
    await c.env.DB.prepare(
      `INSERT INTO patterns (id, name, description, enabled, accountId, pattern, workflowId, createdAt, updatedAt, triggeredCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        pattern.id,
        pattern.name,
        pattern.description || null,
        pattern.enabled ? 1 : 0,
        pattern.accountId,
        JSON.stringify(pattern.pattern),
        pattern.workflowId,
        pattern.createdAt,
        pattern.updatedAt,
        0
      )
      .run()

    return c.json<ApiResponse<Pattern>>({
      success: true,
      data: pattern,
    })
  } catch (error: any) {
    console.error('Pattern creation error:', error)
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'PATTERN_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

/**
 * GET /patterns
 * List patterns
 */
app.get('/patterns', async (c) => {
  try {
    const accountId = c.req.query('accountId')
    if (!accountId) throw new Error('accountId required')

    const { results } = await c.env.DB.prepare('SELECT * FROM patterns WHERE accountId = ? ORDER BY createdAt DESC').bind(accountId).all()

    const patterns = (results || []).map(parsePatternFromDB)

    return c.json<ApiResponse<Pattern[]>>({
      success: true,
      data: patterns,
    })
  } catch (error: any) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'LIST_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

/**
 * GET /patterns/:id
 * Get pattern by ID
 */
app.get('/patterns/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const result = await c.env.DB.prepare('SELECT * FROM patterns WHERE id = ?').bind(id).first()

    if (!result) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Pattern not found',
          },
        },
        404
      )
    }

    return c.json<ApiResponse<Pattern>>({
      success: true,
      data: parsePatternFromDB(result),
    })
  } catch (error: any) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'GET_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

/**
 * PATCH /patterns/:id
 * Update pattern
 */
app.patch('/patterns/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const updates = await c.req.json()

    await c.env.DB.prepare(
      `UPDATE patterns
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           enabled = COALESCE(?, enabled),
           pattern = COALESCE(?, pattern),
           workflowId = COALESCE(?, workflowId),
           updatedAt = ?
       WHERE id = ?`
    )
      .bind(updates.name || null, updates.description || null, updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : null, updates.pattern ? JSON.stringify(updates.pattern) : null, updates.workflowId || null, new Date().toISOString(), id)
      .run()

    const updated = await c.env.DB.prepare('SELECT * FROM patterns WHERE id = ?').bind(id).first()

    return c.json<ApiResponse<Pattern>>({
      success: true,
      data: parsePatternFromDB(updated!),
    })
  } catch (error: any) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

/**
 * DELETE /patterns/:id
 * Delete pattern
 */
app.delete('/patterns/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM patterns WHERE id = ?').bind(id).run()

    return c.json<ApiResponse>({
      success: true,
      data: { deleted: true },
    })
  } catch (error: any) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

// ============================================================================
// Pattern Testing & Evaluation
// ============================================================================

/**
 * POST /patterns/test
 * Test a pattern against historical data
 */
app.post('/patterns/test', async (c) => {
  try {
    const { pattern, accountId, timeRange } = await c.req.json()

    // Execute pattern against historical events
    const results = await evaluatePattern(pattern, accountId, timeRange, c.env)

    return c.json<ApiResponse>({
      success: true,
      data: {
        matches: results.length,
        results: results.slice(0, 100), // Limit to 100 results
      },
    })
  } catch (error: any) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

// ============================================================================
// Pattern Examples & Templates
// ============================================================================

/**
 * GET /patterns/templates
 * Get pattern templates
 */
app.get('/patterns/templates', async (c) => {
  return c.json<ApiResponse>({
    success: true,
    data: PATTERN_TEMPLATES,
  })
})

// ============================================================================
// Helper Functions
// ============================================================================

function parsePatternFromDB(row: any): Pattern {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    enabled: row.enabled === 1,
    accountId: row.accountId,
    pattern: JSON.parse(row.pattern),
    workflowId: row.workflowId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    triggeredCount: row.triggeredCount || 0,
    lastTriggered: row.lastTriggered,
  }
}

async function evaluatePattern(pattern: any, accountId: string, timeRange: { start: number; end: number }, env: Env): Promise<any[]> {
  if (pattern.type === 'sql') {
    // Execute SQL query
    return await executeSQLPattern(pattern.query, accountId, env)
  } else if (pattern.type === 'threshold') {
    // Evaluate threshold pattern
    return await evaluateThresholdPattern(pattern, accountId, timeRange, env)
  } else if (pattern.type === 'sequence') {
    // Evaluate sequence pattern
    return await evaluateSequencePattern(pattern, accountId, timeRange, env)
  } else if (pattern.type === 'anomaly') {
    // Evaluate anomaly pattern
    return await evaluateAnomalyPattern(pattern, accountId, timeRange, env)
  }

  return []
}

async function executeSQLPattern(query: string, accountId: string, env: Env): Promise<any[]> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ANALYTICS_TOKEN}/analytics_engine/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ANALYTICS_TOKEN}`,
    },
    body: JSON.stringify({
      query: `${query} AND blob1 = '${accountId}'`,
      dataset: 'automation_events',
    }),
  })

  if (!response.ok) {
    throw new Error(`SQL query failed: ${response.statusText}`)
  }

  const result = await response.json()
  return result.data || []
}

async function evaluateThresholdPattern(pattern: any, accountId: string, timeRange: { start: number; end: number }, env: Env): Promise<any[]> {
  const windowMs = parseTimeWindow(pattern.window)
  const query = `
    SELECT
      blob2 as event_type,
      COUNT(*) as count,
      ${pattern.metric} as metric_value
    FROM automation_events
    WHERE blob1 = '${accountId}'
      AND blob2 = '${pattern.eventType}'
      AND timestamp >= ${timeRange.start - windowMs}
      AND timestamp <= ${timeRange.end}
    GROUP BY event_type
    HAVING metric_value ${pattern.operator} ${pattern.value}
  `

  return await executeSQLPattern(query, accountId, env)
}

async function evaluateSequencePattern(pattern: any, accountId: string, timeRange: { start: number; end: number }, env: Env): Promise<any[]> {
  // Complex sequence detection logic
  // This would require multiple SQL queries and correlation
  // Simplified example:

  const results: any[] = []
  const events = pattern.events

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const query = `
      SELECT * FROM automation_events
      WHERE blob1 = '${accountId}'
        AND blob2 = '${event.eventType}'
        AND timestamp >= ${timeRange.start}
        AND timestamp <= ${timeRange.end}
      ORDER BY timestamp ASC
    `

    const eventResults = await executeSQLPattern(query, accountId, env)
    if (eventResults.length === 0) {
      return [] // Sequence broken
    }

    results.push(...eventResults)
  }

  return results
}

async function evaluateAnomalyPattern(pattern: any, accountId: string, timeRange: { start: number; end: number }, env: Env): Promise<any[]> {
  const windowMs = parseTimeWindow(pattern.window)

  // Calculate baseline (average)
  const baselineQuery = `
    SELECT
      AVG(${pattern.metric}) as avg_value,
      STDDEV(${pattern.metric}) as stddev_value
    FROM automation_events
    WHERE blob1 = '${accountId}'
      AND blob2 = '${pattern.eventType}'
      AND timestamp >= ${timeRange.start - windowMs * 7}
      AND timestamp < ${timeRange.start}
  `

  const baseline = await executeSQLPattern(baselineQuery, accountId, env)
  if (!baseline || baseline.length === 0) return []

  const { avg_value, stddev_value } = baseline[0]

  // Sensitivity mapping
  const sensitivityMultiplier = {
    low: 3,
    medium: 2,
    high: 1.5,
  }[pattern.sensitivity]

  const threshold = avg_value + stddev_value * sensitivityMultiplier

  // Find anomalies
  const anomalyQuery = `
    SELECT * FROM automation_events
    WHERE blob1 = '${accountId}'
      AND blob2 = '${pattern.eventType}'
      AND ${pattern.metric} > ${threshold}
      AND timestamp >= ${timeRange.start}
      AND timestamp <= ${timeRange.end}
  `

  return await executeSQLPattern(anomalyQuery, accountId, env)
}

function parseTimeWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error(`Invalid time window: ${window}`)

  const value = parseInt(match[1])
  const unit = match[2]

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return value * multipliers[unit]
}

// ============================================================================
// Pattern Templates
// ============================================================================

const PATTERN_TEMPLATES = [
  {
    name: 'High-Value Signup',
    description: 'Trigger when a user signs up for an enterprise plan',
    pattern: {
      type: 'event',
      eventType: 'user.signup',
      conditions: {
        plan: 'enterprise',
      },
    },
  },
  {
    name: 'Abandoned Cart',
    description: 'Detect when a cart is abandoned for 1 hour',
    pattern: {
      type: 'sql',
      query: `
        SELECT blob3 as user_id, MAX(timestamp) as last_activity
        FROM automation_events
        WHERE blob2 = 'cart.updated'
          AND timestamp < ${Date.now() - 60 * 60 * 1000}
        GROUP BY user_id
      `,
      interval: '15m',
    },
  },
  {
    name: 'Failed Login Threshold',
    description: 'Alert when failed logins exceed 5 in 5 minutes',
    pattern: {
      type: 'threshold',
      eventType: 'auth.login.failed',
      metric: 'COUNT(*)',
      operator: '>',
      value: 5,
      window: '5m',
    },
  },
  {
    name: 'User Journey Sequence',
    description: 'Detect when user completes onboarding flow',
    pattern: {
      type: 'sequence',
      events: [
        { eventType: 'user.signup' },
        { eventType: 'profile.completed', within: '1h' },
        { eventType: 'first.purchase', within: '24h' },
      ],
      ordered: true,
    },
  },
  {
    name: 'API Latency Spike',
    description: 'Detect unusual API response times',
    pattern: {
      type: 'anomaly',
      eventType: 'api.request',
      metric: 'response_time',
      sensitivity: 'medium',
      window: '1h',
    },
  },
]

export default app

// ============================================================================
// SQL Query Examples for Analytics Engine
// ============================================================================

/**
 * Example SQL Queries for Complex Event Processing
 */
export const SQL_EXAMPLES = {
  // Count events by type in last hour
  eventCount: `
    SELECT
      blob2 as event_type,
      COUNT(*) as count
    FROM automation_events
    WHERE timestamp >= ${Date.now() - 60 * 60 * 1000}
    GROUP BY event_type
    ORDER BY count DESC
  `,

  // Find users with multiple failed logins
  failedLogins: `
    SELECT
      blob3 as user_id,
      COUNT(*) as failed_attempts,
      MAX(timestamp) as last_attempt
    FROM automation_events
    WHERE blob2 = 'auth.login.failed'
      AND timestamp >= ${Date.now() - 5 * 60 * 1000}
    GROUP BY user_id
    HAVING failed_attempts > 3
  `,

  // Calculate conversion funnel
  conversionFunnel: `
    WITH signups AS (
      SELECT blob3 as user_id, MIN(timestamp) as signup_time
      FROM automation_events
      WHERE blob2 = 'user.signup'
      GROUP BY user_id
    ),
    purchases AS (
      SELECT blob3 as user_id, MIN(timestamp) as purchase_time
      FROM automation_events
      WHERE blob2 = 'order.completed'
      GROUP BY user_id
    )
    SELECT
      COUNT(DISTINCT signups.user_id) as total_signups,
      COUNT(DISTINCT purchases.user_id) as converted_users,
      (COUNT(DISTINCT purchases.user_id) * 100.0 / COUNT(DISTINCT signups.user_id)) as conversion_rate
    FROM signups
    LEFT JOIN purchases ON signups.user_id = purchases.user_id
  `,

  // Find anomalous events
  anomalyDetection: `
    WITH baseline AS (
      SELECT
        AVG(double1) as avg_value,
        STDDEV(double1) as stddev_value
      FROM automation_events
      WHERE blob2 = 'api.request'
        AND timestamp >= ${Date.now() - 7 * 24 * 60 * 60 * 1000}
    )
    SELECT
      blob1 as account_id,
      timestamp,
      double1 as value
    FROM automation_events, baseline
    WHERE blob2 = 'api.request'
      AND double1 > (baseline.avg_value + 2 * baseline.stddev_value)
      AND timestamp >= ${Date.now() - 60 * 60 * 1000}
    ORDER BY timestamp DESC
  `,

  // Session analysis
  sessionMetrics: `
    SELECT
      blob4 as session_id,
      COUNT(*) as event_count,
      MIN(timestamp) as session_start,
      MAX(timestamp) as session_end,
      (MAX(timestamp) - MIN(timestamp)) / 1000 as duration_seconds
    FROM automation_events
    WHERE timestamp >= ${Date.now() - 24 * 60 * 60 * 1000}
    GROUP BY session_id
    HAVING duration_seconds > 300
    ORDER BY duration_seconds DESC
  `,
}
