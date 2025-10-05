/**
 * Zapier Integration API Routes
 *
 * Provides polling triggers, actions, and searches for Zapier integration.
 * All endpoints require OAuth 2.0 authentication via oauth.do
 */

import { Hono } from 'hono'
import { z } from 'zod'

// Request schemas
const createAgentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['chat', 'task', 'workflow']),
  instructions: z.string().optional(),
  model: z.string().optional().default('gpt-4'),
})

const runWorkflowSchema = z.object({
  workflow_id: z.string(),
  input: z.record(z.any()),
  wait_for_completion: z.boolean().default(false),
})

const createWebhookSchema = z.object({
  target_url: z.string().url(),
  event: z.string(),
  workflow_id: z.string().optional(),
})

type Env = {
  DB: any // Database service binding
  AUTH: any // Auth service binding
  AGENTS: any // Agents service binding (future)
  WORKFLOWS: any // Workflows service binding (future)
}

const app = new Hono<{ Bindings: Env; Variables: { userId: string; tenantId: string } }>()

// Authentication middleware
app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401)
  }

  const token = authHeader.substring(7)

  try {
    // Validate token via auth service
    const validation = await c.env.AUTH.validateToken(token)
    if (!validation.valid) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    // Set user context
    c.set('userId', validation.userId)
    c.set('tenantId', validation.tenantId)

    await next()
  } catch (error) {
    console.error('Auth error:', error)
    return c.json({ error: 'Authentication failed' }, 401)
  }
})

// ============================================================================
// TRIGGERS (Polling)
// ============================================================================

/**
 * GET /zapier/agents
 *
 * Polling trigger: New Agent
 * Returns list of recently created agents
 */
app.get('/agents', async (c) => {
  const limit = Number(c.req.query('limit')) || 100
  const createdAfter = c.req.query('created_after') || '1970-01-01T00:00:00Z'

  const userId = c.get('userId')

  try {
    // Query agents from database
    const agents = await c.env.DB.query(
      `SELECT * FROM agents
       WHERE user_id = ? AND created_at > ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, createdAfter, limit]
    )

    return c.json({
      data: agents,
      meta: {
        total: agents.length,
        limit,
        has_more: agents.length === limit,
      },
    })
  } catch (error) {
    console.error('Error listing agents:', error)
    return c.json({ error: 'Failed to list agents' }, 500)
  }
})

/**
 * GET /zapier/workflow-runs
 *
 * Polling trigger: Workflow Completed
 * Returns list of recently completed workflow runs
 */
app.get('/workflow-runs', async (c) => {
  const limit = Number(c.req.query('limit')) || 100
  const completedAfter = c.req.query('completed_after') || '1970-01-01T00:00:00Z'
  const workflowId = c.req.query('workflow_id') // Optional filter

  const userId = c.get('userId')

  try {
    let query = `
      SELECT * FROM workflow_runs
      WHERE user_id = ? AND completed_at > ? AND status = 'completed'
    `
    const params: any[] = [userId, completedAfter]

    if (workflowId) {
      query += ' AND workflow_id = ?'
      params.push(workflowId)
    }

    query += ' ORDER BY completed_at DESC LIMIT ?'
    params.push(limit)

    const runs = await c.env.DB.query(query, params)

    return c.json({
      data: runs,
      meta: {
        total: runs.length,
        limit,
        has_more: runs.length === limit,
      },
    })
  } catch (error) {
    console.error('Error listing workflow runs:', error)
    return c.json({ error: 'Failed to list workflow runs' }, 500)
  }
})

/**
 * GET /zapier/workflows
 *
 * Hidden trigger for dynamic dropdowns
 * Returns list of available workflows
 */
app.get('/workflows', async (c) => {
  const limit = Number(c.req.query('limit')) || 100
  const userId = c.get('userId')

  try {
    const workflows = await c.env.DB.query(
      `SELECT id, name, description FROM workflows
       WHERE user_id = ? AND status = 'active'
       ORDER BY name ASC
       LIMIT ?`,
      [userId, limit]
    )

    return c.json({
      data: workflows.map((w: any) => ({
        id: w.id,
        name: w.name,
        description: w.description,
      })),
    })
  } catch (error) {
    console.error('Error listing workflows:', error)
    return c.json({ error: 'Failed to list workflows' }, 500)
  }
})

// ============================================================================
// ACTIONS (Create/Update)
// ============================================================================

/**
 * POST /zapier/agents
 *
 * Action: Create Agent
 * Creates a new AI agent
 */
app.post('/agents', async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')

  try {
    const body = await c.req.json()
    const data = createAgentSchema.parse(body)

    // Generate agent ID
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Insert into database
    await c.env.DB.execute(
      `INSERT INTO agents (id, user_id, tenant_id, name, type, instructions, model, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [agentId, userId, tenantId, data.name, data.type, data.instructions || '', data.model, new Date().toISOString(), new Date().toISOString()]
    )

    // Fetch created agent
    const agent = await c.env.DB.query('SELECT * FROM agents WHERE id = ?', [agentId])

    return c.json(agent[0], 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    console.error('Error creating agent:', error)
    return c.json({ error: 'Failed to create agent' }, 500)
  }
})

/**
 * POST /zapier/workflow-runs
 *
 * Action: Run Workflow
 * Executes a workflow with provided inputs
 */
app.post('/workflow-runs', async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')

  try {
    const body = await c.req.json()
    const data = runWorkflowSchema.parse(body)

    // Verify workflow exists and user has access
    const workflows = await c.env.DB.query('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [data.workflow_id, userId])

    if (workflows.length === 0) {
      return c.json({ error: 'Workflow not found' }, 404)
    }

    const workflow = workflows[0]

    // Generate run ID
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Create workflow run
    await c.env.DB.execute(
      `INSERT INTO workflow_runs (id, workflow_id, user_id, tenant_id, status, input, started_at)
       VALUES (?, ?, ?, ?, 'running', ?, ?)`,
      [runId, data.workflow_id, userId, tenantId, JSON.stringify(data.input), new Date().toISOString()]
    )

    // If wait_for_completion is true, we would execute synchronously
    // For now, we return the run immediately (async execution)
    const run = {
      id: runId,
      workflow_id: data.workflow_id,
      workflow_name: workflow.name,
      status: 'running',
      input: data.input,
      started_at: new Date().toISOString(),
    }

    return c.json(run, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    console.error('Error running workflow:', error)
    return c.json({ error: 'Failed to run workflow' }, 500)
  }
})

// ============================================================================
// SEARCHES
// ============================================================================

/**
 * GET /zapier/agents/search
 *
 * Search: Find Agent
 * Finds agents by name and optional type
 */
app.get('/agents/search', async (c) => {
  const name = c.req.query('name')
  const type = c.req.query('type')
  const userId = c.get('userId')

  if (!name) {
    return c.json({ error: 'Name parameter is required' }, 400)
  }

  try {
    let query = `
      SELECT * FROM agents
      WHERE user_id = ? AND name ILIKE ?
    `
    const params: any[] = [userId, `%${name}%`]

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    query += ' ORDER BY name ASC LIMIT 25'

    const agents = await c.env.DB.query(query, params)

    return c.json({ data: agents })
  } catch (error) {
    console.error('Error searching agents:', error)
    return c.json({ error: 'Failed to search agents' }, 500)
  }
})

// ============================================================================
// WEBHOOKS (Instant Triggers)
// ============================================================================

/**
 * POST /zapier/webhooks
 *
 * Subscribe to webhook events
 * Creates a webhook subscription for instant triggers
 */
app.post('/webhooks', async (c) => {
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')

  try {
    const body = await c.req.json()
    const data = createWebhookSchema.parse(body)

    // Generate webhook ID
    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Insert webhook subscription
    await c.env.DB.execute(
      `INSERT INTO zapier_webhooks (id, user_id, tenant_id, target_url, event, workflow_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [webhookId, userId, tenantId, data.target_url, data.event, data.workflow_id || null, new Date().toISOString()]
    )

    const webhook = {
      id: webhookId,
      target_url: data.target_url,
      event: data.event,
      workflow_id: data.workflow_id,
      created_at: new Date().toISOString(),
    }

    return c.json(webhook, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    console.error('Error creating webhook:', error)
    return c.json({ error: 'Failed to create webhook' }, 500)
  }
})

/**
 * DELETE /zapier/webhooks/:id
 *
 * Unsubscribe from webhook events
 * Deletes a webhook subscription
 */
app.delete('/webhooks/:id', async (c) => {
  const webhookId = c.req.param('id')
  const userId = c.get('userId')

  try {
    // Delete webhook (only if user owns it)
    await c.env.DB.execute('DELETE FROM zapier_webhooks WHERE id = ? AND user_id = ?', [webhookId, userId])

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return c.json({ error: 'Failed to delete webhook' }, 500)
  }
})

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'zapier-api' })
})

export default app
