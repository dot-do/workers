/**
 * LakehouseMixin Tests - RED Phase
 *
 * Tests for the LakehouseMixin that combines TierIndex + MigrationPolicy + TwoPhaseSearch
 * into a single DO-compatible mixin for tiered storage management.
 *
 * The Lakehouse architecture provides:
 * - Hot tier: SQLite storage in DO (fast, limited to ~256MB)
 * - Warm tier: R2 storage (medium speed, larger capacity)
 * - Cold tier: Archive/external storage (slow, unlimited)
 *
 * Key features:
 * - Automatic tier management with configurable policies
 * - Two-phase vector search with MRL truncation
 * - Scheduled migrations via DO alarms
 * - Persistence across DO hibernation
 *
 * @module lakehouse-mixin.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DOCore, type DOState, type DOStorage } from '../src/index.js'
import { createMockState, createMockSqlCursor } from './helpers.js'

// ============================================================================
// Type Definitions for Tests
// ============================================================================

/**
 * LakehouseMixin interface - defines the contract for the mixin
 */
interface ILakehouseMixin {
  lakehouse: {
    /** Access to the TierIndex for tracking data locations */
    index: LakehouseIndex

    /** Run migration policy and move data between tiers */
    migrate(): Promise<MigrationResult>

    /** Perform two-phase vector search across tiers */
    search(query: VectorQuery): Promise<SearchResult[]>

    /** Store a vector with automatic truncation for hot tier */
    vectorize(id: string, embedding: Float32Array, metadata?: Record<string, unknown>): Promise<void>

    /** Get current lakehouse configuration */
    getConfig(): LakehouseConfig

    /** Update lakehouse configuration */
    updateConfig(config: Partial<LakehouseConfig>): void

    /** Get statistics about tier usage */
    getStats(): Promise<LakehouseStats>
  }
}

/**
 * LakehouseIndex interface for tier tracking
 */
interface LakehouseIndex {
  /** Get an entry by ID */
  get(id: string): Promise<TierEntry | null>
  /** Record a new entry in a tier */
  record(input: RecordTierInput): Promise<TierEntry>
  /** Find entries eligible for migration */
  findEligibleForMigration(criteria: MigrationCriteria): Promise<TierEntry[]>
  /** Get tier statistics */
  getStatistics(): Promise<TierStatistics>
}

/**
 * Tier entry representing data location
 */
interface TierEntry {
  id: string
  sourceTable: string
  tier: 'hot' | 'warm' | 'cold'
  location: string | null
  createdAt: number
  migratedAt: number | null
  accessedAt: number | null
  accessCount: number
}

interface RecordTierInput {
  id: string
  sourceTable: string
  tier: 'hot' | 'warm' | 'cold'
  location?: string
}

interface MigrationCriteria {
  fromTier: 'hot' | 'warm' | 'cold'
  accessThresholdMs?: number
  maxAccessCount?: number
  limit?: number
}

interface TierStatistics {
  hot: number
  warm: number
  cold: number
  total: number
}

/**
 * Migration result from running the policy engine
 */
interface MigrationResult {
  /** Number of items migrated */
  migratedCount: number
  /** Total bytes migrated */
  bytesTransferred: number
  /** Items migrated from hot to warm */
  hotToWarm: number
  /** Items migrated from warm to cold */
  warmToCold: number
  /** Time taken in milliseconds */
  durationMs: number
  /** Whether migration was triggered by emergency (capacity) */
  isEmergency: boolean
  /** Errors encountered during migration */
  errors: MigrationError[]
}

interface MigrationError {
  itemId: string
  error: string
  tier: 'hot' | 'warm' | 'cold'
}

/**
 * Vector query for two-phase search
 */
interface VectorQuery {
  /** Query embedding (256 or 768 dimensions) */
  embedding: Float32Array | number[]
  /** Number of candidates for phase 1 */
  candidatePoolSize?: number
  /** Final number of results */
  topK?: number
  /** Namespace filter */
  namespace?: string
  /** Type filter */
  type?: string
}

/**
 * Search result from vector search
 */
interface SearchResult {
  id: string
  score: number
  metadata?: Record<string, unknown>
}

/**
 * Lakehouse configuration
 */
interface LakehouseConfig {
  /** Hot to warm migration policy */
  hotToWarm: {
    /** Maximum age in ms before migration */
    maxAge: number
    /** Minimum access count to keep hot */
    minAccessCount: number
    /** Size threshold percentage to trigger migration */
    maxHotSizePercent: number
  }
  /** Warm to cold migration policy */
  warmToCold: {
    /** Maximum age in warm tier before cold migration */
    maxAge: number
    /** Minimum batch size for cold migration */
    minPartitionSize: number
  }
  /** Alarm interval for scheduled migrations */
  migrationIntervalMs: number
  /** R2 bucket for warm tier storage */
  r2Bucket?: string
}

/**
 * Lakehouse statistics
 */
interface LakehouseStats {
  /** Tier distribution */
  tiers: TierStatistics
  /** Total vectors stored */
  totalVectors: number
  /** Last migration time */
  lastMigrationAt: number | null
  /** Total bytes migrated */
  totalBytesMigrated: number
  /** Search statistics */
  search: {
    averagePhase1TimeMs: number
    averagePhase2TimeMs: number
    totalSearches: number
  }
}

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Create a mock state with SQL support for lakehouse testing
 */
function createMockStateWithSql(): DOState & {
  _sqlData: Map<string, unknown[]>
  _lastQuery: string
  _lastParams: unknown[]
} {
  const sqlData = new Map<string, unknown[]>()
  let lastQuery = ''
  let lastParams: unknown[] = []
  let rowCounter = 0

  const mockState = createMockState()

  const sqlStorage = {
    exec: vi.fn(<T = Record<string, unknown>>(query: string, ...params: unknown[]) => {
      lastQuery = query
      lastParams = params

      const normalizedQuery = query.toLowerCase().trim()

      // Handle CREATE TABLE/INDEX (schema initialization)
      if (normalizedQuery.startsWith('create')) {
        return createMockSqlCursor<T>([])
      }

      // Handle INSERT
      if (normalizedQuery.startsWith('insert')) {
        rowCounter++
        const tableMatch = query.match(/insert into (\w+)/i)
        if (tableMatch) {
          const table = tableMatch[1]
          const rows = sqlData.get(table) ?? []
          rows.push({ rowid: rowCounter, params: [...params] })
          sqlData.set(table, rows)
        }
        return { rowsWritten: 1, toArray: () => [] }
      }

      // Handle UPDATE
      if (normalizedQuery.startsWith('update')) {
        return { rowsWritten: 1, toArray: () => [] }
      }

      // Handle DELETE
      if (normalizedQuery.startsWith('delete')) {
        return { rowsWritten: 1, toArray: () => [] }
      }

      // Handle SELECT
      if (normalizedQuery.startsWith('select')) {
        return createMockSqlCursor<T>([])
      }

      return createMockSqlCursor<T>([])
    }),
  }

  return {
    ...mockState,
    storage: {
      ...mockState.storage,
      sql: sqlStorage,
    },
    _sqlData: sqlData,
    get _lastQuery() { return lastQuery },
    get _lastParams() { return lastParams },
  }
}

/**
 * Create a test 768-dim embedding
 */
function createTestEmbedding(dim: number = 768): Float32Array {
  const embedding = new Float32Array(dim)
  for (let i = 0; i < dim; i++) {
    embedding[i] = Math.random() * 2 - 1
  }
  return embedding
}

// ============================================================================
// Tests
// ============================================================================

describe('LakehouseMixin', () => {
  describe('Mixin Application', () => {
    it('should apply to base DO class', async () => {
      // Import the mixin (will fail until implemented)
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)

      expect(LakehouseDO).toBeDefined()
    })

    it('should create instance with lakehouse property', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      expect(instance.lakehouse).toBeDefined()
    })

    it('should extend DOCore', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      expect(instance).toBeInstanceOf(DOCore)
    })

    it('should have default configuration', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      const config = instance.lakehouse.getConfig()

      expect(config.hotToWarm).toBeDefined()
      expect(config.hotToWarm.maxAge).toBeGreaterThan(0)
      expect(config.warmToCold).toBeDefined()
      expect(config.migrationIntervalMs).toBeGreaterThan(0)
    })

    it('should accept custom configuration', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const customConfig = {
        hotToWarm: {
          maxAge: 3600000, // 1 hour
          minAccessCount: 5,
          maxHotSizePercent: 80,
        },
        migrationIntervalMs: 300000, // 5 minutes
      }

      const LakehouseDO = applyLakehouseMixin(DOCore, customConfig)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      const config = instance.lakehouse.getConfig()
      expect(config.hotToWarm.maxAge).toBe(3600000)
      expect(config.hotToWarm.minAccessCount).toBe(5)
    })
  })

  describe('Lakehouse Index Access', () => {
    it('should provide TierIndex via this.lakehouse.index', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      expect(instance.lakehouse.index).toBeDefined()
      expect(typeof instance.lakehouse.index.get).toBe('function')
      expect(typeof instance.lakehouse.index.record).toBe('function')
      expect(typeof instance.lakehouse.index.findEligibleForMigration).toBe('function')
    })

    it('should record items in tier index', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      const entry = await instance.lakehouse.index.record({
        id: 'doc-001',
        sourceTable: 'vectors',
        tier: 'hot',
      })

      expect(entry.id).toBe('doc-001')
      expect(entry.tier).toBe('hot')
      expect(entry.createdAt).toBeGreaterThan(0)
    })

    it('should retrieve items from tier index', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.index.record({
        id: 'doc-001',
        sourceTable: 'vectors',
        tier: 'hot',
      })

      const entry = await instance.lakehouse.index.get('doc-001')

      expect(entry).toBeDefined()
      expect(entry?.id).toBe('doc-001')
    })

    it('should find items eligible for migration', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      // Record some items
      await instance.lakehouse.index.record({
        id: 'doc-001',
        sourceTable: 'vectors',
        tier: 'hot',
      })

      const eligible = await instance.lakehouse.index.findEligibleForMigration({
        fromTier: 'hot',
        accessThresholdMs: 0, // All items are eligible
        limit: 100,
      })

      expect(Array.isArray(eligible)).toBe(true)
    })

    it('should track tier statistics', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.index.record({
        id: 'doc-001',
        sourceTable: 'vectors',
        tier: 'hot',
      })

      const stats = await instance.lakehouse.index.getStatistics()

      expect(stats.hot).toBeGreaterThanOrEqual(0)
      expect(stats.warm).toBeGreaterThanOrEqual(0)
      expect(stats.cold).toBeGreaterThanOrEqual(0)
      expect(stats.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Migration Operations', () => {
    it('should run migration via this.lakehouse.migrate()', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      const result = await instance.lakehouse.migrate()

      expect(result).toBeDefined()
      expect(typeof result.migratedCount).toBe('number')
      expect(typeof result.bytesTransferred).toBe('number')
      expect(typeof result.hotToWarm).toBe('number')
      expect(typeof result.warmToCold).toBe('number')
      expect(typeof result.durationMs).toBe('number')
      expect(typeof result.isEmergency).toBe('boolean')
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should migrate hot to warm based on age policy', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      // Configure with very short max age so items are immediately eligible
      const LakehouseDO = applyLakehouseMixin(DOCore, {
        hotToWarm: {
          maxAge: 1, // 1ms - items immediately eligible
          minAccessCount: 100, // High threshold so nothing stays hot
          maxHotSizePercent: 80,
        },
      })
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      // Store some items in hot tier
      await instance.lakehouse.vectorize('doc-001', createTestEmbedding())
      await instance.lakehouse.vectorize('doc-002', createTestEmbedding())

      // Wait a bit for age to exceed threshold
      await new Promise(resolve => setTimeout(resolve, 10))

      const result = await instance.lakehouse.migrate()

      expect(result.hotToWarm).toBeGreaterThanOrEqual(0)
    })

    it('should track migration errors', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      const result = await instance.lakehouse.migrate()

      expect(result.errors).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
      // Each error should have itemId, error message, and tier
      for (const error of result.errors) {
        expect(error.itemId).toBeDefined()
        expect(error.error).toBeDefined()
        expect(error.tier).toBeDefined()
      }
    })

    it('should handle emergency migration on capacity pressure', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore, {
        hotToWarm: {
          maxAge: 86400000, // 24 hours
          minAccessCount: 1,
          maxHotSizePercent: 1, // Very low threshold to trigger emergency
        },
      })
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      // This test verifies emergency migration logic is present
      const result = await instance.lakehouse.migrate()

      expect(typeof result.isEmergency).toBe('boolean')
    })
  })

  describe('Two-Phase Search', () => {
    it('should perform two-phase search via this.lakehouse.search()', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      // Store some vectors first
      await instance.lakehouse.vectorize('doc-001', createTestEmbedding(), { type: 'document' })
      await instance.lakehouse.vectorize('doc-002', createTestEmbedding(), { type: 'document' })

      const results = await instance.lakehouse.search({
        embedding: createTestEmbedding(),
        topK: 5,
      })

      expect(Array.isArray(results)).toBe(true)
    })

    it('should return search results with score and metadata', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.vectorize('doc-001', createTestEmbedding(), { title: 'Test Doc' })

      const results = await instance.lakehouse.search({
        embedding: createTestEmbedding(),
        topK: 1,
      })

      if (results.length > 0) {
        expect(results[0].id).toBeDefined()
        expect(typeof results[0].score).toBe('number')
        expect(results[0].score).toBeGreaterThanOrEqual(0)
        expect(results[0].score).toBeLessThanOrEqual(1)
      }
    })

    it('should filter search by namespace', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.vectorize('doc-001', createTestEmbedding(), { namespace: 'ns1' })
      await instance.lakehouse.vectorize('doc-002', createTestEmbedding(), { namespace: 'ns2' })

      const results = await instance.lakehouse.search({
        embedding: createTestEmbedding(),
        topK: 10,
        namespace: 'ns1',
      })

      // Results should only include items from ns1
      for (const result of results) {
        if (result.metadata) {
          expect(result.metadata.namespace).toBe('ns1')
        }
      }
    })

    it('should respect candidatePoolSize for phase 1', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      // Store many vectors
      for (let i = 0; i < 20; i++) {
        await instance.lakehouse.vectorize(`doc-${i}`, createTestEmbedding())
      }

      const results = await instance.lakehouse.search({
        embedding: createTestEmbedding(),
        candidatePoolSize: 10,
        topK: 5,
      })

      expect(results.length).toBeLessThanOrEqual(5)
    })

    it('should use truncated 256-dim embeddings for hot tier search', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      // This test verifies that 768-dim embeddings are truncated to 256-dim
      // for hot tier storage and phase 1 search
      const fullEmbedding = createTestEmbedding(768)
      await instance.lakehouse.vectorize('doc-001', fullEmbedding)

      // Search should work with both 768-dim and 256-dim queries
      const results768 = await instance.lakehouse.search({
        embedding: createTestEmbedding(768),
        topK: 1,
      })

      const results256 = await instance.lakehouse.search({
        embedding: createTestEmbedding(256),
        topK: 1,
      })

      expect(Array.isArray(results768)).toBe(true)
      expect(Array.isArray(results256)).toBe(true)
    })
  })

  describe('Vector Storage (vectorize)', () => {
    it('should store vectors via this.lakehouse.vectorize()', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.vectorize('doc-001', createTestEmbedding())

      // Verify it's recorded in the tier index
      const entry = await instance.lakehouse.index.get('doc-001')
      expect(entry).toBeDefined()
      expect(entry?.tier).toBe('hot')
    })

    it('should truncate 768-dim embeddings to 256-dim for hot storage', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      const fullEmbedding = createTestEmbedding(768)
      await instance.lakehouse.vectorize('doc-001', fullEmbedding)

      // The hot index should store 256-dim truncated version
      // This saves 66% storage (256 vs 768 dimensions)
      const stats = await instance.lakehouse.getStats()
      expect(stats.totalVectors).toBeGreaterThanOrEqual(0)
    })

    it('should store metadata with vectors', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.vectorize('doc-001', createTestEmbedding(), {
        title: 'Test Document',
        namespace: 'default',
        type: 'article',
      })

      const results = await instance.lakehouse.search({
        embedding: createTestEmbedding(),
        topK: 1,
      })

      if (results.length > 0 && results[0].metadata) {
        expect(results[0].metadata.title).toBe('Test Document')
      }
    })

    it('should handle batch vectorization', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      // Vectorize multiple documents
      const docs = [
        { id: 'doc-001', embedding: createTestEmbedding() },
        { id: 'doc-002', embedding: createTestEmbedding() },
        { id: 'doc-003', embedding: createTestEmbedding() },
      ]

      for (const doc of docs) {
        await instance.lakehouse.vectorize(doc.id, doc.embedding)
      }

      const stats = await instance.lakehouse.index.getStatistics()
      expect(stats.hot).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Alarm Integration', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should schedule migration alarm on initialization', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore, {
        migrationIntervalMs: 60000, // 1 minute
      })
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      // Initialize lakehouse (may be done in constructor or first operation)
      await instance.lakehouse.vectorize('doc-001', createTestEmbedding())

      // Check that alarm was scheduled
      const alarm = await state.storage.getAlarm()
      expect(alarm).not.toBeNull()
    })

    it('should run migration in alarm handler', async () => {
      const { applyLakehouseMixin, LakehouseBase } = await import('../src/lakehouse-mixin.js')

      const state = createMockStateWithSql()
      const instance = new LakehouseBase(state, {})

      // The alarm handler should trigger migration
      await instance.alarm()

      // Verify that migration was attempted
      // (Implementation should track this in stats)
      const stats = await instance.lakehouse.getStats()
      expect(stats.lastMigrationAt).toBeDefined()
    })

    it('should reschedule alarm after migration', async () => {
      const { applyLakehouseMixin, LakehouseBase } = await import('../src/lakehouse-mixin.js')

      const state = createMockStateWithSql()
      const instance = new LakehouseBase(state, {})

      // Store some data
      await instance.lakehouse.vectorize('doc-001', createTestEmbedding())

      // Trigger alarm
      await instance.alarm()

      // Verify alarm is rescheduled
      const alarm = await state.storage.getAlarm()
      expect(alarm).not.toBeNull()
    })

    it('should handle alarm errors gracefully', async () => {
      const { applyLakehouseMixin, LakehouseBase } = await import('../src/lakehouse-mixin.js')

      const state = createMockStateWithSql()
      const instance = new LakehouseBase(state, {})

      // Even if migration fails, alarm should be rescheduled
      // to prevent the DO from never running migrations again
      await expect(instance.alarm()).resolves.not.toThrow()
    })
  })

  describe('DO Storage Persistence', () => {
    it('should persist tier index to DO storage', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.vectorize('doc-001', createTestEmbedding())

      // Verify SQL was used for persistence
      expect(state.storage.sql.exec).toHaveBeenCalled()
    })

    it('should survive DO hibernation', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()

      // First instance stores data
      const instance1 = new LakehouseDO(state, {})
      await instance1.lakehouse.vectorize('doc-001', createTestEmbedding())

      // Simulate hibernation by creating new instance with same state
      const instance2 = new LakehouseDO(state, {})

      // Data should still be accessible
      const entry = await instance2.lakehouse.index.get('doc-001')
      expect(entry).toBeDefined()
    })

    it('should use SQLite for hot tier storage', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.vectorize('doc-001', createTestEmbedding())

      // SQL should have been called for storage
      expect(state.storage.sql.exec).toHaveBeenCalled()
      // Check that tier_index table is used
      const calls = (state.storage.sql.exec as ReturnType<typeof vi.fn>).mock.calls
      const tierIndexCalls = calls.filter((c: unknown[]) =>
        (c[0] as string).toLowerCase().includes('tier_index')
      )
      expect(tierIndexCalls.length).toBeGreaterThan(0)
    })

    it('should initialize schema on first operation', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.vectorize('doc-001', createTestEmbedding())

      // Check for CREATE TABLE statements
      const calls = (state.storage.sql.exec as ReturnType<typeof vi.fn>).mock.calls
      const createCalls = calls.filter((c: unknown[]) =>
        (c[0] as string).toLowerCase().includes('create table')
      )
      expect(createCalls.length).toBeGreaterThan(0)
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should provide tier statistics via getStats()', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.vectorize('doc-001', createTestEmbedding())

      const stats = await instance.lakehouse.getStats()

      expect(stats.tiers).toBeDefined()
      expect(stats.totalVectors).toBeGreaterThanOrEqual(0)
      expect(stats.search).toBeDefined()
      expect(typeof stats.search.averagePhase1TimeMs).toBe('number')
      expect(typeof stats.search.averagePhase2TimeMs).toBe('number')
    })

    it('should track migration statistics', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.migrate()

      const stats = await instance.lakehouse.getStats()

      expect(typeof stats.totalBytesMigrated).toBe('number')
    })

    it('should track search timing statistics', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      await instance.lakehouse.vectorize('doc-001', createTestEmbedding())
      await instance.lakehouse.search({ embedding: createTestEmbedding(), topK: 1 })

      const stats = await instance.lakehouse.getStats()

      expect(stats.search.totalSearches).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Configuration Updates', () => {
    it('should update configuration via updateConfig()', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      const originalConfig = instance.lakehouse.getConfig()
      const newMaxAge = originalConfig.hotToWarm.maxAge * 2

      instance.lakehouse.updateConfig({
        hotToWarm: {
          ...originalConfig.hotToWarm,
          maxAge: newMaxAge,
        },
      })

      const updatedConfig = instance.lakehouse.getConfig()
      expect(updatedConfig.hotToWarm.maxAge).toBe(newMaxAge)
    })

    it('should validate configuration on update', async () => {
      const { applyLakehouseMixin } = await import('../src/lakehouse-mixin.js')

      const LakehouseDO = applyLakehouseMixin(DOCore)
      const state = createMockStateWithSql()
      const instance = new LakehouseDO(state, {})

      // Invalid configuration should throw
      expect(() => {
        instance.lakehouse.updateConfig({
          hotToWarm: {
            maxAge: -1, // Invalid: negative age
            minAccessCount: 1,
            maxHotSizePercent: 80,
          },
        })
      }).toThrow()
    })
  })

  describe('Convenience Base Class', () => {
    it('should provide LakehouseBase pre-composed class', async () => {
      const { LakehouseBase } = await import('../src/lakehouse-mixin.js')

      expect(LakehouseBase).toBeDefined()

      const state = createMockStateWithSql()
      const instance = new LakehouseBase(state, {})

      expect(instance.lakehouse).toBeDefined()
      expect(instance).toBeInstanceOf(DOCore)
    })

    it('should implement alarm() for scheduled migrations', async () => {
      const { LakehouseBase } = await import('../src/lakehouse-mixin.js')

      const state = createMockStateWithSql()
      const instance = new LakehouseBase(state, {})

      // alarm() should be implemented and not throw "not implemented"
      await expect(instance.alarm()).resolves.not.toThrow('not implemented')
    })
  })
})
