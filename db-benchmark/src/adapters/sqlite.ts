import { BaseAdapter } from './base'
import type { Thing } from '../types'
import { DurableObject } from 'cloudflare:workers'

/**
 * Durable Object that wraps SQLite storage
 */
export class SQLiteStorage extends DurableObject {
  async query(sql: string, params: any[] = []): Promise<any[]> {
    const stmt = await this.ctx.storage.sql.exec(sql, ...params)
    return stmt.toArray()
  }

  async exec(sql: string, params: any[] = []): Promise<void> {
    await this.ctx.storage.sql.exec(sql, ...params)
  }

  async batch(statements: Array<{ sql: string; params: any[] }>): Promise<void> {
    // Execute all statements in a transaction
    for (const stmt of statements) {
      await this.exec(stmt.sql, stmt.params)
    }
  }
}

export class DurableObjectSQLiteAdapter extends BaseAdapter {
  name = 'Durable Object SQLite'
  description = 'SQLite in Durable Objects with automatic persistence'

  private storage: DurableObjectStub<SQLiteStorage> | null = null

  constructor(private env: { SQLITE_STORAGE: DurableObjectNamespace<SQLiteStorage> }, private storageId: string = 'benchmark') {
    super()
  }

  async connect(): Promise<void> {
    const id = this.env.SQLITE_STORAGE.idFromName(this.storageId)
    this.storage = this.env.SQLITE_STORAGE.get(id)

    // Test connection
    await this.storage.query('SELECT 1')
  }

  async disconnect(): Promise<void> {
    this.storage = null
  }

  async migrate(): Promise<void> {
    if (!this.storage) throw new Error('Not connected')

    await this.storage.exec(`
      CREATE TABLE IF NOT EXISTS benchmark_things (
        id TEXT PRIMARY KEY,
        ns TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        data TEXT,
        meta TEXT,
        embeddings TEXT,
        ts TEXT NOT NULL,
        ulid TEXT NOT NULL,
        CHECK (id LIKE 'https://%')
      )
    `)

    await this.storage.exec('CREATE INDEX IF NOT EXISTS idx_benchmark_ns ON benchmark_things(ns)')
    await this.storage.exec('CREATE INDEX IF NOT EXISTS idx_benchmark_type ON benchmark_things(type)')
    await this.storage.exec('CREATE INDEX IF NOT EXISTS idx_benchmark_ts ON benchmark_things(ts DESC)')
  }

  async clear(): Promise<void> {
    if (!this.storage) throw new Error('Not connected')
    await this.storage.exec('DELETE FROM benchmark_things')
  }

  async get(ns: string, id: string): Promise<Thing | null> {
    if (!this.storage) throw new Error('Not connected')

    const formattedId = this.formatId(ns, id)
    const result = await this.storage.query('SELECT * FROM benchmark_things WHERE id = ? LIMIT 1', [formattedId])

    if (result.length === 0) return null

    return this.rowToThing(result[0])
  }

  async list(ns: string, limit: number, offset: number): Promise<Thing[]> {
    if (!this.storage) throw new Error('Not connected')

    const result = await this.storage.query('SELECT * FROM benchmark_things WHERE ns = ? ORDER BY ts DESC LIMIT ? OFFSET ?', [ns, limit, offset])

    return result.map((row) => this.rowToThing(row))
  }

  async count(ns: string): Promise<number> {
    if (!this.storage) throw new Error('Not connected')

    const result = await this.storage.query('SELECT COUNT(*) as count FROM benchmark_things WHERE ns = ?', [ns])

    return result[0]?.count ?? 0
  }

  async aggregate(ns: string, field: string): Promise<Record<string, number>> {
    if (!this.storage) throw new Error('Not connected')

    const result = await this.storage.query('SELECT type, COUNT(*) as count FROM benchmark_things WHERE ns = ? GROUP BY type', [ns])

    const agg: Record<string, number> = {}
    for (const row of result) {
      agg[row.type] = row.count
    }
    return agg
  }

  async insert(thing: Thing): Promise<void> {
    if (!this.storage) throw new Error('Not connected')

    await this.storage.exec('INSERT INTO benchmark_things (id, ns, type, content, data, meta, embeddings, ts, ulid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      thing.id,
      thing.ns,
      thing.type,
      thing.content,
      JSON.stringify(thing.data),
      JSON.stringify(thing.meta),
      JSON.stringify(thing.embeddings),
      thing.ts.toISOString(),
      thing.ulid,
    ])
  }

  async batchInsert(things: Thing[]): Promise<void> {
    if (!this.storage) throw new Error('Not connected')

    const statements = things.map((thing) => ({
      sql: 'INSERT INTO benchmark_things (id, ns, type, content, data, meta, embeddings, ts, ulid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params: [thing.id, thing.ns, thing.type, thing.content, JSON.stringify(thing.data), JSON.stringify(thing.meta), JSON.stringify(thing.embeddings), thing.ts.toISOString(), thing.ulid],
    }))

    await this.storage.batch(statements)
  }

  async update(ns: string, id: string, data: Partial<Thing>): Promise<void> {
    if (!this.storage) throw new Error('Not connected')

    const formattedId = this.formatId(ns, id)
    const updates: string[] = []
    const values: any[] = []

    if (data.type !== undefined) {
      updates.push('type = ?')
      values.push(data.type)
    }
    if (data.content !== undefined) {
      updates.push('content = ?')
      values.push(data.content)
    }
    if (data.data !== undefined) {
      updates.push('data = ?')
      values.push(JSON.stringify(data.data))
    }
    if (data.meta !== undefined) {
      updates.push('meta = ?')
      values.push(JSON.stringify(data.meta))
    }
    if (data.embeddings !== undefined) {
      updates.push('embeddings = ?')
      values.push(JSON.stringify(data.embeddings))
    }

    if (updates.length === 0) return

    values.push(formattedId)

    await this.storage.exec(`UPDATE benchmark_things SET ${updates.join(', ')} WHERE id = ?`, values)
  }

  async upsert(thing: Thing): Promise<void> {
    if (!this.storage) throw new Error('Not connected')

    await this.storage.exec(
      `
      INSERT INTO benchmark_things (id, ns, type, content, data, meta, embeddings, ts, ulid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        content = excluded.content,
        data = excluded.data,
        meta = excluded.meta,
        embeddings = excluded.embeddings,
        ts = excluded.ts
    `,
      [thing.id, thing.ns, thing.type, thing.content, JSON.stringify(thing.data), JSON.stringify(thing.meta), JSON.stringify(thing.embeddings), thing.ts.toISOString(), thing.ulid]
    )
  }

  async delete(ns: string, id: string): Promise<void> {
    if (!this.storage) throw new Error('Not connected')

    const formattedId = this.formatId(ns, id)
    await this.storage.exec('DELETE FROM benchmark_things WHERE id = ?', [formattedId])
  }

  async fullTextSearch(query: string, limit: number): Promise<Thing[]> {
    if (!this.storage) throw new Error('Not connected')

    // Simple LIKE search (SQLite FTS would require additional setup)
    const result = await this.storage.query('SELECT * FROM benchmark_things WHERE content LIKE ? ORDER BY ts DESC LIMIT ?', [`%${query}%`, limit])

    return result.map((row) => this.rowToThing(row))
  }

  async vectorSearch(embedding: number[], limit: number): Promise<Thing[]> {
    if (!this.storage) throw new Error('Not connected')

    // No native vector support, fetch all and compute in-memory
    const all = await this.storage.query('SELECT * FROM benchmark_things')

    const withDistance = all
      .map((row) => {
        const thing = this.rowToThing(row)
        const distance = thing.embeddings ? this.euclideanDistance(embedding, thing.embeddings) : Infinity
        return { thing, distance }
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)

    return withDistance.map((item) => item.thing)
  }

  async hybridSearch(query: string, embedding: number[], limit: number): Promise<Thing[]> {
    if (!this.storage) throw new Error('Not connected')

    const textResults = await this.fullTextSearch(query, limit * 2)

    const withScore = textResults
      .map((thing, index) => {
        const textScore = 1 - index / textResults.length
        const vectorScore = thing.embeddings ? 1 - this.euclideanDistance(embedding, thing.embeddings) : 0
        const hybridScore = textScore * 0.3 + vectorScore * 0.7
        return { thing, hybridScore }
      })
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, limit)

    return withScore.map((item) => item.thing)
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // Durable Objects provide automatic transactional guarantees
    return fn()
  }

  async estimateCost(operations: number): Promise<number> {
    // Durable Objects pricing: $0.15/million requests + $0.20/GB-month storage
    // Rough estimate: ~$0.25 per million operations
    const costPerMillionOps = 0.25
    return (operations / 1_000_000) * costPerMillionOps
  }

  private rowToThing(row: any): Thing {
    return {
      id: row.id,
      ns: row.ns,
      type: row.type,
      content: row.content,
      data: row.data ? JSON.parse(row.data) : undefined,
      meta: row.meta ? JSON.parse(row.meta) : undefined,
      embeddings: row.embeddings ? JSON.parse(row.embeddings) : undefined,
      ts: new Date(row.ts),
      ulid: row.ulid,
    }
  }

  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity
    let sum = 0
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2
    }
    return Math.sqrt(sum)
  }
}
