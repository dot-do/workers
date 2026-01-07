/**
 * SearchRepository Tests [RED Phase - TDD]
 *
 * Tests for the SearchRepository that stores embeddings linked to Things/Relationships.
 * These tests define the expected behavior before implementation.
 *
 * Schema:
 * CREATE TABLE search (
 *   rowid INTEGER PRIMARY KEY AUTOINCREMENT,
 *   source_table TEXT NOT NULL CHECK(source_table IN ('things', 'relationships')),
 *   source_rowid INTEGER NOT NULL,
 *   embedding_256 BLOB NOT NULL,
 *   embedding_full BLOB,
 *   embedding_model TEXT NOT NULL DEFAULT 'embeddinggemma-300m',
 *   ns TEXT NOT NULL DEFAULT 'default',
 *   type TEXT,
 *   text_content TEXT,
 *   created_at INTEGER NOT NULL,
 *   updated_at INTEGER NOT NULL,
 *   UNIQUE(source_table, source_rowid)
 * );
 * CREATE INDEX idx_search_ns_type ON search(ns, type);
 *
 * @module search-repository.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SqlStorage } from '../src/core.js'
import { SearchRepository, SEARCH_SCHEMA_SQL, type SearchEntry, type CreateSearchInput } from '../src/search-repository.js'

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

      // Handle CREATE TABLE/INDEX (schema initialization)
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
        return { rowsWritten: 1, toArray: () => [], one: () => null }
      }

      // Handle SELECT
      if (normalizedQuery.startsWith('select')) {
        return createMockCursor<T>([])
      }

      return createMockCursor<T>([])
    }),
  }
}

/**
 * Create a mock 256-dimensional embedding (hot storage)
 */
function createMockEmbedding256(): Float32Array {
  const embedding = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    embedding[i] = Math.random() * 2 - 1 // Values between -1 and 1
  }
  return embedding
}

/**
 * Create a mock 768-dimensional embedding (full/cold storage)
 */
function createMockEmbeddingFull(): Float32Array {
  const embedding = new Float32Array(768)
  for (let i = 0; i < 768; i++) {
    embedding[i] = Math.random() * 2 - 1
  }
  return embedding
}

/**
 * Convert Float32Array to ArrayBuffer for storage
 */
function embeddingToBuffer(embedding: Float32Array): ArrayBuffer {
  return embedding.buffer.slice(embedding.byteOffset, embedding.byteOffset + embedding.byteLength)
}

// ============================================================================
// Schema Tests
// ============================================================================

describe('SearchRepository', () => {
  describe('Schema Definition', () => {
    it('should create search table with correct schema', () => {
      // The schema SQL should include all required columns
      expect(SEARCH_SCHEMA_SQL).toContain('CREATE TABLE')
      expect(SEARCH_SCHEMA_SQL).toContain('search')
      expect(SEARCH_SCHEMA_SQL).toContain('rowid INTEGER PRIMARY KEY AUTOINCREMENT')
      expect(SEARCH_SCHEMA_SQL).toContain('source_table TEXT NOT NULL')
      expect(SEARCH_SCHEMA_SQL).toContain("CHECK(source_table IN ('things', 'relationships'))")
      expect(SEARCH_SCHEMA_SQL).toContain('source_rowid INTEGER NOT NULL')
      expect(SEARCH_SCHEMA_SQL).toContain('embedding_256 BLOB NOT NULL')
      expect(SEARCH_SCHEMA_SQL).toContain('embedding_full BLOB')
      expect(SEARCH_SCHEMA_SQL).toContain('embedding_model TEXT NOT NULL')
      expect(SEARCH_SCHEMA_SQL).toContain('ns TEXT NOT NULL')
      expect(SEARCH_SCHEMA_SQL).toContain('type TEXT')
      expect(SEARCH_SCHEMA_SQL).toContain('text_content TEXT')
      expect(SEARCH_SCHEMA_SQL).toContain('created_at INTEGER NOT NULL')
      expect(SEARCH_SCHEMA_SQL).toContain('updated_at INTEGER NOT NULL')
      expect(SEARCH_SCHEMA_SQL).toContain('UNIQUE(source_table, source_rowid)')
    })

    it('should create indexes for namespace and type filtering', () => {
      expect(SEARCH_SCHEMA_SQL).toContain('CREATE INDEX')
      expect(SEARCH_SCHEMA_SQL).toContain('idx_search_ns_type')
      expect(SEARCH_SCHEMA_SQL).toContain('ON search(ns, type)')
    })
  })

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  describe('CRUD Operations', () => {
    let sql: ReturnType<typeof createMockSqlStorage>
    let repo: SearchRepository

    beforeEach(() => {
      sql = createMockSqlStorage()
      repo = new SearchRepository(sql)
    })

    describe('indexThing()', () => {
      it('should index a Thing with embedding', async () => {
        const embedding256 = createMockEmbedding256()
        const embeddingFull = createMockEmbeddingFull()

        const input: CreateSearchInput = {
          sourceTable: 'things',
          sourceRowid: 42,
          embedding256: embeddingToBuffer(embedding256),
          embeddingFull: embeddingToBuffer(embeddingFull),
          embeddingModel: 'embeddinggemma-300m',
          ns: 'default',
          type: 'user',
          textContent: 'John Doe is a software engineer',
        }

        const entry = await repo.create(input)

        expect(entry).toBeDefined()
        expect(entry.sourceTable).toBe('things')
        expect(entry.sourceRowid).toBe(42)
        expect(entry.ns).toBe('default')
        expect(entry.type).toBe('user')
        expect(entry.embeddingModel).toBe('embeddinggemma-300m')
        expect(entry.createdAt).toBeGreaterThan(0)
        expect(entry.updatedAt).toBeGreaterThan(0)
      })

      it('should store both 256-dim (hot) and 768-dim (cold) embeddings', async () => {
        const embedding256 = createMockEmbedding256()
        const embeddingFull = createMockEmbeddingFull()

        const input: CreateSearchInput = {
          sourceTable: 'things',
          sourceRowid: 1,
          embedding256: embeddingToBuffer(embedding256),
          embeddingFull: embeddingToBuffer(embeddingFull),
        }

        await repo.create(input)

        // Verify INSERT was called with both embeddings
        const insertQuery = sql._queries.find(q => q.sql.toLowerCase().includes('insert'))
        expect(insertQuery).toBeDefined()
        expect(insertQuery?.params).toContain(input.embedding256)
        expect(insertQuery?.params).toContain(input.embeddingFull)
      })

      it('should allow null embedding_full for migrated entries', async () => {
        const embedding256 = createMockEmbedding256()

        const input: CreateSearchInput = {
          sourceTable: 'things',
          sourceRowid: 1,
          embedding256: embeddingToBuffer(embedding256),
          embeddingFull: null, // Migrated to R2
        }

        const entry = await repo.create(input)

        expect(entry).toBeDefined()
        expect(entry.embeddingFull).toBeNull()
      })
    })

    describe('indexRelationship()', () => {
      it('should index a Relationship with embedding', async () => {
        const embedding256 = createMockEmbedding256()

        const input: CreateSearchInput = {
          sourceTable: 'relationships',
          sourceRowid: 100,
          embedding256: embeddingToBuffer(embedding256),
          embeddingFull: null,
          ns: 'default',
          type: 'knows',
          textContent: 'Alice knows Bob',
        }

        const entry = await repo.create(input)

        expect(entry).toBeDefined()
        expect(entry.sourceTable).toBe('relationships')
        expect(entry.sourceRowid).toBe(100)
        expect(entry.type).toBe('knows')
      })
    })

    describe('getBySource()', () => {
      it('should retrieve embedding by source', async () => {
        // First create an entry
        const embedding256 = createMockEmbedding256()
        await repo.create({
          sourceTable: 'things',
          sourceRowid: 42,
          embedding256: embeddingToBuffer(embedding256),
        })

        // Then retrieve it
        const entry = await repo.getBySource('things', 42)

        // Should generate correct SELECT query
        const selectQuery = sql._queries.find(q =>
          q.sql.toLowerCase().includes('select') &&
          q.sql.toLowerCase().includes('source_table') &&
          q.sql.toLowerCase().includes('source_rowid')
        )
        expect(selectQuery).toBeDefined()
      })

      it('should return null for non-existent source', async () => {
        const entry = await repo.getBySource('things', 999)

        expect(entry).toBeNull()
      })
    })

    describe('updateBySource()', () => {
      it('should update embedding when source is updated', async () => {
        const oldEmbedding = createMockEmbedding256()
        const newEmbedding = createMockEmbedding256()

        // Create initial entry
        await repo.create({
          sourceTable: 'things',
          sourceRowid: 42,
          embedding256: embeddingToBuffer(oldEmbedding),
        })

        // Update the embedding
        const updated = await repo.updateBySource('things', 42, {
          embedding256: embeddingToBuffer(newEmbedding),
          textContent: 'Updated content',
        })

        expect(updated).toBeDefined()
        expect(updated?.updatedAt).toBeGreaterThan(0)

        // Verify UPDATE query was generated
        const updateQuery = sql._queries.find(q => q.sql.toLowerCase().includes('update'))
        expect(updateQuery).toBeDefined()
      })
    })

    describe('deleteBySource()', () => {
      it('should delete embedding when source is deleted', async () => {
        const embedding = createMockEmbedding256()

        // Create entry
        await repo.create({
          sourceTable: 'things',
          sourceRowid: 42,
          embedding256: embeddingToBuffer(embedding),
        })

        // Delete it
        const deleted = await repo.deleteBySource('things', 42)

        expect(deleted).toBe(true)

        // Verify DELETE query was generated
        const deleteQuery = sql._queries.find(q => q.sql.toLowerCase().includes('delete'))
        expect(deleteQuery).toBeDefined()
        expect(deleteQuery?.sql.toLowerCase()).toContain('source_table')
        expect(deleteQuery?.sql.toLowerCase()).toContain('source_rowid')
      })

      it('should return false for non-existent source', async () => {
        const deleted = await repo.deleteBySource('things', 999)

        // Mock returns 1 rowsWritten, but real impl would return false for non-existent
        // This test defines expected behavior - implementation should check rowsWritten
        expect(deleted).toBe(false)
      })
    })
  })

  // ============================================================================
  // Filtering
  // ============================================================================

  describe('Filtering', () => {
    let sql: ReturnType<typeof createMockSqlStorage>
    let repo: SearchRepository

    beforeEach(() => {
      sql = createMockSqlStorage()
      repo = new SearchRepository(sql)
    })

    describe('findByNamespace()', () => {
      it('should filter by namespace', async () => {
        const entries = await repo.findByNamespace('myapp')

        // Verify query includes namespace filter
        const selectQuery = sql._queries.find(q =>
          q.sql.toLowerCase().includes('select') &&
          q.sql.toLowerCase().includes('ns = ?')
        )
        expect(selectQuery).toBeDefined()
        expect(selectQuery?.params).toContain('myapp')
      })
    })

    describe('findByType()', () => {
      it('should filter by type', async () => {
        const entries = await repo.findByType('default', 'user')

        // Verify query includes type filter
        const selectQuery = sql._queries.find(q =>
          q.sql.toLowerCase().includes('select') &&
          q.sql.toLowerCase().includes('type = ?')
        )
        expect(selectQuery).toBeDefined()
        expect(selectQuery?.params).toContain('user')
      })
    })

    describe('find()', () => {
      it('should filter by namespace and type combined', async () => {
        const entries = await repo.find({ ns: 'myapp', type: 'product' })

        // Verify query includes both filters
        const selectQuery = sql._queries.find(q =>
          q.sql.toLowerCase().includes('select') &&
          q.sql.toLowerCase().includes('ns = ?') &&
          q.sql.toLowerCase().includes('type = ?')
        )
        expect(selectQuery).toBeDefined()
      })

      it('should support limit and offset', async () => {
        const entries = await repo.find({ ns: 'default', limit: 10, offset: 20 })

        const selectQuery = sql._queries.find(q =>
          q.sql.toLowerCase().includes('select') &&
          q.sql.toLowerCase().includes('limit') &&
          q.sql.toLowerCase().includes('offset')
        )
        expect(selectQuery).toBeDefined()
      })
    })
  })

  // ============================================================================
  // Constraints
  // ============================================================================

  describe('Constraints', () => {
    let sql: ReturnType<typeof createMockSqlStorage>
    let repo: SearchRepository

    beforeEach(() => {
      sql = createMockSqlStorage()
      repo = new SearchRepository(sql)
    })

    it('should enforce unique constraint on source_table + source_rowid', async () => {
      const embedding = createMockEmbedding256()

      // Create first entry
      await repo.create({
        sourceTable: 'things',
        sourceRowid: 42,
        embedding256: embeddingToBuffer(embedding),
      })

      // Attempting to create duplicate should throw or use upsert
      // The implementation should either:
      // 1. Throw a constraint violation error
      // 2. Implement upsert behavior (INSERT OR REPLACE)
      //
      // This test documents the expected UNIQUE constraint in schema
      expect(SEARCH_SCHEMA_SQL).toContain('UNIQUE(source_table, source_rowid)')
    })

    it('should validate source_table values', async () => {
      const embedding = createMockEmbedding256()

      // The CHECK constraint should only allow 'things' or 'relationships'
      expect(SEARCH_SCHEMA_SQL).toContain("CHECK(source_table IN ('things', 'relationships'))")
    })

    it('should require embedding_256 to be NOT NULL', async () => {
      expect(SEARCH_SCHEMA_SQL).toContain('embedding_256 BLOB NOT NULL')
    })

    it('should have default namespace of "default"', async () => {
      const embedding = createMockEmbedding256()

      const entry = await repo.create({
        sourceTable: 'things',
        sourceRowid: 1,
        embedding256: embeddingToBuffer(embedding),
        // ns not specified - should default to 'default'
      })

      expect(entry.ns).toBe('default')
    })

    it('should have default embedding_model of "embeddinggemma-300m"', async () => {
      const embedding = createMockEmbedding256()

      const entry = await repo.create({
        sourceTable: 'things',
        sourceRowid: 1,
        embedding256: embeddingToBuffer(embedding),
        // embeddingModel not specified - should default
      })

      expect(entry.embeddingModel).toBe('embeddinggemma-300m')
    })
  })

  // ============================================================================
  // Schema Initialization
  // ============================================================================

  describe('Schema Initialization', () => {
    it('should initialize schema on first operation', async () => {
      const sql = createMockSqlStorage()
      const repo = new SearchRepository(sql)

      await repo.ensureSchema()

      // Check that CREATE TABLE was called
      const createTableQuery = sql._queries.find(q =>
        q.sql.toLowerCase().includes('create table')
      )
      expect(createTableQuery).toBeDefined()
      expect(createTableQuery?.sql.toLowerCase()).toContain('search')
    })

    it('should only initialize schema once', async () => {
      const sql = createMockSqlStorage()
      const repo = new SearchRepository(sql)

      await repo.ensureSchema()
      await repo.ensureSchema()
      await repo.ensureSchema()

      // Count CREATE TABLE calls
      const createTableCalls = sql._queries.filter(q =>
        q.sql.toLowerCase().includes('create table')
      )

      // Should only have been called once
      expect(createTableCalls.length).toBe(1)
    })
  })

  // ============================================================================
  // Type Safety
  // ============================================================================

  describe('Type Definitions', () => {
    it('should properly type SearchEntry', () => {
      // This is a compile-time check - if types are wrong, TS will fail
      const entry: SearchEntry = {
        rowid: 1,
        sourceTable: 'things',
        sourceRowid: 42,
        embedding256: new ArrayBuffer(256 * 4), // 256 float32s
        embeddingFull: null,
        embeddingModel: 'embeddinggemma-300m',
        ns: 'default',
        type: 'user',
        textContent: 'test content',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(entry.sourceTable).toBe('things')
      expect(entry.embeddingFull).toBeNull()
    })

    it('should properly type CreateSearchInput', () => {
      // Verify CreateSearchInput allows minimal required fields
      const minimalInput: CreateSearchInput = {
        sourceTable: 'things',
        sourceRowid: 1,
        embedding256: new ArrayBuffer(256 * 4),
      }

      expect(minimalInput.sourceTable).toBe('things')
    })

    it('should allow "things" or "relationships" for sourceTable', () => {
      // TypeScript should enforce this - checking at runtime for completeness
      const thingsInput: CreateSearchInput = {
        sourceTable: 'things',
        sourceRowid: 1,
        embedding256: new ArrayBuffer(256 * 4),
      }

      const relationshipsInput: CreateSearchInput = {
        sourceTable: 'relationships',
        sourceRowid: 1,
        embedding256: new ArrayBuffer(256 * 4),
      }

      expect(thingsInput.sourceTable).toBe('things')
      expect(relationshipsInput.sourceTable).toBe('relationships')
    })
  })
})
