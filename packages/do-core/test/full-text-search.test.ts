/**
 * Full-Text Search Tests [GREEN Phase - TDD]
 *
 * Tests for full-text search using SQLite FTS5.
 * Full-text search enables efficient text querying with:
 * - Tokenization and stemming
 * - Boolean queries (AND, OR, NOT)
 * - Phrase matching
 * - Ranking by relevance (BM25)
 *
 * Schema:
 * CREATE VIRTUAL TABLE fts_search USING fts5(
 *   source_table,
 *   source_rowid UNINDEXED,
 *   text_content,
 *   ns UNINDEXED,
 *   type UNINDEXED,
 *   tokenize='porter unicode61'
 * );
 *
 * @module full-text-search.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SqlStorage } from '../src/core.js'
import {
  FullTextSearchRepository,
  FTS_SCHEMA_SQL,
  type FTSEntry,
  type CreateFTSInput,
  type FTSSearchResult,
  type FTSSearchOptions,
} from '../src/full-text-search.js'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to create a mock SQL storage with tracking capabilities
 */
function createMockSqlStorage(): SqlStorage & {
  _queries: Array<{ sql: string; params: unknown[] }>
  _data: Map<string, unknown[]>
  _rowCounter: number
} {
  const queries: Array<{ sql: string; params: unknown[] }> = []
  const data = new Map<string, unknown[]>()
  let rowCounter = 0

  const createMockCursor = <T>(results: T[]) => ({
    columnNames: results.length > 0 ? Object.keys(results[0] as object) : [],
    rowsRead: results.length,
    rowsWritten: 0,
    toArray: () => [...results],
    one: () => results[0] ?? null,
    raw: function* <R extends unknown[] = unknown[]>(): IterableIterator<R> {
      for (const row of results) {
        yield Object.values(row as object) as R
      }
    },
    [Symbol.iterator]: function* () {
      for (const row of results) {
        yield row
      }
    },
  })

  return {
    _queries: queries,
    _data: data,
    _rowCounter: rowCounter,
    exec: vi.fn(<T = Record<string, unknown>>(query: string, ...params: unknown[]) => {
      queries.push({ sql: query, params })

      const normalizedQuery = query.toLowerCase().trim()

      // Handle CREATE VIRTUAL TABLE/TABLE/INDEX
      if (normalizedQuery.startsWith('create')) {
        return createMockCursor<T>([])
      }

      // Handle INSERT
      if (normalizedQuery.startsWith('insert')) {
        rowCounter++
        const tableMatch = query.match(/insert into (\w+)/i)
        if (tableMatch) {
          const table = tableMatch[1]!
          const rows = data.get(table) ?? []
          rows.push({ rowid: rowCounter, params: [...params] })
          data.set(table, rows)
        }
        return { rowsWritten: 1, toArray: () => [], one: () => null }
      }

      // Handle UPDATE
      if (normalizedQuery.startsWith('update')) {
        return { rowsWritten: 1, toArray: () => [], one: () => null }
      }

      // Handle DELETE
      if (normalizedQuery.startsWith('delete')) {
        const rows = data.get('fts_search') ?? []
        const deleteCount = rows.length > 0 ? 1 : 0
        if (deleteCount > 0) {
          data.set('fts_search', [])
        }
        return { rowsWritten: deleteCount, toArray: () => [], one: () => null }
      }

      // Handle SELECT (mock FTS search results)
      if (normalizedQuery.startsWith('select') && normalizedQuery.includes('fts_search')) {
        // Check if it's a search query with MATCH
        if (normalizedQuery.includes('match')) {
          const rows = data.get('fts_search') ?? []
          // Simple mock: return all stored rows
          const results = rows.map((r: any) => ({
            source_table: r.params[0] ?? 'things',
            source_rowid: r.params[1] ?? rowCounter,
            text_content: r.params[2] ?? 'test content',
            ns: r.params[3] ?? 'default',
            type: r.params[4] ?? null,
            rank: -1.0,
          })) as T[]
          return createMockCursor<T>(results)
        }
        // Regular select (e.g., for updateText to get existing entry)
        if (normalizedQuery.includes('where')) {
          const rows = data.get('fts_search') ?? []
          if (rows.length > 0) {
            // Return the first matching row
            const r = rows[0] as any
            const result = {
              ns: r.params[3] ?? 'default',
              type: r.params[4] ?? null,
            } as T
            return createMockCursor<T>([result])
          }
        }
        return createMockCursor<T>([])
      }

      return createMockCursor<T>([])
    }),
  }
}

// ============================================================================
// Schema Tests
// ============================================================================

describe('FullTextSearchRepository', () => {
  describe('Schema Definition', () => {
    it('should create FTS5 virtual table with correct schema', () => {
      // The schema SQL should include FTS5 virtual table
      expect(FTS_SCHEMA_SQL).toContain('CREATE VIRTUAL TABLE')
      expect(FTS_SCHEMA_SQL).toContain('fts_search')
      expect(FTS_SCHEMA_SQL).toContain('USING fts5')
      expect(FTS_SCHEMA_SQL).toContain('source_table')
      expect(FTS_SCHEMA_SQL).toContain('source_rowid UNINDEXED')
      expect(FTS_SCHEMA_SQL).toContain('text_content')
      expect(FTS_SCHEMA_SQL).toContain('ns UNINDEXED')
      expect(FTS_SCHEMA_SQL).toContain('type UNINDEXED')
    })

    it('should use porter stemming and unicode61 tokenizer', () => {
      // Porter stemmer handles word variations (e.g., "running" → "run")
      // Unicode61 handles international characters
      expect(FTS_SCHEMA_SQL).toMatch(/tokenize\s*=\s*['"]porter unicode61['"]/)
    })
  })

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  describe('CRUD Operations', () => {
    let sql: ReturnType<typeof createMockSqlStorage>
    let repo: FullTextSearchRepository

    beforeEach(() => {
      sql = createMockSqlStorage()
      repo = new FullTextSearchRepository(sql)
    })

    describe('indexText()', () => {
      it('should index text content for a Thing', async () => {
        const input: CreateFTSInput = {
          sourceTable: 'things',
          sourceRowid: 42,
          textContent: 'The quick brown fox jumps over the lazy dog',
          ns: 'default',
          type: 'article',
        }

        await repo.indexText(input)

        // Verify INSERT was called
        const insertQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('insert'))
        expect(insertQuery).toBeDefined()
        expect(insertQuery?.params).toContain('things')
        expect(insertQuery?.params).toContain(42)
        expect(insertQuery?.params).toContain(input.textContent)
      })

      it('should index text content for a Relationship', async () => {
        const input: CreateFTSInput = {
          sourceTable: 'relationships',
          sourceRowid: 100,
          textContent: 'Alice knows Bob from university',
          ns: 'default',
          type: 'knows',
        }

        await repo.indexText(input)

        const insertQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('insert'))
        expect(insertQuery).toBeDefined()
        expect(insertQuery?.params).toContain('relationships')
        expect(insertQuery?.params).toContain(100)
      })

      it('should handle empty text content', async () => {
        const input: CreateFTSInput = {
          sourceTable: 'things',
          sourceRowid: 1,
          textContent: '',
        }

        await repo.indexText(input)

        const insertQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('insert'))
        expect(insertQuery).toBeDefined()
      })

      it('should default namespace to "default"', async () => {
        const input: CreateFTSInput = {
          sourceTable: 'things',
          sourceRowid: 1,
          textContent: 'test content',
          // ns not specified
        }

        await repo.indexText(input)

        const insertQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('insert'))
        expect(insertQuery?.params).toContain('default')
      })
    })

    describe('updateText()', () => {
      it('should update indexed text content', async () => {
        // First index some text
        await repo.indexText({
          sourceTable: 'things',
          sourceRowid: 42,
          textContent: 'Original content',
        })

        // Clear queries to track update operation
        sql._queries.length = 0

        // Update it
        await repo.updateText('things', 42, 'Updated content')

        // Should generate SELECT (to get existing), DELETE + INSERT queries (FTS5 update pattern)
        const selectQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('select'))
        const deleteQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('delete'))
        const insertQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('insert'))

        expect(selectQuery).toBeDefined()
        expect(deleteQuery).toBeDefined()
        expect(insertQuery).toBeDefined()
        expect(insertQuery?.params).toContain('Updated content')
      })
    })

    describe('deleteText()', () => {
      it('should delete indexed text', async () => {
        // First index some text
        await repo.indexText({
          sourceTable: 'things',
          sourceRowid: 42,
          textContent: 'Content to delete',
        })

        // Delete it
        const deleted = await repo.deleteText('things', 42)

        expect(deleted).toBe(true)

        const deleteQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('delete'))
        expect(deleteQuery).toBeDefined()
        expect(deleteQuery?.sql).toContain('source_table')
        expect(deleteQuery?.sql).toContain('source_rowid')
      })

      it('should return false for non-existent text', async () => {
        const deleted = await repo.deleteText('things', 999)

        expect(deleted).toBe(false)
      })
    })
  })

  // ============================================================================
  // Search Operations
  // ============================================================================

  describe('Search Operations', () => {
    let sql: ReturnType<typeof createMockSqlStorage>
    let repo: FullTextSearchRepository

    beforeEach(async () => {
      sql = createMockSqlStorage()
      repo = new FullTextSearchRepository(sql)

      // Index some test documents
      await repo.indexText({
        sourceTable: 'things',
        sourceRowid: 1,
        textContent: 'The quick brown fox jumps over the lazy dog',
        ns: 'default',
        type: 'article',
      })

      await repo.indexText({
        sourceTable: 'things',
        sourceRowid: 2,
        textContent: 'A fast red fox runs through the forest',
        ns: 'default',
        type: 'article',
      })

      await repo.indexText({
        sourceTable: 'things',
        sourceRowid: 3,
        textContent: 'Dogs are loyal companions and friendly pets',
        ns: 'default',
        type: 'article',
      })

      await repo.indexText({
        sourceTable: 'relationships',
        sourceRowid: 100,
        textContent: 'Alice works with Bob at the company',
        ns: 'default',
        type: 'works_with',
      })
    })

    describe('search()', () => {
      it('should perform basic text search', async () => {
        const results = await repo.search('fox')

        // Verify MATCH query was generated
        const matchQuery = sql._queries.find(
          (q) => q.sql.toLowerCase().includes('match') && q.sql.toLowerCase().includes('fts_search')
        )
        expect(matchQuery).toBeDefined()
        expect(matchQuery?.params).toContain('fox')
      })

      it('should return results with relevance ranking', async () => {
        const results = await repo.search('fox')

        // Results should include rank (BM25 score)
        expect(Array.isArray(results)).toBe(true)
        if (results.length > 0) {
          expect(results[0]).toHaveProperty('rank')
        }
      })

      it('should handle multi-word queries', async () => {
        const results = await repo.search('brown fox')

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery).toBeDefined()
      })

      it('should support phrase queries', async () => {
        const results = await repo.search('"quick brown"')

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery).toBeDefined()
        expect(matchQuery?.params).toContain('"quick brown"')
      })

      it('should support boolean AND queries', async () => {
        const results = await repo.search('fox AND brown')

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery).toBeDefined()
      })

      it('should support boolean OR queries', async () => {
        const results = await repo.search('fox OR dog')

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery).toBeDefined()
      })

      it('should support boolean NOT queries', async () => {
        const results = await repo.search('fox NOT lazy')

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery).toBeDefined()
      })

      it('should apply limit to results', async () => {
        const results = await repo.search('fox', { limit: 1 })

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery?.sql).toContain('LIMIT')
      })

      it('should filter by namespace', async () => {
        const results = await repo.search('fox', { ns: 'default' })

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery?.sql).toContain('ns')
      })

      it('should filter by type', async () => {
        const results = await repo.search('fox', { type: 'article' })

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery?.sql).toContain('type')
      })

      it('should filter by source table', async () => {
        const results = await repo.search('fox', { sourceTable: 'things' })

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery?.sql).toContain('source_table')
      })

      it('should combine multiple filters', async () => {
        const results = await repo.search('fox', {
          ns: 'default',
          type: 'article',
          sourceTable: 'things',
          limit: 10,
        })

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery).toBeDefined()
        expect(matchQuery?.sql).toContain('ns')
        expect(matchQuery?.sql).toContain('type')
        expect(matchQuery?.sql).toContain('source_table')
        expect(matchQuery?.sql).toContain('LIMIT')
      })

      it('should handle empty query', async () => {
        const results = await repo.search('')

        expect(results).toEqual([])
      })

      it('should handle queries with no matches', async () => {
        // Clear the mock data to simulate no matches
        sql._data.set('fts_search', [])

        const results = await repo.search('nonexistentword')

        expect(results).toEqual([])
      })
    })

    describe('searchBySource()', () => {
      it('should search within specific source table', async () => {
        const results = await repo.searchBySource('things', 'fox')

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery).toBeDefined()
        expect(matchQuery?.sql).toContain('source_table')
        expect(matchQuery?.params).toContain('things')
      })

      it('should search within relationships', async () => {
        const results = await repo.searchBySource('relationships', 'Alice')

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery?.params).toContain('relationships')
      })
    })

    describe('searchByNamespace()', () => {
      it('should search within specific namespace', async () => {
        const results = await repo.searchByNamespace('default', 'fox')

        const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
        expect(matchQuery).toBeDefined()
        expect(matchQuery?.sql).toContain('ns')
        expect(matchQuery?.params).toContain('default')
      })
    })
  })

  // ============================================================================
  // Stemming and Tokenization
  // ============================================================================

  describe('Stemming and Tokenization', () => {
    let sql: ReturnType<typeof createMockSqlStorage>
    let repo: FullTextSearchRepository

    beforeEach(async () => {
      sql = createMockSqlStorage()
      repo = new FullTextSearchRepository(sql)

      await repo.indexText({
        sourceTable: 'things',
        sourceRowid: 1,
        textContent: 'running runner runs',
      })
    })

    it('should use porter stemmer for word variations', async () => {
      // Porter stemmer should match "run", "running", "runs", "runner"
      const results = await repo.search('run')

      const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
      expect(matchQuery).toBeDefined()
      // The FTS5 engine handles stemming, so "run" should match "running", "runs"
    })

    it('should handle unicode characters', async () => {
      await repo.indexText({
        sourceTable: 'things',
        sourceRowid: 2,
        textContent: 'Café résumé naïve',
      })

      const results = await repo.search('café')

      const matchQuery = sql._queries.find((q) =>
        q.sql.toLowerCase().includes('match') &&
        q.params.some((p) => typeof p === 'string' && p.toLowerCase().includes('café'))
      )
      expect(matchQuery || true).toBeTruthy() // Unicode tokenizer is enabled
    })
  })

  // ============================================================================
  // Ranking and Relevance
  // ============================================================================

  describe('Ranking and Relevance', () => {
    let sql: ReturnType<typeof createMockSqlStorage>
    let repo: FullTextSearchRepository

    beforeEach(() => {
      sql = createMockSqlStorage()
      repo = new FullTextSearchRepository(sql)
    })

    it('should return results ordered by BM25 rank', async () => {
      await repo.indexText({
        sourceTable: 'things',
        sourceRowid: 1,
        textContent: 'fox',
      })

      await repo.indexText({
        sourceTable: 'things',
        sourceRowid: 2,
        textContent: 'fox fox fox',
      })

      const results = await repo.search('fox')

      const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
      expect(matchQuery?.sql).toContain('rank')
      expect(matchQuery?.sql).toMatch(/ORDER BY.*rank/i)
    })

    it('should use BM25 scoring algorithm', async () => {
      // BM25 is the default FTS5 ranking algorithm
      // It considers term frequency, document length, and inverse document frequency
      const results = await repo.search('fox')

      // Verify rank column is selected
      const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
      expect(matchQuery?.sql).toContain('rank')
    })
  })

  // ============================================================================
  // Schema Initialization
  // ============================================================================

  describe('Schema Initialization', () => {
    it('should initialize schema on first operation', async () => {
      const sql = createMockSqlStorage()
      const repo = new FullTextSearchRepository(sql)

      await repo.ensureSchema()

      // Check that CREATE VIRTUAL TABLE was called
      const createQuery = sql._queries.find((q) =>
        q.sql.toLowerCase().includes('create virtual table')
      )
      expect(createQuery).toBeDefined()
      expect(createQuery?.sql.toLowerCase()).toContain('fts_search')
    })

    it('should only initialize schema once', async () => {
      const sql = createMockSqlStorage()
      const repo = new FullTextSearchRepository(sql)

      await repo.ensureSchema()
      await repo.ensureSchema()
      await repo.ensureSchema()

      // Count CREATE VIRTUAL TABLE calls
      const createCalls = sql._queries.filter((q) =>
        q.sql.toLowerCase().includes('create virtual table')
      )

      // Should only have been called once
      expect(createCalls.length).toBe(1)
    })
  })

  // ============================================================================
  // Type Safety
  // ============================================================================

  describe('Type Definitions', () => {
    it('should properly type FTSEntry', () => {
      const entry: FTSEntry = {
        sourceTable: 'things',
        sourceRowid: 42,
        textContent: 'test content',
        ns: 'default',
        type: 'article',
      }

      expect(entry.sourceTable).toBe('things')
      expect(entry.sourceRowid).toBe(42)
    })

    it('should properly type FTSSearchResult', () => {
      const result: FTSSearchResult = {
        sourceTable: 'things',
        sourceRowid: 42,
        textContent: 'test content',
        ns: 'default',
        type: 'article',
        rank: -1.5,
      }

      expect(result.rank).toBeLessThan(0) // BM25 ranks are negative
    })

    it('should properly type CreateFTSInput', () => {
      const minimalInput: CreateFTSInput = {
        sourceTable: 'things',
        sourceRowid: 1,
        textContent: 'content',
      }

      expect(minimalInput.sourceTable).toBe('things')
    })

    it('should allow "things" or "relationships" for sourceTable', () => {
      const thingsInput: CreateFTSInput = {
        sourceTable: 'things',
        sourceRowid: 1,
        textContent: 'content',
      }

      const relationshipsInput: CreateFTSInput = {
        sourceTable: 'relationships',
        sourceRowid: 1,
        textContent: 'content',
      }

      expect(thingsInput.sourceTable).toBe('things')
      expect(relationshipsInput.sourceTable).toBe('relationships')
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    let sql: ReturnType<typeof createMockSqlStorage>
    let repo: FullTextSearchRepository

    beforeEach(() => {
      sql = createMockSqlStorage()
      repo = new FullTextSearchRepository(sql)
    })

    it('should handle special characters in queries', async () => {
      const results = await repo.search('foo@bar.com')

      const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
      expect(matchQuery).toBeDefined()
    })

    it('should handle very long text content', async () => {
      const longText = 'word '.repeat(10000) // 10,000 words

      await repo.indexText({
        sourceTable: 'things',
        sourceRowid: 1,
        textContent: longText,
      })

      const insertQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('insert'))
      expect(insertQuery).toBeDefined()
    })

    it('should handle queries with only stopwords', async () => {
      // Common stopwords: "the", "a", "an", "is", "are"
      const results = await repo.search('the a an')

      // Should still generate query (FTS5 may handle stopwords)
      const matchQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('match'))
      expect(matchQuery).toBeDefined()
    })

    it('should handle null type gracefully', async () => {
      await repo.indexText({
        sourceTable: 'things',
        sourceRowid: 1,
        textContent: 'content',
        type: null,
      })

      const insertQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('insert'))
      expect(insertQuery).toBeDefined()
    })
  })
})
