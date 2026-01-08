/**
 * Full-Text Search Repository - FTS5-based text search
 *
 * Provides full-text search capabilities using SQLite FTS5 with:
 * - Porter stemming for matching word variations
 * - Unicode61 tokenization for international text
 * - BM25 ranking algorithm for relevance scoring
 * - Boolean queries (AND, OR, NOT)
 * - Phrase matching
 *
 * @module full-text-search
 */

import type { SqlStorage } from './core'

// ============================================================================
// Schema Definition
// ============================================================================

/**
 * SQL statements for FTS5 virtual table initialization
 */
export const FTS_SCHEMA_SQL = `
-- Full-text search virtual table using FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS fts_search USING fts5(
  source_table,
  source_rowid UNINDEXED,
  text_content,
  ns UNINDEXED,
  type UNINDEXED,
  tokenize='porter unicode61'
);
`

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Source table type - must be 'things' or 'relationships'
 */
export type SourceTable = 'things' | 'relationships'

/**
 * FTS entry representing indexed text
 */
export interface FTSEntry {
  /** Source table: 'things' or 'relationships' */
  sourceTable: SourceTable
  /** Rowid of the source record */
  sourceRowid: number
  /** Text content to index */
  textContent: string
  /** Namespace for isolation */
  ns: string
  /** Type of the source entity */
  type: string | null
}

/**
 * Input for creating a new FTS entry
 */
export interface CreateFTSInput {
  /** Source table: 'things' or 'relationships' */
  sourceTable: SourceTable
  /** Rowid of the source record */
  sourceRowid: number
  /** Text content to index */
  textContent: string
  /** Namespace for isolation (defaults to 'default') */
  ns?: string
  /** Type of the source entity */
  type?: string | null
}

/**
 * Search result from full-text search
 */
export interface FTSSearchResult extends FTSEntry {
  /** BM25 relevance rank (negative values, higher is better) */
  rank: number
}

/**
 * Options for full-text search
 */
export interface FTSSearchOptions {
  /** Filter by source table */
  sourceTable?: SourceTable
  /** Filter by namespace */
  ns?: string
  /** Filter by type */
  type?: string
  /** Maximum results to return */
  limit?: number
}

// ============================================================================
// Full-Text Search Repository
// ============================================================================

/**
 * Repository for managing full-text search using SQLite FTS5.
 *
 * Full-text search enables efficient text querying with:
 * - Automatic tokenization and stemming (Porter algorithm)
 * - Unicode support for international text
 * - Relevance ranking using BM25 algorithm
 * - Boolean query operators (AND, OR, NOT)
 * - Phrase matching with quotes
 *
 * @example
 * ```typescript
 * const repo = new FullTextSearchRepository(sql)
 * await repo.ensureSchema()
 *
 * // Index text
 * await repo.indexText({
 *   sourceTable: 'things',
 *   sourceRowid: 42,
 *   textContent: 'The quick brown fox jumps over the lazy dog',
 *   ns: 'default',
 *   type: 'article'
 * })
 *
 * // Search
 * const results = await repo.search('fox')
 * const booleanResults = await repo.search('fox AND brown')
 * const phraseResults = await repo.search('"quick brown"')
 * ```
 */
export class FullTextSearchRepository {
  private schemaInitialized = false

  constructor(private readonly sql: SqlStorage) {}

  /**
   * Ensure the FTS5 schema is initialized
   */
  async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return

    const statements = FTS_SCHEMA_SQL.split(';').filter((s) => s.trim())
    for (const statement of statements) {
      if (statement.trim()) {
        this.sql.exec(statement)
      }
    }

    this.schemaInitialized = true
  }

  /**
   * Index text content for full-text search.
   *
   * @param input - Text content and metadata to index
   */
  async indexText(input: CreateFTSInput): Promise<void> {
    await this.ensureSchema()

    const ns = input.ns ?? 'default'
    const type = input.type !== undefined ? input.type : null

    this.sql.exec(
      `INSERT INTO fts_search (source_table, source_rowid, text_content, ns, type)
       VALUES (?, ?, ?, ?, ?)`,
      input.sourceTable,
      input.sourceRowid,
      input.textContent,
      ns,
      type
    )
  }

  /**
   * Update indexed text content.
   *
   * FTS5 doesn't support UPDATE directly, so we delete and re-insert.
   *
   * @param sourceTable - Source table
   * @param sourceRowid - Source rowid
   * @param newTextContent - New text content
   */
  async updateText(
    sourceTable: SourceTable,
    sourceRowid: number,
    newTextContent: string
  ): Promise<void> {
    await this.ensureSchema()

    // Get existing entry to preserve ns and type
    const existing = this.sql
      .exec<{ ns: string; type: string | null }>(
        `SELECT ns, type FROM fts_search WHERE source_table = ? AND source_rowid = ?`,
        sourceTable,
        sourceRowid
      )
      .one()

    // Delete existing entry
    this.sql.exec(
      `DELETE FROM fts_search WHERE source_table = ? AND source_rowid = ?`,
      sourceTable,
      sourceRowid
    )

    // Re-insert with new content
    if (existing) {
      this.sql.exec(
        `INSERT INTO fts_search (source_table, source_rowid, text_content, ns, type)
         VALUES (?, ?, ?, ?, ?)`,
        sourceTable,
        sourceRowid,
        newTextContent,
        existing.ns,
        existing.type
      )
    }
  }

  /**
   * Delete indexed text content.
   *
   * @param sourceTable - Source table
   * @param sourceRowid - Source rowid
   * @returns True if deleted, false if not found
   */
  async deleteText(sourceTable: SourceTable, sourceRowid: number): Promise<boolean> {
    await this.ensureSchema()

    const result = this.sql.exec(
      `DELETE FROM fts_search WHERE source_table = ? AND source_rowid = ?`,
      sourceTable,
      sourceRowid
    )

    return result.rowsWritten > 0
  }

  /**
   * Search indexed text using FTS5 MATCH queries.
   *
   * Supports:
   * - Simple queries: "fox"
   * - Multi-word: "brown fox"
   * - Phrase matching: '"quick brown"'
   * - Boolean AND: "fox AND brown"
   * - Boolean OR: "fox OR dog"
   * - Boolean NOT: "fox NOT lazy"
   *
   * Results are ranked by BM25 relevance (higher rank = more relevant).
   *
   * @param query - FTS5 query string
   * @param options - Search options (filters, limit)
   * @returns Array of search results ordered by relevance (descending)
   */
  async search(query: string, options?: FTSSearchOptions): Promise<FTSSearchResult[]> {
    await this.ensureSchema()

    // Return empty results for empty query
    if (!query || query.trim() === '') {
      return []
    }

    // Build WHERE clause with filters
    const conditions: string[] = []
    const params: unknown[] = []

    // FTS5 MATCH is required
    conditions.push('fts_search MATCH ?')
    params.push(query)

    // Optional filters
    if (options?.sourceTable) {
      conditions.push('source_table = ?')
      params.push(options.sourceTable)
    }

    if (options?.ns) {
      conditions.push('ns = ?')
      params.push(options.ns)
    }

    if (options?.type) {
      conditions.push('type = ?')
      params.push(options.type)
    }

    // Build SQL query
    let sql = `
      SELECT
        source_table,
        source_rowid,
        text_content,
        ns,
        type,
        rank
      FROM fts_search
      WHERE ${conditions.join(' AND ')}
      ORDER BY rank
    `

    // Apply limit
    if (options?.limit) {
      sql += ` LIMIT ?`
      params.push(options.limit)
    }

    // Execute query
    const results = this.sql.exec<{
      source_table: string
      source_rowid: number
      text_content: string
      ns: string
      type: string | null
      rank: number
    }>(sql, ...params).toArray()

    // Convert to FTSSearchResult
    return results.map((row) => ({
      sourceTable: row.source_table as SourceTable,
      sourceRowid: row.source_rowid,
      textContent: row.text_content,
      ns: row.ns,
      type: row.type,
      rank: row.rank,
    }))
  }

  /**
   * Search within a specific source table.
   *
   * @param sourceTable - Source table to search
   * @param query - FTS5 query string
   * @param options - Additional search options
   * @returns Array of search results
   */
  async searchBySource(
    sourceTable: SourceTable,
    query: string,
    options?: Omit<FTSSearchOptions, 'sourceTable'>
  ): Promise<FTSSearchResult[]> {
    return this.search(query, {
      ...options,
      sourceTable,
    })
  }

  /**
   * Search within a specific namespace.
   *
   * @param ns - Namespace to search
   * @param query - FTS5 query string
   * @param options - Additional search options
   * @returns Array of search results
   */
  async searchByNamespace(
    ns: string,
    query: string,
    options?: Omit<FTSSearchOptions, 'ns'>
  ): Promise<FTSSearchResult[]> {
    return this.search(query, {
      ...options,
      ns,
    })
  }
}
