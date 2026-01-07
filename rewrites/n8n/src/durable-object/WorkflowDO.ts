/**
 * WorkflowDO - Durable Object for workflow definitions
 *
 * Stores workflow configurations and handles workflow lifecycle.
 */

import { DurableObject } from 'cloudflare:workers'

export interface Env {
  WORKFLOW_DO: DurableObjectNamespace<WorkflowDO>
  EXECUTION_DO: DurableObjectNamespace
  CREDENTIAL_DO: DurableObjectNamespace
}

interface StoredWorkflow {
  id: string
  name?: string
  trigger: {
    type: string
    expression?: string
    event?: string
    every?: string
  }
  settings?: {
    retryOnFail?: boolean
    maxRetries?: number
    waitBetweenRetries?: number
  }
  nodes: StoredNode[]
  createdAt: string
  updatedAt: string
}

interface StoredNode {
  id: string
  type: string
  position: { x: number; y: number }
  config: Record<string, unknown>
  connections: { nodeId: string; output: number }[]
}

export class WorkflowDO extends DurableObject<Env> {
  private sql: SqlStorage

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sql = ctx.storage.sql

    // Initialize schema
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT,
        trigger_type TEXT NOT NULL,
        trigger_config TEXT,
        settings TEXT,
        nodes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
    `)
  }

  /**
   * Create or update a workflow
   */
  async upsertWorkflow(workflow: StoredWorkflow): Promise<StoredWorkflow> {
    const now = new Date().toISOString()
    const existing = this.getWorkflowById(workflow.id)

    if (existing) {
      this.sql.exec(
        `UPDATE workflows SET
          name = ?,
          trigger_type = ?,
          trigger_config = ?,
          settings = ?,
          nodes = ?,
          updated_at = ?
        WHERE id = ?`,
        workflow.name ?? null,
        workflow.trigger.type,
        JSON.stringify(workflow.trigger),
        workflow.settings ? JSON.stringify(workflow.settings) : null,
        JSON.stringify(workflow.nodes),
        now,
        workflow.id
      )
    } else {
      this.sql.exec(
        `INSERT INTO workflows (id, name, trigger_type, trigger_config, settings, nodes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        workflow.id,
        workflow.name ?? null,
        workflow.trigger.type,
        JSON.stringify(workflow.trigger),
        workflow.settings ? JSON.stringify(workflow.settings) : null,
        JSON.stringify(workflow.nodes),
        now,
        now
      )
    }

    return {
      ...workflow,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
  }

  /**
   * Get a workflow by ID
   */
  getWorkflowById(id: string): StoredWorkflow | null {
    const result = this.sql.exec<{
      id: string
      name: string | null
      trigger_type: string
      trigger_config: string
      settings: string | null
      nodes: string
      created_at: string
      updated_at: string
    }>(`SELECT * FROM workflows WHERE id = ?`, id)

    const row = result.toArray()[0]
    if (!row) return null

    return {
      id: row.id,
      name: row.name ?? undefined,
      trigger: JSON.parse(row.trigger_config),
      settings: row.settings ? JSON.parse(row.settings) : undefined,
      nodes: JSON.parse(row.nodes),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  /**
   * List all workflows
   */
  listWorkflows(): StoredWorkflow[] {
    const result = this.sql.exec<{
      id: string
      name: string | null
      trigger_type: string
      trigger_config: string
      settings: string | null
      nodes: string
      created_at: string
      updated_at: string
    }>(`SELECT * FROM workflows ORDER BY updated_at DESC`)

    return result.toArray().map(row => ({
      id: row.id,
      name: row.name ?? undefined,
      trigger: JSON.parse(row.trigger_config),
      settings: row.settings ? JSON.parse(row.settings) : undefined,
      nodes: JSON.parse(row.nodes),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  /**
   * Delete a workflow
   */
  deleteWorkflow(id: string): boolean {
    const existing = this.getWorkflowById(id)
    if (!existing) return false

    this.sql.exec(`DELETE FROM workflows WHERE id = ?`, id)
    return true
  }

  /**
   * Get workflows by trigger type
   */
  getWorkflowsByTrigger(triggerType: string): StoredWorkflow[] {
    const result = this.sql.exec<{
      id: string
      name: string | null
      trigger_type: string
      trigger_config: string
      settings: string | null
      nodes: string
      created_at: string
      updated_at: string
    }>(`SELECT * FROM workflows WHERE trigger_type = ?`, triggerType)

    return result.toArray().map(row => ({
      id: row.id,
      name: row.name ?? undefined,
      trigger: JSON.parse(row.trigger_config),
      settings: row.settings ? JSON.parse(row.settings) : undefined,
      nodes: JSON.parse(row.nodes),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  /**
   * Handle HTTP requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // GET /workflows - List all workflows
      if (request.method === 'GET' && path === '/workflows') {
        return Response.json(this.listWorkflows())
      }

      // GET /workflows/:id - Get workflow by ID
      if (request.method === 'GET' && path.startsWith('/workflows/')) {
        const id = path.split('/')[2]
        const workflow = this.getWorkflowById(id)
        if (!workflow) {
          return Response.json({ error: 'Workflow not found' }, { status: 404 })
        }
        return Response.json(workflow)
      }

      // POST /workflows - Create/update workflow
      if (request.method === 'POST' && path === '/workflows') {
        const body = await request.json() as StoredWorkflow
        const workflow = await this.upsertWorkflow(body)
        return Response.json(workflow)
      }

      // DELETE /workflows/:id - Delete workflow
      if (request.method === 'DELETE' && path.startsWith('/workflows/')) {
        const id = path.split('/')[2]
        const deleted = this.deleteWorkflow(id)
        if (!deleted) {
          return Response.json({ error: 'Workflow not found' }, { status: 404 })
        }
        return Response.json({ deleted: true })
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      console.error('WorkflowDO error:', error)
      return Response.json(
        { error: error instanceof Error ? error.message : 'Internal error' },
        { status: 500 }
      )
    }
  }
}
