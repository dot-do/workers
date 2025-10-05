/**
 * Event-Driven Automation Platform
 * Main Entry Point
 *
 * A comprehensive Zapier/Make.com alternative built on Cloudflare infrastructure:
 * - Analytics Engine for event storage and pattern matching
 * - Workflows for multi-step execution
 * - Queues for buffering and batching
 * - D1 for workflow definitions
 * - Workers AI for intelligent routing
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'

// Import route handlers
import ingestionApp from './ingestion'
import patternsApp from './patterns'
import workflowsApp from './workflows'
import monitoringApp from './monitoring'

// Import queue handlers
import { handleEventQueue } from './ingestion'
import { handleWorkflowQueue } from './workflows/queue'

// Import workflow class
import { AutomationWorkflow } from './workflows'

// ============================================================================
// Main Application
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', cors())

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Event-Driven Automation Platform',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      ingestion: '/events',
      patterns: '/patterns',
      workflows: '/workflows',
      monitoring: '/monitoring',
    },
  })
})

// Mount route handlers
app.route('/events', ingestionApp)
app.route('/patterns', patternsApp)
app.route('/workflows', workflowsApp)
app.route('/monitoring', monitoringApp)

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err)
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    },
    500
  )
})

// ============================================================================
// Queue Consumers
// ============================================================================

async function queue(batch: MessageBatch, env: Env): Promise<void> {
  // Route messages to appropriate handlers based on queue
  const queueName = batch.queue

  if (queueName === 'events') {
    await handleEventQueue(batch as any, env)
  } else if (queueName === 'workflows') {
    await handleWorkflowQueue(batch as any, env)
  }
}

// ============================================================================
// Scheduled Tasks (Cron)
// ============================================================================

async function scheduled(event: ScheduledEvent, env: Env): Promise<void> {
  // Run scheduled pattern checks
  if (event.cron === '*/5 * * * *') {
    // Every 5 minutes
    await checkScheduledPatterns(env)
  }

  // Cleanup old executions
  if (event.cron === '0 0 * * *') {
    // Daily at midnight
    await cleanupOldExecutions(env)
  }

  // Generate usage reports
  if (event.cron === '0 0 1 * *') {
    // Monthly on the 1st
    await generateUsageReports(env)
  }
}

async function checkScheduledPatterns(env: Env): Promise<void> {
  // Get all SQL-based patterns that need periodic checking
  const { results } = await env.DB.prepare(
    `SELECT * FROM patterns
     WHERE enabled = 1
       AND json_extract(pattern, '$.type') = 'sql'`
  ).all()

  for (const pattern of results || []) {
    try {
      const patternConfig = JSON.parse(pattern.pattern as string)

      // Execute SQL query
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ANALYTICS_TOKEN}/analytics_engine/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.ANALYTICS_TOKEN}`,
        },
        body: JSON.stringify({
          query: patternConfig.query,
          dataset: 'automation_events',
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // If results found, trigger workflow
        if (result.data && result.data.length > 0) {
          const execution = {
            id: crypto.randomUUID(),
            workflowId: pattern.workflowId,
            accountId: pattern.accountId,
            triggeredBy: {
              type: 'pattern' as const,
              id: pattern.id,
            },
            status: 'pending' as const,
            input: { patternResults: result.data },
            context: {},
            completedSteps: [],
            startedAt: new Date().toISOString(),
          }

          await env.WORKFLOW_QUEUE.send(execution)

          // Update pattern stats
          await env.DB.prepare('UPDATE patterns SET triggeredCount = triggeredCount + 1, lastTriggered = ? WHERE id = ?').bind(new Date().toISOString(), pattern.id).run()
        }
      }
    } catch (error) {
      console.error('Pattern check error:', pattern.id, error)
    }
  }
}

async function cleanupOldExecutions(env: Env): Promise<void> {
  const retentionDays = parseInt(env.EVENT_RETENTION_DAYS || '90')
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

  // Delete old completed executions
  await env.DB.prepare('DELETE FROM workflow_executions WHERE status = ? AND completedAt < ?').bind('completed', cutoffDate).run()

  // Delete old audit logs
  await env.DB.prepare('DELETE FROM action_audit_log WHERE completedAt < ?').bind(cutoffDate).run()
}

async function generateUsageReports(env: Env): Promise<void> {
  // Reset monthly usage counters
  await env.DB.prepare('UPDATE accounts SET currentExecutions = 0, currentEvents = 0').run()

  // Generate and store reports in R2
  const { results } = await env.DB.prepare('SELECT * FROM accounts').all()

  for (const account of results || []) {
    const report = {
      accountId: account.id,
      month: new Date().toISOString().slice(0, 7),
      workflows: account.currentWorkflows,
      executions: account.currentExecutions,
      events: account.currentEvents,
      generatedAt: new Date().toISOString(),
    }

    await env.PAYLOADS.put(`reports/${account.id}/${report.month}.json`, JSON.stringify(report, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
      },
    })
  }
}

// ============================================================================
// Exports
// ============================================================================

export { AutomationWorkflow }

export default {
  fetch: app.fetch,
  queue,
  scheduled,
}
