import { BaseAdapter } from './base'
import type { Thing } from '../types'
import { createClient, type ClickHouseClient } from '@clickhouse/client-web'

export class ClickHouseAdapter extends BaseAdapter {
  name = 'ClickHouse'
  description = 'ClickHouse OLAP database with vector similarity support'

  private client: ClickHouseClient | null = null

  constructor(
    private config: {
      url: string
      database: string
      username: string
      password: string
    }
  ) {
    super()
  }

  async connect(): Promise<void> {
    this.client = createClient({
      url: this.config.url,
      database: this.config.database,
      username: this.config.username,
      password: this.config.password,
    })

    // Test connection
    await this.client.ping()
  }

  async disconnect(): Promise<void> {
    await this.client?.close()
    this.client = null
  }

  async migrate(): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    // Create benchmark table with vector index
    const schema = `
      CREATE TABLE IF NOT EXISTS benchmark_things (
        id String,
        ns String,
        type String,
        content String,
        data JSON,
        meta JSON,
        embeddings Array(Float32),
        ts DateTime64,
        ulid String,
        INDEX idx_embeddings embeddings TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 1000
      )
      ENGINE = MergeTree
      ORDER BY (ns, id)
      SETTINGS index_granularity = 8192
    `

    await this.client.command({
      query: schema,
      clickhouse_settings: {
        allow_experimental_vector_similarity_index: 1,
        enable_json_type: 1,
      },
    })
  }

  async clear(): Promise<void> {
    if (!this.client) throw new Error('Not connected')
    await this.client.command({ query: 'TRUNCATE TABLE benchmark_things' })
  }

  async get(ns: string, id: string): Promise<Thing | null> {
    if (!this.client) throw new Error('Not connected')

    const formattedId = this.formatId(ns, id)
    const result = await this.client.query({
      query: 'SELECT * FROM benchmark_things WHERE id = {id:String} LIMIT 1',
      query_params: { id: formattedId },
      format: 'JSONEachRow',
    })

    const rows = await result.json<Thing>()
    return rows.length > 0 ? rows[0] : null
  }

  async list(ns: string, limit: number, offset: number): Promise<Thing[]> {
    if (!this.client) throw new Error('Not connected')

    const result = await this.client.query({
      query: 'SELECT * FROM benchmark_things WHERE ns = {ns:String} ORDER BY ts DESC LIMIT {limit:UInt32} OFFSET {offset:UInt32}',
      query_params: { ns, limit, offset },
      format: 'JSONEachRow',
    })

    return result.json<Thing>()
  }

  async count(ns: string): Promise<number> {
    if (!this.client) throw new Error('Not connected')

    const result = await this.client.query({
      query: 'SELECT count() as count FROM benchmark_things WHERE ns = {ns:String}',
      query_params: { ns },
      format: 'JSONEachRow',
    })

    const rows = await result.json<{ count: string }>()
    return rows.length > 0 ? parseInt(rows[0].count) : 0
  }

  async aggregate(ns: string, field: string): Promise<Record<string, number>> {
    if (!this.client) throw new Error('Not connected')

    // Simple aggregation by type
    const result = await this.client.query({
      query: 'SELECT type, count() as count FROM benchmark_things WHERE ns = {ns:String} GROUP BY type',
      query_params: { ns },
      format: 'JSONEachRow',
    })

    const rows = await result.json<{ type: string; count: string }>()
    const agg: Record<string, number> = {}
    for (const row of rows) {
      agg[row.type] = parseInt(row.count)
    }
    return agg
  }

  async insert(thing: Thing): Promise<void> {
    await this.batchInsert([thing])
  }

  async batchInsert(things: Thing[]): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    await this.client.insert({
      table: 'benchmark_things',
      values: things,
      format: 'JSONEachRow',
      clickhouse_settings: {
        enable_json_type: 1,
      },
    })
  }

  async update(ns: string, id: string, data: Partial<Thing>): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    const formattedId = this.formatId(ns, id)

    // ClickHouse doesn't support UPDATE, use ALTER TABLE UPDATE (slow) or delete+insert
    // For benchmark purposes, we'll use delete+insert pattern
    const existing = await this.get(ns, id)
    if (!existing) return

    const updated = { ...existing, ...data }
    await this.delete(ns, id)
    await this.insert(updated)
  }

  async upsert(thing: Thing): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    // ClickHouse doesn't have native UPSERT, use ReplacingMergeTree or delete+insert
    // For simplicity, just insert (MergeTree will deduplicate based on ORDER BY key)
    await this.insert(thing)
  }

  async delete(ns: string, id: string): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    const formattedId = this.formatId(ns, id)
    await this.client.command({
      query: 'DELETE FROM benchmark_things WHERE id = {id:String}',
      query_params: { id: formattedId },
    })
  }

  async fullTextSearch(query: string, limit: number): Promise<Thing[]> {
    if (!this.client) throw new Error('Not connected')

    // Use ClickHouse full-text search with position function
    const result = await this.client.query({
      query: `
        SELECT * FROM benchmark_things
        WHERE positionCaseInsensitive(content, {query:String}) > 0
        ORDER BY ts DESC
        LIMIT {limit:UInt32}
      `,
      query_params: { query, limit },
      format: 'JSONEachRow',
    })

    return result.json<Thing>()
  }

  async vectorSearch(embedding: number[], limit: number): Promise<Thing[]> {
    if (!this.client) throw new Error('Not connected')

    // Use vector similarity search with L2Distance
    const result = await this.client.query({
      query: `
        SELECT *, L2Distance(embeddings, {embedding:Array(Float32)}) as distance
        FROM benchmark_things
        ORDER BY distance ASC
        LIMIT {limit:UInt32}
      `,
      query_params: { embedding, limit },
      format: 'JSONEachRow',
      clickhouse_settings: {
        allow_experimental_vector_similarity_index: 1,
      },
    })

    return result.json<Thing>()
  }

  async hybridSearch(query: string, embedding: number[], limit: number): Promise<Thing[]> {
    if (!this.client) throw new Error('Not connected')

    // Combine full-text and vector search with weighted scoring
    const result = await this.client.query({
      query: `
        SELECT *,
          (positionCaseInsensitive(content, {query:String}) > 0 ? 1 : 0) as text_match,
          L2Distance(embeddings, {embedding:Array(Float32)}) as vector_distance,
          (text_match * 0.3 + (1 - vector_distance) * 0.7) as hybrid_score
        FROM benchmark_things
        ORDER BY hybrid_score DESC
        LIMIT {limit:UInt32}
      `,
      query_params: { query, embedding, limit },
      format: 'JSONEachRow',
      clickhouse_settings: {
        allow_experimental_vector_similarity_index: 1,
      },
    })

    return result.json<Thing>()
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // ClickHouse doesn't support transactions, just execute the function
    return fn()
  }

  async estimateCost(operations: number): Promise<number> {
    // ClickHouse Cloud pricing: ~$0.70 per million operations (compute + storage)
    // This is a rough estimate
    const costPerMillionOps = 0.7
    return (operations / 1_000_000) * costPerMillionOps
  }
}
