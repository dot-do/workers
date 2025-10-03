import { BaseAdapter } from './base'
import type { Thing } from '../types'

export class D1Adapter extends BaseAdapter {
  name = 'Cloudflare D1'
  description = 'SQLite-based serverless database on Cloudflare edge'

  constructor(private db: D1Database) {
    super()
  }

  async connect(): Promise<void> {
    // D1 binding is always connected, just test it
    await this.db.prepare('SELECT 1').first()
  }

  async disconnect(): Promise<void> {
    // D1 binding doesn't need disconnection
  }

  async migrate(): Promise<void> {
    // Create benchmark table (D1 uses SQLite syntax, no vector support)
    await this.db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS benchmark_things (
        id TEXT PRIMARY KEY,
        ns TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        data TEXT, -- JSON as TEXT
        meta TEXT, -- JSON as TEXT
        embeddings TEXT, -- JSON array as TEXT
        ts TEXT NOT NULL, -- ISO 8601 timestamp
        ulid TEXT NOT NULL,
        CHECK (id LIKE 'https://%')
      )
    `
      )
      .run()

    // Create indexes
    await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_benchmark_ns ON benchmark_things(ns)').run()
    await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_benchmark_type ON benchmark_things(type)').run()
    await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_benchmark_ts ON benchmark_things(ts DESC)').run()
    // D1 has FTS5 support
    await this.db
      .prepare(
        `
      CREATE VIRTUAL TABLE IF NOT EXISTS benchmark_things_fts
      USING fts5(content, content=benchmark_things, content_rowid=rowid)
    `
      )
      .run()
  }

  async clear(): Promise<void> {
    await this.db.prepare('DELETE FROM benchmark_things').run()
  }

  async get(ns: string, id: string): Promise<Thing | null> {
    const formattedId = this.formatId(ns, id)

    const result = await this.db.prepare('SELECT * FROM benchmark_things WHERE id = ? LIMIT 1').bind(formattedId).first<any>()

    if (!result) return null

    return this.rowToThing(result)
  }

  async list(ns: string, limit: number, offset: number): Promise<Thing[]> {
    const result = await this.db.prepare('SELECT * FROM benchmark_things WHERE ns = ? ORDER BY ts DESC LIMIT ? OFFSET ?').bind(ns, limit, offset).all<any>()

    return result.results.map((row) => this.rowToThing(row))
  }

  async count(ns: string): Promise<number> {
    const result = await this.db.prepare('SELECT COUNT(*) as count FROM benchmark_things WHERE ns = ?').bind(ns).first<{ count: number }>()

    return result?.count ?? 0
  }

  async aggregate(ns: string, field: string): Promise<Record<string, number>> {
    const result = await this.db.prepare('SELECT type, COUNT(*) as count FROM benchmark_things WHERE ns = ? GROUP BY type').bind(ns).all<{ type: string; count: number }>()

    const agg: Record<string, number> = {}
    for (const row of result.results) {
      agg[row.type] = row.count
    }
    return agg
  }

  async insert(thing: Thing): Promise<void> {
    await this.db
      .prepare('INSERT INTO benchmark_things (id, ns, type, content, data, meta, embeddings, ts, ulid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(thing.id, thing.ns, thing.type, thing.content, JSON.stringify(thing.data), JSON.stringify(thing.meta), JSON.stringify(thing.embeddings), thing.ts.toISOString(), thing.ulid)
      .run()
  }

  async batchInsert(things: Thing[]): Promise<void> {
    // D1 supports batch operations
    const batch = things.map((thing) =>
      this.db
        .prepare('INSERT INTO benchmark_things (id, ns, type, content, data, meta, embeddings, ts, ulid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(thing.id, thing.ns, thing.type, thing.content, JSON.stringify(thing.data), JSON.stringify(thing.meta), JSON.stringify(thing.embeddings), thing.ts.toISOString(), thing.ulid)
    )

    // D1 batch API executes all statements in a transaction
    await this.db.batch(batch)
  }

  async update(ns: string, id: string, data: Partial<Thing>): Promise<void> {
    const formattedId = this.formatId(ns, id)

    // Build dynamic update query
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

    await this.db.prepare(`UPDATE benchmark_things SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
  }

  async upsert(thing: Thing): Promise<void> {
    // SQLite supports UPSERT via INSERT ... ON CONFLICT
    await this.db
      .prepare(
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
    `
      )
      .bind(thing.id, thing.ns, thing.type, thing.content, JSON.stringify(thing.data), JSON.stringify(thing.meta), JSON.stringify(thing.embeddings), thing.ts.toISOString(), thing.ulid)
      .run()
  }

  async delete(ns: string, id: string): Promise<void> {
    const formattedId = this.formatId(ns, id)
    await this.db.prepare('DELETE FROM benchmark_things WHERE id = ?').bind(formattedId).run()
  }

  async fullTextSearch(query: string, limit: number): Promise<Thing[]> {
    // Use FTS5 for full-text search
    const result = await this.db
      .prepare(
        `
      SELECT t.* FROM benchmark_things t
      JOIN benchmark_things_fts fts ON t.rowid = fts.rowid
      WHERE benchmark_things_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `
      )
      .bind(query, limit)
      .all<any>()

    return result.results.map((row) => this.rowToThing(row))
  }

  async vectorSearch(embedding: number[], limit: number): Promise<Thing[]> {
    // D1/SQLite doesn't have native vector similarity support
    // Fallback: fetch all and compute similarity in-memory (slow!)
    const all = await this.db.prepare('SELECT * FROM benchmark_things').all<any>()

    const withDistance = all.results
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
    // Simplified hybrid: get FTS results and re-rank by vector similarity
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
    // D1 batch API provides transactional semantics
    // For simplicity, just execute the function
    return fn()
  }

  async estimateCost(operations: number): Promise<number> {
    // D1 pricing: First 5M reads free, then $0.001/1000 reads
    // First 100K writes free, then $1/1M writes
    // Average: ~$0.20 per million mixed operations
    const costPerMillionOps = 0.2
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
