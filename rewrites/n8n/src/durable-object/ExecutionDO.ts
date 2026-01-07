/**
 * ExecutionDO - Durable Object for workflow execution state
 *
 * Tracks execution runs, node outputs, and execution history.
 */

import { DurableObject } from 'cloudflare:workers'

export interface Env {
  WORKFLOW_DO: DurableObjectNamespace
  EXECUTION_DO: DurableObjectNamespace<ExecutionDO>
  CREDENTIAL_DO: DurableObjectNamespace
}

interface Execution {
  id: string
  workflowId: string
  status: 'running' | 'success' | 'error' | 'waiting'
  trigger: {
    data: Record<string, unknown>
    headers?: Record<string, string>
    method?: string
    timestamp: string
  }
  nodeResults: Record<string, NodeResult>
  startedAt: string
  finishedAt?: string
  error?: string
}

interface NodeResult {
  nodeId: string
  output: unknown
  duration: number
  status: 'success' | 'error'
  error?: string
  startedAt: string
  finishedAt: string
}

export class ExecutionDO extends DurableObject<Env> {
  private sql: SqlStorage

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sql = ctx.storage.sql

    // Initialize schema
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL,
        trigger_data TEXT NOT NULL,
        node_results TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_executions_workflow ON executions(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
      CREATE INDEX IF NOT EXISTS idx_executions_started ON executions(started_at DESC);
    `)
  }

  /**
   * Start a new execution
   */
  async startExecution(config: {
    id: string
    workflowId: string
    trigger: Execution['trigger']
  }): Promise<Execution> {
    const now = new Date().toISOString()

    const execution: Execution = {
      id: config.id,
      workflowId: config.workflowId,
      status: 'running',
      trigger: config.trigger,
      nodeResults: {},
      startedAt: now
    }

    this.sql.exec(
      `INSERT INTO executions (id, workflow_id, status, trigger_data, node_results, started_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
      execution.id,
      execution.workflowId,
      execution.status,
      JSON.stringify(execution.trigger),
      JSON.stringify(execution.nodeResults),
      execution.startedAt
    )

    return execution
  }

  /**
   * Record a node result
   */
  async recordNodeResult(executionId: string, result: NodeResult): Promise<void> {
    const execution = this.getExecutionById(executionId)
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    execution.nodeResults[result.nodeId] = result

    this.sql.exec(
      `UPDATE executions SET node_results = ? WHERE id = ?`,
      JSON.stringify(execution.nodeResults),
      executionId
    )
  }

  /**
   * Complete an execution
   */
  async completeExecution(executionId: string, status: 'success' | 'error', error?: string): Promise<Execution> {
    const now = new Date().toISOString()

    this.sql.exec(
      `UPDATE executions SET status = ?, finished_at = ?, error = ? WHERE id = ?`,
      status,
      now,
      error ?? null,
      executionId
    )

    const execution = this.getExecutionById(executionId)
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    return execution
  }

  /**
   * Get execution by ID
   */
  getExecutionById(id: string): Execution | null {
    const result = this.sql.exec<{
      id: string
      workflow_id: string
      status: string
      trigger_data: string
      node_results: string | null
      started_at: string
      finished_at: string | null
      error: string | null
    }>(`SELECT * FROM executions WHERE id = ?`, id)

    const row = result.toArray()[0]
    if (!row) return null

    return {
      id: row.id,
      workflowId: row.workflow_id,
      status: row.status as Execution['status'],
      trigger: JSON.parse(row.trigger_data),
      nodeResults: row.node_results ? JSON.parse(row.node_results) : {},
      startedAt: row.started_at,
      finishedAt: row.finished_at ?? undefined,
      error: row.error ?? undefined
    }
  }

  /**
   * List executions with optional filters
   */
  listExecutions(options?: {
    workflowId?: string
    status?: string
    limit?: number
    offset?: number
  }): Execution[] {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    let query = `SELECT * FROM executions WHERE 1=1`
    const params: (string | number)[] = []

    if (options?.workflowId) {
      query += ` AND workflow_id = ?`
      params.push(options.workflowId)
    }

    if (options?.status) {
      query += ` AND status = ?`
      params.push(options.status)
    }

    query += ` ORDER BY started_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const result = this.sql.exec<{
      id: string
      workflow_id: string
      status: string
      trigger_data: string
      node_results: string | null
      started_at: string
      finished_at: string | null
      error: string | null
    }>(query, ...params)

    return result.toArray().map(row => ({
      id: row.id,
      workflowId: row.workflow_id,
      status: row.status as Execution['status'],
      trigger: JSON.parse(row.trigger_data),
      nodeResults: row.node_results ? JSON.parse(row.node_results) : {},
      startedAt: row.started_at,
      finishedAt: row.finished_at ?? undefined,
      error: row.error ?? undefined
    }))
  }

  /**
   * Handle HTTP requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // GET /executions - List executions
      if (request.method === 'GET' && path === '/executions') {
        const workflowId = url.searchParams.get('workflowId') ?? undefined
        const status = url.searchParams.get('status') ?? undefined
        const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined
        const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined

        return Response.json(this.listExecutions({ workflowId, status, limit, offset }))
      }

      // GET /executions/:id - Get execution by ID
      if (request.method === 'GET' && path.startsWith('/executions/')) {
        const id = path.split('/')[2]
        const execution = this.getExecutionById(id)
        if (!execution) {
          return Response.json({ error: 'Execution not found' }, { status: 404 })
        }
        return Response.json(execution)
      }

      // POST /executions - Start execution
      if (request.method === 'POST' && path === '/executions') {
        const body = await request.json() as {
          id: string
          workflowId: string
          trigger: Execution['trigger']
        }
        const execution = await this.startExecution(body)
        return Response.json(execution)
      }

      // POST /executions/:id/nodes - Record node result
      if (request.method === 'POST' && path.match(/^\/executions\/[^/]+\/nodes$/)) {
        const id = path.split('/')[2]
        const result = await request.json() as NodeResult
        await this.recordNodeResult(id, result)
        return Response.json({ recorded: true })
      }

      // POST /executions/:id/complete - Complete execution
      if (request.method === 'POST' && path.match(/^\/executions\/[^/]+\/complete$/)) {
        const id = path.split('/')[2]
        const body = await request.json() as { status: 'success' | 'error'; error?: string }
        const execution = await this.completeExecution(id, body.status, body.error)
        return Response.json(execution)
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      console.error('ExecutionDO error:', error)
      return Response.json(
        { error: error instanceof Error ? error.message : 'Internal error' },
        { status: 500 }
      )
    }
  }
}
