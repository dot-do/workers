/**
 * Fn Service - Intelligent Function Classification and Routing
 *
 * Features:
 * - AI-powered function classification (code, object, agentic, human)
 * - Automatic routing to appropriate services
 * - Sync and async execution modes
 * - Queue-based background processing
 *
 * Interfaces:
 * - RPC (WorkerEntrypoint) for service-to-service calls
 * - HTTP (Hono) for REST API
 * - Queue for background execution
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type {
  FnServiceEnv,
  ExecuteFunctionRequest,
  ExecuteFunctionResponse,
  FunctionClassification,
  FunctionType,
  ClassifiedFunction,
  RouteTarget,
  CodeFunction,
  ObjectFunction,
  AgenticFunction,
  HumanFunction
} from './types'
import { success, error, CLASSIFICATION_PROMPT } from './types'

/**
 * Fn Service RPC Interface
 */
export class FnService extends WorkerEntrypoint<FnServiceEnv> {
  /**
   * Execute function with intelligent classification and routing
   */
  async executeFunction(request: ExecuteFunctionRequest): Promise<ExecuteFunctionResponse> {
    const startTime = Date.now()

    try {
      // Build full function description
      const fullDescription = request.context
        ? `${request.context}\n\n${request.description}`
        : request.description

      // Add arguments to description if provided
      const descriptionWithArgs = request.args
        ? `${fullDescription}\n\nArguments: ${JSON.stringify(request.args, null, 2)}`
        : fullDescription

      // Classify function type
      const classification = await this.classifyFunction(descriptionWithArgs, request.options?.model)

      // Determine execution mode
      const mode = request.options?.mode || 'sync'

      if (mode === 'async') {
        // Queue for background processing
        const jobId = crypto.randomUUID()
        await this.env.FUNCTION_QUEUE.send({
          jobId,
          request,
          classification,
          timestamp: Date.now()
        })

        return {
          success: true,
          type: classification.type,
          classification,
          jobId,
          executionTime: Date.now() - startTime
        }
      }

      // Execute synchronously
      const result = await this.executeByType(classification.type, request, classification)

      return {
        success: true,
        type: classification.type,
        result,
        classification,
        executionTime: Date.now() - startTime
      }
    } catch (err) {
      return {
        success: false,
        type: 'code' as FunctionType,
        error: err instanceof Error ? err.message : 'Function execution failed',
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * Classify function using AI
   */
  private async classifyFunction(description: string, model?: string): Promise<FunctionClassification> {
    const aiModel = model || this.env.DEFAULT_MODEL || 'gpt-4o-mini'

    const prompt = CLASSIFICATION_PROMPT.replace('{{FUNCTION_DESCRIPTION}}', description)

    // Call AI_SERVICE to classify
    const response = await this.env.AI_SERVICE.generate(prompt, {
      model: aiModel,
      temperature: 0.3,
      maxTokens: 200,
      responseFormat: 'json'
    })

    const classification = JSON.parse(response.text) as FunctionClassification

    return classification
  }

  /**
   * Execute function based on classified type
   */
  private async executeByType(
    type: FunctionType,
    request: ExecuteFunctionRequest,
    classification: FunctionClassification
  ): Promise<any> {
    switch (type) {
      case 'code':
        return await this.executeCodeFunction(request)

      case 'object':
        return await this.executeObjectFunction(request)

      case 'agentic':
        return await this.executeAgenticFunction(request)

      case 'human':
        return await this.executeHumanFunction(request)

      default:
        throw new Error(`Unknown function type: ${type}`)
    }
  }

  /**
   * Execute code function via AI service
   */
  private async executeCodeFunction(request: ExecuteFunctionRequest): Promise<any> {
    const prompt = `Generate TypeScript code for the following function:

${request.description}

${request.args ? `Arguments: ${JSON.stringify(request.args, null, 2)}` : ''}

Return executable TypeScript code that can be run in a V8 isolate.
The code should include a default export that returns the result.

Example:
\`\`\`typescript
export default async function() {
  const result = /* your code */
  return result
}
\`\`\``

    const response = await this.env.AI_SERVICE.code(prompt, {
      language: 'typescript',
      style: 'production',
      includeTests: false
    })

    // Execute the generated code
    const execution = await this.env.AI_SERVICE.executeCode(response.code, {
      timeout: request.options?.timeout || 30000,
      captureConsole: true
    })

    // Handle execution result
    if (execution.success) {
      return execution.result
    } else {
      throw new Error(execution.error?.message || 'Code execution failed')
    }
  }

  /**
   * Execute object function via AI service
   */
  private async executeObjectFunction(request: ExecuteFunctionRequest): Promise<any> {
    const prompt = `Generate a structured JSON object for the following:

${request.description}

${request.args ? `Arguments: ${JSON.stringify(request.args, null, 2)}` : ''}

Return a valid JSON object that matches the requirements.`

    const response = await this.env.AI_SERVICE.generate(prompt, {
      model: request.options?.model || 'gpt-4o-mini',
      temperature: 0.5,
      responseFormat: 'json'
    })

    return JSON.parse(response.text)
  }

  /**
   * Execute agentic function via agent service
   */
  private async executeAgenticFunction(request: ExecuteFunctionRequest): Promise<any> {
    // Create agent with the function description as the query
    const agentResponse = await this.env.AGENT_SERVICE.createAgent({
      query: request.description,
      inferenceContext: {
        model: request.options?.model,
        temperature: request.options?.temperature,
        maxTokens: request.options?.maxTokens
      }
    })

    if (!agentResponse.success) {
      throw new Error(agentResponse.error || 'Failed to create agent')
    }

    // Start code generation
    await this.env.AGENT_SERVICE.generateCode(agentResponse.sessionId, {
      reviewCycles: 3,
      autoFix: true
    })

    // Wait for completion and get results
    const statusResponse = await this.env.AGENT_SERVICE.getStatus(agentResponse.sessionId)

    return {
      agentId: agentResponse.agentId,
      sessionId: agentResponse.sessionId,
      status: statusResponse.state,
      previewURL: statusResponse.previewURL
    }
  }

  /**
   * Execute human function by creating task in database
   */
  private async executeHumanFunction(request: ExecuteFunctionRequest): Promise<any> {
    // Create human task in database
    const task = {
      id: crypto.randomUUID(),
      description: request.description,
      args: request.args,
      priority: 'medium',
      status: 'pending',
      created_at: new Date().toISOString(),
      due_date: request.args?.dueDate || null,
      assignee: request.args?.assignee || null
    }

    await this.env.DB.execute({
      sql: `INSERT INTO human_tasks (id, description, args, priority, status, created_at, due_date, assignee)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        task.id,
        task.description,
        JSON.stringify(task.args),
        task.priority,
        task.status,
        task.created_at,
        task.due_date,
        task.assignee
      ]
    })

    return {
      taskId: task.id,
      status: 'pending',
      message: 'Human task created successfully'
    }
  }

  /**
   * HTTP handler
   */
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request, this.env, this.ctx)
  }
}

/**
 * HTTP API Interface
 */
const app = new Hono<{ Bindings: FnServiceEnv }>()

// CORS
app.use('*', cors())

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'fn', timestamp: new Date().toISOString() }))

// Execute function
app.post('/fn', async (c) => {
  const service = new FnService(c.executionCtx, c.env)
  const body = await c.req.json<ExecuteFunctionRequest>()
  const result = await service.executeFunction(body)
  return c.json(result)
})

// Get job status (for async execution)
app.get('/fn/jobs/:jobId', async (c) => {
  const jobId = c.req.param('jobId')

  // Query job status from database
  const result = await c.env.DB.query({
    sql: 'SELECT * FROM function_jobs WHERE id = ? LIMIT 1',
    params: [jobId]
  })

  if (!result?.rows || result.rows.length === 0) {
    return c.json(error('Job not found'), 404)
  }

  const job = result.rows[0]
  return c.json(success(job))
})

/**
 * Queue Handler for background function execution
 */
export async function handleQueueMessage(batch: MessageBatch, env: FnServiceEnv): Promise<void> {
  for (const message of batch.messages) {
    try {
      const { jobId, request, classification, timestamp } = message.body

      const service = new FnService({} as any, env)
      const result = await service.executeFunction(request)

      // Store result in database
      await env.DB.execute({
        sql: `INSERT INTO function_jobs (id, type, description, result, status, created_at, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [
          jobId,
          classification.type,
          request.description,
          JSON.stringify(result),
          result.success ? 'completed' : 'failed',
          new Date(timestamp).toISOString(),
          new Date().toISOString()
        ]
      })

      message.ack()
    } catch (err) {
      console.error('Failed to process function job:', err)
      message.retry()
    }
  }
}

/**
 * Export handlers
 */
export default {
  fetch: app.fetch,
  queue: handleQueueMessage
}
