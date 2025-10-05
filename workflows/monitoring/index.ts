/**
 * Monitoring & Analytics
 *
 * Real-time monitoring and analytics for the automation platform
 */

import { Hono } from 'hono'
import type { Env, ApiResponse } from '../types'

const app = new Hono<{ Bindings: Env }>()

// ============================================================================
// Monitoring Endpoints
// ============================================================================

/**
 * GET /monitoring/dashboard
 * Get dashboard metrics
 */
app.get('/dashboard', async (c) => {
  try {
    const accountId = c.req.query('accountId')
    if (!accountId) throw new Error('accountId required')

    const timeRange = c.req.query('timeRange') || '24h'
    const timeMs = parseTimeRange(timeRange)
    const startTime = Date.now() - timeMs

    // Get metrics from Analytics Engine
    const [events, workflows, executions, errors] = await Promise.all([
      getEventMetrics(accountId, startTime, c.env),
      getWorkflowMetrics(accountId, c.env),
      getExecutionMetrics(accountId, startTime, c.env),
      getErrorMetrics(accountId, startTime, c.env),
    ])

    return c.json<ApiResponse>({
      success: true,
      data: {
        timeRange,
        events,
        workflows,
        executions,
        errors,
      },
    })
  } catch (error: any) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

/**
 * GET /monitoring/executions
 * Get execution history
 */
app.get('/executions', async (c) => {
  try {
    const accountId = c.req.query('accountId')
    const workflowId = c.req.query('workflowId')
    const status = c.req.query('status')
    const limit = parseInt(c.req.query('limit') || '50')

    let query = 'SELECT * FROM workflow_executions WHERE 1=1'
    const params: any[] = []

    if (accountId) {
      query += ' AND accountId = ?'
      params.push(accountId)
    }

    if (workflowId) {
      query += ' AND workflowId = ?'
      params.push(workflowId)
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY startedAt DESC LIMIT ?'
    params.push(limit)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    const executions = (results || []).map((row: any) => ({
      ...row,
      triggeredBy: JSON.parse(row.triggeredBy),
      input: JSON.parse(row.input),
      output: row.output ? JSON.parse(row.output) : undefined,
      context: JSON.parse(row.context),
      completedSteps: JSON.parse(row.completedSteps),
      error: row.error ? JSON.parse(row.error) : undefined,
    }))

    return c.json<ApiResponse>({
      success: true,
      data: executions,
    })
  } catch (error: any) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'EXECUTIONS_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

/**
 * GET /monitoring/audit
 * Get action audit log
 */
app.get('/audit', async (c) => {
  try {
    const executionId = c.req.query('executionId')
    const workflowId = c.req.query('workflowId')
    const actionType = c.req.query('actionType')
    const limit = parseInt(c.req.query('limit') || '100')

    let query = 'SELECT * FROM action_audit_log WHERE 1=1'
    const params: any[] = []

    if (executionId) {
      query += ' AND executionId = ?'
      params.push(executionId)
    }

    if (workflowId) {
      query += ' AND workflowId = ?'
      params.push(workflowId)
    }

    if (actionType) {
      query += ' AND actionType = ?'
      params.push(actionType)
    }

    query += ' ORDER BY startedAt DESC LIMIT ?'
    params.push(limit)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    const logs = (results || []).map((row: any) => ({
      ...row,
      actionConfig: JSON.parse(row.actionConfig),
      result: row.result ? JSON.parse(row.result) : undefined,
    }))

    return c.json<ApiResponse>({
      success: true,
      data: logs,
    })
  } catch (error: any) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

async function getEventMetrics(accountId: string, startTime: number, env: Env): Promise<any> {
  const query = `
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT blob2) as uniqueTypes,
      COUNT(DISTINCT blob3) as uniqueUsers
    FROM automation_events
    WHERE blob1 = '${accountId}'
      AND timestamp >= ${startTime}
  `

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ANALYTICS_TOKEN}/analytics_engine/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ANALYTICS_TOKEN}`,
    },
    body: JSON.stringify({
      query,
      dataset: 'automation_events',
    }),
  })

  if (!response.ok) return { total: 0, uniqueTypes: 0, uniqueUsers: 0 }

  const result = await response.json()
  return result.data?.[0] || { total: 0, uniqueTypes: 0, uniqueUsers: 0 }
}

async function getWorkflowMetrics(accountId: string, env: Env): Promise<any> {
  const { results } = await env.DB.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled,
       SUM(executionCount) as totalExecutions
     FROM workflows
     WHERE accountId = ?`
  )
    .bind(accountId)
    .all()

  return results?.[0] || { total: 0, enabled: 0, totalExecutions: 0 }
}

async function getExecutionMetrics(accountId: string, startTime: number, env: Env): Promise<any> {
  const { results } = await env.DB.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
       SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
       AVG(duration) as avgDuration
     FROM workflow_executions
     WHERE accountId = ?
       AND startedAt >= ?`
  )
    .bind(accountId, new Date(startTime).toISOString())
    .all()

  return results?.[0] || { total: 0, completed: 0, failed: 0, running: 0, avgDuration: 0 }
}

async function getErrorMetrics(accountId: string, startTime: number, env: Env): Promise<any> {
  const { results } = await env.DB.prepare(
    `SELECT
       COUNT(*) as total,
       COUNT(DISTINCT workflowId) as affectedWorkflows
     FROM workflow_executions
     WHERE accountId = ?
       AND status = 'failed'
       AND startedAt >= ?`
  )
    .bind(accountId, new Date(startTime).toISOString())
    .all()

  return results?.[0] || { total: 0, affectedWorkflows: 0 }
}

function parseTimeRange(range: string): number {
  const match = range.match(/^(\d+)([smhd])$/)
  if (!match) return 24 * 60 * 60 * 1000 // Default to 24h

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

export default app
