import { BaseAdapter } from './base'
import type { Thing } from '../types'
import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless'

export class PostgresAdapter extends BaseAdapter {
  name = 'PostgreSQL (Neon)'
  description = 'PostgreSQL serverless with Neon, pgvector support'

  private sql: NeonQueryFunction<false, false> | null = null

  constructor(private connectionString: string) {
    super()
    // Enable HTTP fetch for Cloudflare Workers compatibility
    neonConfig.fetchConnectionCache = true
  }

  async connect(): Promise<void> {
    this.sql = neon(this.connectionString)
    // Test connection
    await this.sql`SELECT 1`
  }

  async disconnect(): Promise<void> {
    this.sql = null
  }

  async migrate(): Promise<void> {
    if (!this.sql) throw new Error('Not connected')

    // Create pgvector extension
    await this.sql`CREATE EXTENSION IF NOT EXISTS vector`

    // Create benchmark table
    await this.sql`
      CREATE TABLE IF NOT EXISTS benchmark_things (
        id TEXT PRIMARY KEY,
        ns TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        data JSONB,
        meta JSONB,
        embeddings vector(768),
        ts TIMESTAMPTZ NOT NULL,
        ulid TEXT NOT NULL,
        CONSTRAINT valid_id CHECK (id ~ '^https://')
      )
    `

    // Create indexes for performance
    await this.sql`CREATE INDEX IF NOT EXISTS idx_benchmark_ns ON benchmark_things(ns)`
    await this.sql`CREATE INDEX IF NOT EXISTS idx_benchmark_type ON benchmark_things(type)`
    await this.sql`CREATE INDEX IF NOT EXISTS idx_benchmark_ts ON benchmark_things(ts DESC)`
    await this.sql`CREATE INDEX IF NOT EXISTS idx_benchmark_content_fts ON benchmark_things USING gin(to_tsvector('english', content))`
    await this.sql`CREATE INDEX IF NOT EXISTS idx_benchmark_embeddings ON benchmark_things USING ivfflat(embeddings vector_cosine_ops) WITH (lists = 100)`
  }

  async clear(): Promise<void> {
    if (!this.sql) throw new Error('Not connected')
    await this.sql`TRUNCATE TABLE benchmark_things`
  }

  async get(ns: string, id: string): Promise<Thing | null> {
    if (!this.sql) throw new Error('Not connected')

    const formattedId = this.formatId(ns, id)
    const result = await this.sql`
      SELECT * FROM benchmark_things WHERE id = ${formattedId} LIMIT 1
    `

    if (result.length === 0) return null

    const row = result[0]
    return {
      id: row.id,
      ns: row.ns,
      type: row.type,
      content: row.content,
      data: row.data,
      meta: row.meta,
      embeddings: row.embeddings ? JSON.parse(`[${row.embeddings}]`) : undefined,
      ts: new Date(row.ts),
      ulid: row.ulid,
    }
  }

  async list(ns: string, limit: number, offset: number): Promise<Thing[]> {
    if (!this.sql) throw new Error('Not connected')

    const result = await this.sql`
      SELECT * FROM benchmark_things
      WHERE ns = ${ns}
      ORDER BY ts DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return result.map((row) => ({
      id: row.id,
      ns: row.ns,
      type: row.type,
      content: row.content,
      data: row.data,
      meta: row.meta,
      embeddings: row.embeddings ? JSON.parse(`[${row.embeddings}]`) : undefined,
      ts: new Date(row.ts),
      ulid: row.ulid,
    }))
  }

  async count(ns: string): Promise<number> {
    if (!this.sql) throw new Error('Not connected')

    const result = await this.sql`
      SELECT COUNT(*)::int as count FROM benchmark_things WHERE ns = ${ns}
    `

    return result[0]?.count ?? 0
  }

  async aggregate(ns: string, field: string): Promise<Record<string, number>> {
    if (!this.sql) throw new Error('Not connected')

    // Aggregate by type
    const result = await this.sql`
      SELECT type, COUNT(*)::int as count
      FROM benchmark_things
      WHERE ns = ${ns}
      GROUP BY type
    `

    const agg: Record<string, number> = {}
    for (const row of result) {
      agg[row.type] = row.count
    }
    return agg
  }

  async insert(thing: Thing): Promise<void> {
    if (!this.sql) throw new Error('Not connected')

    await this.sql`
      INSERT INTO benchmark_things (id, ns, type, content, data, meta, embeddings, ts, ulid)
      VALUES (
        ${thing.id},
        ${thing.ns},
        ${thing.type},
        ${thing.content},
        ${JSON.stringify(thing.data)},
        ${JSON.stringify(thing.meta)},
        ${thing.embeddings ? `[${thing.embeddings.join(',')}]` : null},
        ${thing.ts.toISOString()},
        ${thing.ulid}
      )
    `
  }

  async batchInsert(things: Thing[]): Promise<void> {
    if (!this.sql) throw new Error('Not connected')

    // PostgreSQL supports multi-row inserts efficiently
    const values = things.map((thing) => ({
      id: thing.id,
      ns: thing.ns,
      type: thing.type,
      content: thing.content,
      data: JSON.stringify(thing.data),
      meta: JSON.stringify(thing.meta),
      embeddings: thing.embeddings ? `[${thing.embeddings.join(',')}]` : null,
      ts: thing.ts.toISOString(),
      ulid: thing.ulid,
    }))

    // Batch insert in chunks of 100 to avoid query size limits
    const chunkSize = 100
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize)

      await this.sql`
        INSERT INTO benchmark_things (id, ns, type, content, data, meta, embeddings, ts, ulid)
        SELECT * FROM json_populate_recordset(null::benchmark_things, ${JSON.stringify(chunk)})
      `
    }
  }

  async update(ns: string, id: string, data: Partial<Thing>): Promise<void> {
    if (!this.sql) throw new Error('Not connected')

    const formattedId = this.formatId(ns, id)

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []

    if (data.type !== undefined) {
      updates.push('type = $' + (values.length + 1))
      values.push(data.type)
    }
    if (data.content !== undefined) {
      updates.push('content = $' + (values.length + 1))
      values.push(data.content)
    }
    if (data.data !== undefined) {
      updates.push('data = $' + (values.length + 1))
      values.push(JSON.stringify(data.data))
    }
    if (data.meta !== undefined) {
      updates.push('meta = $' + (values.length + 1))
      values.push(JSON.stringify(data.meta))
    }
    if (data.embeddings !== undefined) {
      updates.push('embeddings = $' + (values.length + 1))
      values.push(`[${data.embeddings.join(',')}]`)
    }

    if (updates.length === 0) return

    await this.sql`
      UPDATE benchmark_things
      SET ${this.sql(updates.join(', '))}
      WHERE id = ${formattedId}
    `
  }

  async upsert(thing: Thing): Promise<void> {
    if (!this.sql) throw new Error('Not connected')

    await this.sql`
      INSERT INTO benchmark_things (id, ns, type, content, data, meta, embeddings, ts, ulid)
      VALUES (
        ${thing.id},
        ${thing.ns},
        ${thing.type},
        ${thing.content},
        ${JSON.stringify(thing.data)},
        ${JSON.stringify(thing.meta)},
        ${thing.embeddings ? `[${thing.embeddings.join(',')}]` : null},
        ${thing.ts.toISOString()},
        ${thing.ulid}
      )
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        content = EXCLUDED.content,
        data = EXCLUDED.data,
        meta = EXCLUDED.meta,
        embeddings = EXCLUDED.embeddings,
        ts = EXCLUDED.ts
    `
  }

  async delete(ns: string, id: string): Promise<void> {
    if (!this.sql) throw new Error('Not connected')

    const formattedId = this.formatId(ns, id)
    await this.sql`DELETE FROM benchmark_things WHERE id = ${formattedId}`
  }

  async fullTextSearch(query: string, limit: number): Promise<Thing[]> {
    if (!this.sql) throw new Error('Not connected')

    const result = await this.sql`
      SELECT * FROM benchmark_things
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) DESC
      LIMIT ${limit}
    `

    return result.map((row) => ({
      id: row.id,
      ns: row.ns,
      type: row.type,
      content: row.content,
      data: row.data,
      meta: row.meta,
      embeddings: row.embeddings ? JSON.parse(`[${row.embeddings}]`) : undefined,
      ts: new Date(row.ts),
      ulid: row.ulid,
    }))
  }

  async vectorSearch(embedding: number[], limit: number): Promise<Thing[]> {
    if (!this.sql) throw new Error('Not connected')

    const embeddingStr = `[${embedding.join(',')}]`

    const result = await this.sql`
      SELECT * FROM benchmark_things
      ORDER BY embeddings <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `

    return result.map((row) => ({
      id: row.id,
      ns: row.ns,
      type: row.type,
      content: row.content,
      data: row.data,
      meta: row.meta,
      embeddings: row.embeddings ? JSON.parse(`[${row.embeddings}]`) : undefined,
      ts: new Date(row.ts),
      ulid: row.ulid,
    }))
  }

  async hybridSearch(query: string, embedding: number[], limit: number): Promise<Thing[]> {
    if (!this.sql) throw new Error('Not connected')

    const embeddingStr = `[${embedding.join(',')}]`

    // Hybrid search: combine FTS and vector similarity with weights
    const result = await this.sql`
      WITH text_search AS (
        SELECT id, ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) as text_score
        FROM benchmark_things
        WHERE to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      ),
      vector_search AS (
        SELECT id, (1 - (embeddings <=> ${embeddingStr}::vector)) as vector_score
        FROM benchmark_things
      )
      SELECT t.*,
        COALESCE(ts.text_score, 0) * 0.3 + COALESCE(vs.vector_score, 0) * 0.7 as hybrid_score
      FROM benchmark_things t
      LEFT JOIN text_search ts ON t.id = ts.id
      LEFT JOIN vector_search vs ON t.id = vs.id
      ORDER BY hybrid_score DESC
      LIMIT ${limit}
    `

    return result.map((row) => ({
      id: row.id,
      ns: row.ns,
      type: row.type,
      content: row.content,
      data: row.data,
      meta: row.meta,
      embeddings: row.embeddings ? JSON.parse(`[${row.embeddings}]`) : undefined,
      ts: new Date(row.ts),
      ulid: row.ulid,
    }))
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.sql) throw new Error('Not connected')

    // Neon HTTP API doesn't support explicit transactions
    // Use implicit transaction (each query is auto-committed)
    return fn()
  }

  async estimateCost(operations: number): Promise<number> {
    // Neon pricing: ~$0.16/hr for compute + $0.000164/GB storage
    // Rough estimate: ~$0.50 per million operations (compute + I/O)
    const costPerMillionOps = 0.5
    return (operations / 1_000_000) * costPerMillionOps
  }
}
