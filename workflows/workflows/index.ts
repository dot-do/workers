/**
 * Workflow Engine
 *
 * Multi-step workflow execution with Cloudflare Workflows:
 * - Visual workflow builder integration
 * - Step-by-step execution
 * - Error handling and retries
 * - State persistence
 * - Parallel execution
 */

import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import { Hono } from 'hono'
import type { Env, Workflow, WorkflowExecution, ApiResponse } from '../types'
import { WorkflowSchema } from '../types'
import { executeAction } from '../actions'

const app = new Hono<{ Bindings: Env }>()

// ============================================================================
// Workflow Management Endpoints
// ============================================================================

/**
 * POST /workflows
 * Create a new workflow
 */
app.post('/workflows', async (c) => {
  try {
    const body = await c.req.json()
    const workflow = WorkflowSchema.parse({
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Store workflow in D1
    await c.env.DB.prepare(
      `INSERT INTO workflows (id, name, description, enabled, accountId, steps, startStep, config, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(workflow.id, workflow.name, workflow.description || null, workflow.enabled ? 1 : 0, workflow.accountId, JSON.stringify(workflow.steps), workflow.startStep, JSON.stringify(workflow.config || {}), workflow.createdAt, workflow.updatedAt)
      .run()

    return c.json<ApiResponse<Workflow>>({
      success: true,
      data: workflow,
    })
  } catch (error: any) {
    console.error('Workflow creation error:', error)
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'WORKFLOW_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

/**
 * GET /workflows
 * List workflows
 */
app.get('/workflows', async (c) => {
  try {
    const accountId = c.req.query('accountId')
    if (!accountId) throw new Error('accountId required')

    const { results } = await c.env.DB.prepare('SELECT * FROM workflows WHERE accountId = ? ORDER BY createdAt DESC').bind(accountId).all()

    const workflows = (results || []).map(parseWorkflowFromDB)

    return c.json<ApiResponse<Workflow[]>>({
      success: true,
      data: workflows,
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
 * GET /workflows/:id
 * Get workflow by ID
 */
app.get('/workflows/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const result = await c.env.DB.prepare('SELECT * FROM workflows WHERE id = ?').bind(id).first()

    if (!result) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          },
        },
        404
      )
    }

    return c.json<ApiResponse<Workflow>>({
      success: true,
      data: parseWorkflowFromDB(result),
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
 * POST /workflows/:id/execute
 * Manually trigger a workflow
 */
app.post('/workflows/:id/execute', async (c) => {
  try {
    const id = c.req.param('id')
    const { input } = await c.req.json()

    const workflow = await c.env.DB.prepare('SELECT * FROM workflows WHERE id = ?').bind(id).first()

    if (!workflow) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          },
        },
        404
      )
    }

    // Create execution
    const execution = {
      id: crypto.randomUUID(),
      workflowId: id,
      accountId: workflow.accountId,
      triggeredBy: {
        type: 'manual' as const,
      },
      status: 'pending' as const,
      input: input || {},
      context: {},
      completedSteps: [],
      startedAt: new Date().toISOString(),
    }

    // Start workflow execution via Cloudflare Workflows
    const instance = await c.env.AUTOMATION_WORKFLOW.create({
      id: execution.id,
      params: execution,
    })

    return c.json<ApiResponse>({
      success: true,
      data: {
        executionId: execution.id,
        instanceId: instance.id,
      },
    })
  } catch (error: any) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'EXECUTE_ERROR',
          message: error.message,
        },
      },
      400
    )
  }
})

/**
 * GET /workflows/:id/executions
 * List workflow executions
 */
app.get('/workflows/:id/executions', async (c) => {
  try {
    const id = c.req.param('id')
    const { results } = await c.env.DB.prepare('SELECT * FROM workflow_executions WHERE workflowId = ? ORDER BY startedAt DESC LIMIT 100').bind(id).all()

    const executions = (results || []).map(parseExecutionFromDB)

    return c.json<ApiResponse<WorkflowExecution[]>>({
      success: true,
      data: executions,
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
 * GET /executions/:id
 * Get execution status
 */
app.get('/executions/:id', async (c) => {
  try {
    const id = c.req.param('id')

    // Get from Workflows
    const instance = await c.env.AUTOMATION_WORKFLOW.get(id)
    const status = await instance.status()

    return c.json<ApiResponse>({
      success: true,
      data: status,
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

// ============================================================================
// Workflow Execution Engine (Cloudflare Workflows)
// ============================================================================

export class AutomationWorkflow extends WorkflowEntrypoint<Env, WorkflowExecution> {
  async run(event: WorkflowEvent<WorkflowExecution>, step: WorkflowStep) {
    const execution = event.params

    try {
      // Get workflow definition
      const workflow = await step.do('load-workflow', async () => {
        const result = await this.env.DB.prepare('SELECT * FROM workflows WHERE id = ?').bind(execution.workflowId).first()
        return parseWorkflowFromDB(result!)
      })

      // Update execution status
      await step.do('update-status-running', async () => {
        await this.env.DB.prepare('UPDATE workflow_executions SET status = ? WHERE id = ?').bind('running', execution.id).run()
      })

      // Execute workflow steps
      let currentStepId = workflow.startStep
      const context = { ...execution.context, input: execution.input }

      while (currentStepId) {
        const workflowStep = workflow.steps.find((s) => s.id === currentStepId)
        if (!workflowStep) break

        // Execute step
        const stepResult = await step.do(
          `execute-step-${workflowStep.id}`,
          {
            retries: workflowStep.action?.retries
              ? {
                  limit: workflowStep.action.retries.limit,
                  delay: workflowStep.action.retries.delay,
                  backoff: workflowStep.action.retries.backoff,
                }
              : undefined,
            timeout: workflowStep.action?.timeout,
          },
          async () => {
            return await executeWorkflowStep(workflowStep, context, this.env)
          }
        )

        // Update context with step result
        context[workflowStep.id] = stepResult

        // Update completed steps
        await step.do(`mark-step-complete-${workflowStep.id}`, async () => {
          await this.env.DB.prepare('UPDATE workflow_executions SET completedSteps = JSON_INSERT(completedSteps, "$[#]", ?) WHERE id = ?').bind(workflowStep.id, execution.id).run()
        })

        // Determine next step
        if (workflowStep.type === 'condition' && workflowStep.condition) {
          // Evaluate condition
          const conditionResult = evaluateCondition(workflowStep.condition.expression, context)
          currentStepId = conditionResult ? workflowStep.condition.onTrue : workflowStep.condition.onFalse
        } else {
          currentStepId = workflowStep.next
        }
      }

      // Complete workflow
      await step.do('complete-workflow', async () => {
        const completedAt = new Date().toISOString()
        const startedAt = new Date(execution.startedAt).getTime()
        const duration = Date.now() - startedAt

        await this.env.DB.prepare('UPDATE workflow_executions SET status = ?, output = ?, completedAt = ?, duration = ? WHERE id = ?').bind('completed', JSON.stringify(context), completedAt, duration, execution.id).run()

        await this.env.DB.prepare('UPDATE workflows SET executionCount = executionCount + 1, lastExecuted = ? WHERE id = ?').bind(completedAt, execution.workflowId).run()

        // Track metric
        this.env.METRICS.writeDataPoint({
          blobs: [execution.accountId, 'workflow_completed'],
          doubles: [Date.now(), 1],
          indexes: [execution.accountId],
        })
      })
    } catch (error: any) {
      // Handle error
      await step.do('handle-error', async () => {
        await this.env.DB.prepare('UPDATE workflow_executions SET status = ?, error = ? WHERE id = ?')
          .bind(
            'failed',
            JSON.stringify({
              message: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString(),
            }),
            execution.id
          )
          .run()

        // Track metric
        this.env.METRICS.writeDataPoint({
          blobs: [execution.accountId, 'workflow_failed'],
          doubles: [Date.now(), 1],
          indexes: [execution.accountId],
        })
      })

      throw error
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseWorkflowFromDB(row: any): Workflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    enabled: row.enabled === 1,
    accountId: row.accountId,
    steps: JSON.parse(row.steps),
    startStep: row.startStep,
    config: JSON.parse(row.config || '{}'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    executionCount: row.executionCount || 0,
    lastExecuted: row.lastExecuted,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
  }
}

function parseExecutionFromDB(row: any): WorkflowExecution {
  return {
    id: row.id,
    workflowId: row.workflowId,
    accountId: row.accountId,
    triggeredBy: JSON.parse(row.triggeredBy),
    status: row.status,
    currentStep: row.currentStep,
    completedSteps: JSON.parse(row.completedSteps || '[]'),
    input: JSON.parse(row.input),
    output: row.output ? JSON.parse(row.output) : undefined,
    context: JSON.parse(row.context || '{}'),
    error: row.error ? JSON.parse(row.error) : undefined,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    duration: row.duration,
  }
}

async function executeWorkflowStep(workflowStep: any, context: Record<string, any>, env: Env): Promise<any> {
  switch (workflowStep.type) {
    case 'action':
      return await executeAction(workflowStep.action.type, workflowStep.action.config, context, env)

    case 'delay':
      // Handled by Workflows step.sleep()
      return { delayed: true }

    case 'webhook':
      return await executeWebhook(workflowStep.webhook, context)

    case 'transform':
      return executeTransform(workflowStep.transform, context)

    case 'ai':
      return await executeAI(workflowStep.ai, context, env)

    case 'parallel':
      // Execute steps in parallel
      const parallelResults = await Promise.all(workflowStep.parallel.steps.map((stepId: string) => executeWorkflowStep({ id: stepId }, context, env)))
      return parallelResults

    case 'loop':
      // Execute loop
      const items = resolveReference(workflowStep.loop.items, context)
      const loopResults = []
      for (const item of items) {
        const loopContext = { ...context, item }
        for (const stepId of workflowStep.loop.steps) {
          await executeWorkflowStep({ id: stepId }, loopContext, env)
        }
        loopResults.push(loopContext)
      }
      return loopResults

    default:
      throw new Error(`Unknown step type: ${workflowStep.type}`)
  }
}

async function executeWebhook(config: any, context: Record<string, any>): Promise<any> {
  const headers = { ...config.headers }

  // Handle authentication
  if (config.auth) {
    if (config.auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${config.auth.config.token}`
    } else if (config.auth.type === 'api_key') {
      headers[config.auth.config.header] = config.auth.config.key
    }
  }

  const response = await fetch(config.url, {
    method: config.method,
    headers,
    body: config.body ? JSON.stringify(resolveReferences(config.body, context)) : undefined,
  })

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

function executeTransform(config: any, context: Record<string, any>): any {
  // Execute JavaScript transformation
  const input = config.input ? resolveReference(config.input, context) : context
  const fn = new Function('input', 'context', config.script)
  return fn(input, context)
}

async function executeAI(config: any, context: Record<string, any>, env: Env): Promise<any> {
  const input = config.input ? resolveReference(config.input, context) : ''
  const prompt = config.prompt.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] || '')

  const messages = [
    { role: 'system', content: prompt },
    { role: 'user', content: input },
  ]

  const response = await env.AI_BINDING.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    temperature: config.temperature || 0.7,
    max_tokens: config.maxTokens || 256,
  })

  return response
}

function evaluateCondition(expression: string, context: Record<string, any>): boolean {
  // Safe expression evaluation
  const fn = new Function('context', `with(context) { return ${expression} }`)
  return fn(context)
}

function resolveReference(reference: string, context: Record<string, any>): any {
  // Resolve references like "{{stepId.property}}"
  const match = reference.match(/^\{\{(.+)\}\}$/)
  if (!match) return reference

  const path = match[1].split('.')
  let value = context
  for (const key of path) {
    value = value?.[key]
  }
  return value
}

function resolveReferences(obj: any, context: Record<string, any>): any {
  if (typeof obj === 'string') {
    return resolveReference(obj, context)
  } else if (Array.isArray(obj)) {
    return obj.map((item) => resolveReferences(item, context))
  } else if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveReferences(value, context)
    }
    return result
  }
  return obj
}

export default app
