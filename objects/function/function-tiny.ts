/**
 * function.do/tiny - Minimal implementation
 *
 * Basic function management without Drizzle ORM.
 * Uses raw SQLite for minimal bundle size.
 */

import { DurableObject } from 'cloudflare:workers'

export interface FunctionRecord {
  id: string
  name: string
  code: string
  runtime: string
  version: number
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface ExecutionResult<T = unknown> {
  id: string
  output?: T
  error?: string
  status: 'completed' | 'failed' | 'timeout'
  duration: number
  coldStart: boolean
}

function generateId(): string {
  return crypto.randomUUID()
}

export class FunctionDO extends DurableObject {
  private initialized = false

  private async init() {
    if (this.initialized) return
    this.initialized = true

    const sql = this.ctx.storage.sql

    sql.exec(`
      CREATE TABLE IF NOT EXISTS functions (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT NOT NULL,
        runtime TEXT DEFAULT 'v8',
        version INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        created_at INTEGER,
        updated_at INTEGER
      )
    `)

    sql.exec(`
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        function_id TEXT NOT NULL,
        input TEXT,
        output TEXT,
        error TEXT,
        status TEXT DEFAULT 'pending',
        duration INTEGER,
        cold_start INTEGER DEFAULT 0,
        created_at INTEGER,
        FOREIGN KEY (function_id) REFERENCES functions(id)
      )
    `)

    sql.exec(`CREATE INDEX IF NOT EXISTS idx_functions_name ON functions(name)`)
    sql.exec(`CREATE INDEX IF NOT EXISTS idx_executions_function ON executions(function_id)`)
  }

  async deploy(params: {
    name: string
    code: string
    runtime?: string
  }): Promise<FunctionRecord> {
    await this.init()
    const sql = this.ctx.storage.sql
    const now = Date.now()

    // Check if exists
    const existing = sql
      .exec('SELECT * FROM functions WHERE name = ?', params.name)
      .toArray()[0] as FunctionRecord | undefined

    if (existing) {
      sql.exec(
        'UPDATE functions SET code = ?, runtime = ?, version = version + 1, updated_at = ? WHERE name = ?',
        params.code,
        params.runtime || existing.runtime,
        now,
        params.name
      )

      return sql.exec('SELECT * FROM functions WHERE name = ?', params.name).toArray()[0] as FunctionRecord
    }

    const id = generateId()
    sql.exec(
      'INSERT INTO functions (id, name, code, runtime, version, status, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
      id,
      params.name,
      params.code,
      params.runtime || 'v8',
      'active',
      now,
      now
    )

    return sql.exec('SELECT * FROM functions WHERE id = ?', id).toArray()[0] as FunctionRecord
  }

  async get(name: string): Promise<FunctionRecord | undefined> {
    await this.init()
    return this.ctx.storage.sql.exec('SELECT * FROM functions WHERE name = ?', name).toArray()[0] as
      | FunctionRecord
      | undefined
  }

  async list(): Promise<FunctionRecord[]> {
    await this.init()
    return this.ctx.storage.sql.exec('SELECT * FROM functions ORDER BY name').toArray() as FunctionRecord[]
  }

  async invoke<T = unknown>(name: string, input?: unknown): Promise<ExecutionResult<T>> {
    await this.init()
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)
    if (fn.status === 'disabled') throw new Error(`Function is disabled: ${name}`)

    const executionId = generateId()
    const startTime = Date.now()
    const sql = this.ctx.storage.sql

    sql.exec(
      'INSERT INTO executions (id, function_id, input, status, created_at) VALUES (?, ?, ?, ?, ?)',
      executionId,
      fn.id,
      input ? JSON.stringify(input) : null,
      'running',
      startTime
    )

    try {
      // Simple execution (for demo - use proper sandboxing in production)
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
      const handler = new AsyncFunction(
        'input',
        `
        ${fn.code}
        if (typeof exports !== 'undefined' && exports.default) {
          return exports.default(input)
        }
        throw new Error('Function must export a default handler')
      `
      )

      const output = (await handler(input)) as T
      const duration = Date.now() - startTime

      sql.exec(
        'UPDATE executions SET status = ?, output = ?, duration = ? WHERE id = ?',
        'completed',
        JSON.stringify(output),
        duration,
        executionId
      )

      return { id: executionId, output, status: 'completed', duration, coldStart: true }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      sql.exec(
        'UPDATE executions SET status = ?, error = ?, duration = ? WHERE id = ?',
        'failed',
        errorMessage,
        duration,
        executionId
      )

      return { id: executionId, error: errorMessage, status: 'failed', duration, coldStart: true }
    }
  }

  async delete(name: string): Promise<void> {
    await this.init()
    const fn = await this.get(name)
    if (!fn) return

    const sql = this.ctx.storage.sql
    sql.exec('DELETE FROM executions WHERE function_id = ?', fn.id)
    sql.exec('DELETE FROM functions WHERE id = ?', fn.id)
  }
}
