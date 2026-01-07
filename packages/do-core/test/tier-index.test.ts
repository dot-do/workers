/**
 * TierIndex Tests - RED Phase (TDD)
 *
 * Tests for TierIndex that tracks where data lives across storage tiers.
 * These tests define the expected behavior before implementation.
 *
 * Storage Tiers:
 * - hot: SQLite storage in DO (fast, limited)
 * - warm: R2 storage (medium speed, larger)
 * - cold: Archive/external storage (slow, unlimited)
 *
 * Schema:
 * CREATE TABLE tier_index (
 *   id TEXT PRIMARY KEY,
 *   source_table TEXT NOT NULL,
 *   tier TEXT NOT NULL CHECK(tier IN ('hot', 'warm', 'cold')),
 *   location TEXT,  -- R2 key for warm/cold
 *   created_at INTEGER NOT NULL,
 *   migrated_at INTEGER,
 *   accessed_at INTEGER,
 *   access_count INTEGER DEFAULT 0
 * );
 *
 * @module tier-index.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SqlStorage } from '../src/core.js'
import {
  TierIndex,
  TIER_INDEX_SCHEMA_SQL,
  type TierIndexEntry,
  type CreateTierIndexInput,
  type UpdateTierIndexInput,
  type StorageTier,
  type MigrationEligibility,
} from '../src/tier-index.js'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to create a mock SQL storage with tracking capabilities
 */
function createMockSqlStorage(): SqlStorage & {
  _queries: Array<{ sql: string; params: unknown[] }>
  _data: Map<string, TierIndexEntry[]>
  _rowCounter: number
} {
  const queries: Array<{ sql: string; params: unknown[] }> = []
  const data = new Map<string, TierIndexEntry[]>()
  let rowCounter = 0

  // Initialize with empty tier_index table
  data.set('tier_index', [])

  const createMockCursor = <T>(results: T[], rowsWritten = 0) => ({
    columnNames: results.length > 0 ? Object.keys(results[0] as object) : [],
    rowsRead: results.length,
    rowsWritten,
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
          const [id, source_table, tier, location, created_at, migrated_at, accessed_at, access_count] = params as [
            string,
            string,
            StorageTier,
            string | null,
            number,
            number | null,
            number | null,
            number
          ]
          const entry: TierIndexEntry = {
            id,
            sourceTable: source_table,
            tier,
            location: location ?? null,
            createdAt: created_at,
            migratedAt: migrated_at ?? null,
            accessedAt: accessed_at ?? null,
            accessCount: access_count ?? 0,
          }
          rows.push(entry)
          data.set(table, rows)
        }
        return createMockCursor<T>([], 1)
      }

      // Handle UPDATE
      if (normalizedQuery.startsWith('update')) {
        const tableData = data.get('tier_index') ?? []

        // Parse UPDATE query to find which entry to update
        // UPDATE tier_index SET ... WHERE id = ?
        if (normalizedQuery.includes('tier_index')) {
          // Find the id parameter (last param for WHERE id = ?)
          const idParam = params[params.length - 1] as string
          const entryIndex = tableData.findIndex((e) => e.id === idParam)

          if (entryIndex >= 0) {
            const entry = tableData[entryIndex]!

            // Handle access tracking: SET accessed_at = ?, access_count = access_count + 1
            if (normalizedQuery.includes('access_count')) {
              entry.accessedAt = params[0] as number
              entry.accessCount = (entry.accessCount ?? 0) + 1
            }

            // Handle migration: SET tier = ?, location = ?, migrated_at = ?
            if (normalizedQuery.includes('tier = ?') && normalizedQuery.includes('location = ?')) {
              entry.tier = params[0] as StorageTier
              entry.location = params[1] as string
              entry.migratedAt = params[2] as number
            }
          }
        }

        return createMockCursor<T>([], 1)
      }

      // Handle DELETE
      if (normalizedQuery.startsWith('delete')) {
        const tableData = data.get('tier_index') ?? []

        // DELETE FROM tier_index WHERE id = ?
        if (normalizedQuery.includes('tier_index') && normalizedQuery.includes('id = ?')) {
          const idParam = params[0] as string
          const entryIndex = tableData.findIndex((e) => e.id === idParam)
          if (entryIndex >= 0) {
            tableData.splice(entryIndex, 1)
          }
        }

        return createMockCursor<T>([], 1)
      }

      // Handle SELECT for tier queries
      if (normalizedQuery.includes('select') && normalizedQuery.includes('tier_index')) {
        const tableData = data.get('tier_index') ?? []
        let results = [...tableData]

        // Filter by tier if specified
        if (normalizedQuery.includes('tier = ?')) {
          const tierParamIndex = params.findIndex((p) => ['hot', 'warm', 'cold'].includes(p as string))
          if (tierParamIndex >= 0) {
            const tierFilter = params[tierParamIndex] as StorageTier
            results = results.filter((r) => r.tier === tierFilter)
          }
        }

        // Filter by id if specified
        if (normalizedQuery.includes('id = ?')) {
          const idFilter = params[0] as string
          results = results.filter((r) => r.id === idFilter)
        }

        // Filter by source_table if specified
        if (normalizedQuery.includes('source_table = ?')) {
          const sourceFilter = params.find((p) => typeof p === 'string' && !['hot', 'warm', 'cold'].includes(p)) as string
          if (sourceFilter) {
            results = results.filter((r) => r.sourceTable === sourceFilter)
          }
        }

        // Handle migration eligibility query (accessed_at < ? OR accessed_at IS NULL)
        if (normalizedQuery.includes('accessed_at <') || normalizedQuery.includes('accessed_at is null')) {
          // Find the threshold timestamp parameter
          const thresholdIndex = params.findIndex((p) => typeof p === 'number' && p > 1000000000000)
          if (thresholdIndex >= 0) {
            const threshold = params[thresholdIndex] as number
            results = results.filter((r) => r.accessedAt === null || r.accessedAt < threshold)
          }
        }

        // Handle access_count filtering
        if (normalizedQuery.includes('access_count <=')) {
          // Find the max access count parameter - it's a small number (not a timestamp)
          // and comes after tier and any timestamp parameters
          const maxCountIndex = params.findIndex(
            (p) => typeof p === 'number' && p < 1000 && p >= 0
          )
          if (maxCountIndex >= 0) {
            const maxCount = params[maxCountIndex] as number
            results = results.filter((r) => (r.accessCount ?? 0) <= maxCount)
          }
        }

        // Handle ORDER BY accessed_at
        if (normalizedQuery.includes('order by accessed_at')) {
          results.sort((a, b) => {
            // NULLS FIRST for ascending
            if (a.accessedAt === null && b.accessedAt === null) return 0
            if (a.accessedAt === null) return -1
            if (b.accessedAt === null) return 1
            return normalizedQuery.includes('desc') ? b.accessedAt - a.accessedAt : a.accessedAt - b.accessedAt
          })
        }

        // Handle LIMIT
        if (normalizedQuery.includes('limit')) {
          const limitIndex = params.findIndex(
            (p, i) => typeof p === 'number' && p <= 100 && i === params.length - 1
          )
          if (limitIndex >= 0) {
            const limit = params[limitIndex] as number
            results = results.slice(0, limit)
          }
        }

        return createMockCursor<T>(results as unknown as T[])
      }

      return createMockCursor<T>([])
    }),
  }
}

// ============================================================================
// Schema Tests
// ============================================================================

describe('TierIndex Schema', () => {
  it('should define tier_index table with correct schema', () => {
    expect(TIER_INDEX_SCHEMA_SQL).toContain('CREATE TABLE')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('tier_index')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('id TEXT PRIMARY KEY')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('source_table TEXT NOT NULL')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('tier TEXT NOT NULL')
    expect(TIER_INDEX_SCHEMA_SQL).toContain("CHECK(tier IN ('hot', 'warm', 'cold'))")
    expect(TIER_INDEX_SCHEMA_SQL).toContain('location TEXT')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('created_at INTEGER NOT NULL')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('migrated_at INTEGER')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('accessed_at INTEGER')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('access_count INTEGER DEFAULT 0')
  })

  it('should create indexes for efficient tier queries', () => {
    expect(TIER_INDEX_SCHEMA_SQL).toContain('CREATE INDEX')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('idx_tier_index_tier')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('ON tier_index(tier)')
  })

  it('should create indexes for source table queries', () => {
    expect(TIER_INDEX_SCHEMA_SQL).toContain('idx_tier_index_source')
    expect(TIER_INDEX_SCHEMA_SQL).toContain('ON tier_index(source_table)')
  })

  it('should create indexes for migration eligibility queries', () => {
    // Index on accessed_at for finding items eligible for migration
    expect(TIER_INDEX_SCHEMA_SQL).toContain('idx_tier_index_accessed')
  })
})

// ============================================================================
// TierIndex Core Operations
// ============================================================================

describe('TierIndex', () => {
  let sql: ReturnType<typeof createMockSqlStorage>
  let tierIndex: TierIndex

  beforeEach(() => {
    sql = createMockSqlStorage()
    tierIndex = new TierIndex(sql)
  })

  describe('record item location (hot/warm/cold)', () => {
    it('should record a new item in hot tier', async () => {
      const input: CreateTierIndexInput = {
        id: 'event-001',
        sourceTable: 'events',
        tier: 'hot',
      }

      const entry = await tierIndex.record(input)

      expect(entry).toBeDefined()
      expect(entry.id).toBe('event-001')
      expect(entry.sourceTable).toBe('events')
      expect(entry.tier).toBe('hot')
      expect(entry.location).toBeNull() // Hot tier items are in SQLite, no R2 location
      expect(entry.createdAt).toBeGreaterThan(0)
      expect(entry.migratedAt).toBeNull()
      expect(entry.accessCount).toBe(0)
    })

    it('should record an item in warm tier with R2 location', async () => {
      const input: CreateTierIndexInput = {
        id: 'event-002',
        sourceTable: 'events',
        tier: 'warm',
        location: 'r2://bucket/events/event-002.json',
      }

      const entry = await tierIndex.record(input)

      expect(entry).toBeDefined()
      expect(entry.id).toBe('event-002')
      expect(entry.tier).toBe('warm')
      expect(entry.location).toBe('r2://bucket/events/event-002.json')
    })

    it('should record an item in cold tier with archive location', async () => {
      const input: CreateTierIndexInput = {
        id: 'event-003',
        sourceTable: 'events',
        tier: 'cold',
        location: 'archive://2024/events/event-003.gz',
      }

      const entry = await tierIndex.record(input)

      expect(entry).toBeDefined()
      expect(entry.tier).toBe('cold')
      expect(entry.location).toBe('archive://2024/events/event-003.gz')
    })

    it('should require location for warm tier', async () => {
      const input: CreateTierIndexInput = {
        id: 'event-004',
        sourceTable: 'events',
        tier: 'warm',
        // Missing location - should fail
      }

      await expect(tierIndex.record(input)).rejects.toThrow(/location.*required.*warm/)
    })

    it('should require location for cold tier', async () => {
      const input: CreateTierIndexInput = {
        id: 'event-005',
        sourceTable: 'events',
        tier: 'cold',
        // Missing location - should fail
      }

      await expect(tierIndex.record(input)).rejects.toThrow(/location.*required.*cold/)
    })
  })

  describe('track migration timestamp', () => {
    it('should set migratedAt when recording in warm/cold tier', async () => {
      const beforeMigration = Date.now()

      const entry = await tierIndex.record({
        id: 'event-010',
        sourceTable: 'events',
        tier: 'warm',
        location: 'r2://bucket/events/event-010.json',
      })

      expect(entry.migratedAt).toBeDefined()
      expect(entry.migratedAt).toBeGreaterThanOrEqual(beforeMigration)
    })

    it('should not set migratedAt for hot tier items', async () => {
      const entry = await tierIndex.record({
        id: 'event-011',
        sourceTable: 'events',
        tier: 'hot',
      })

      expect(entry.migratedAt).toBeNull()
    })

    it('should update migratedAt when migrating from hot to warm', async () => {
      // First record in hot tier
      await tierIndex.record({
        id: 'event-012',
        sourceTable: 'events',
        tier: 'hot',
      })

      const beforeMigration = Date.now()

      // Then migrate to warm
      const updated = await tierIndex.migrate('event-012', {
        tier: 'warm',
        location: 'r2://bucket/events/event-012.json',
      })

      expect(updated).toBeDefined()
      expect(updated!.tier).toBe('warm')
      expect(updated!.migratedAt).toBeGreaterThanOrEqual(beforeMigration)
    })

    it('should update migratedAt when migrating from warm to cold', async () => {
      // Record in warm tier
      await tierIndex.record({
        id: 'event-013',
        sourceTable: 'events',
        tier: 'warm',
        location: 'r2://bucket/events/event-013.json',
      })

      const beforeMigration = Date.now()

      // Migrate to cold
      const updated = await tierIndex.migrate('event-013', {
        tier: 'cold',
        location: 'archive://2024/events/event-013.gz',
      })

      expect(updated!.tier).toBe('cold')
      expect(updated!.migratedAt).toBeGreaterThanOrEqual(beforeMigration)
    })
  })

  describe('query items by tier', () => {
    beforeEach(async () => {
      // Seed test data
      await tierIndex.record({ id: 'hot-1', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'hot-2', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'warm-1', sourceTable: 'events', tier: 'warm', location: 'r2://warm-1' })
      await tierIndex.record({ id: 'cold-1', sourceTable: 'events', tier: 'cold', location: 'archive://cold-1' })
    })

    it('should find all items in hot tier', async () => {
      const hotItems = await tierIndex.findByTier('hot')

      expect(hotItems).toHaveLength(2)
      expect(hotItems.every((item) => item.tier === 'hot')).toBe(true)
    })

    it('should find all items in warm tier', async () => {
      const warmItems = await tierIndex.findByTier('warm')

      expect(warmItems).toHaveLength(1)
      expect(warmItems[0]?.tier).toBe('warm')
    })

    it('should find all items in cold tier', async () => {
      const coldItems = await tierIndex.findByTier('cold')

      expect(coldItems).toHaveLength(1)
      expect(coldItems[0]?.tier).toBe('cold')
    })

    it('should return empty array for tier with no items', async () => {
      // Create fresh instance without seeded data
      const freshSql = createMockSqlStorage()
      const freshIndex = new TierIndex(freshSql)

      const items = await freshIndex.findByTier('cold')

      expect(items).toEqual([])
    })

    it('should filter by source table within tier', async () => {
      // Add items from different source tables
      await tierIndex.record({ id: 'search-1', sourceTable: 'search', tier: 'hot' })

      const eventItems = await tierIndex.findByTier('hot', { sourceTable: 'events' })

      expect(eventItems.every((item) => item.sourceTable === 'events')).toBe(true)
    })
  })

  describe('find items eligible for migration', () => {
    it('should find items not accessed within threshold', async () => {
      const now = Date.now()
      const oldAccessTime = now - 7 * 24 * 60 * 60 * 1000 // 7 days ago

      // Record items with different access patterns
      await tierIndex.record({ id: 'recent-1', sourceTable: 'events', tier: 'hot' })
      await tierIndex.recordAccess('recent-1') // Access it recently

      await tierIndex.record({ id: 'stale-1', sourceTable: 'events', tier: 'hot' })
      // Don't access stale-1 - it should be eligible for migration

      // Find items eligible for migration (not accessed in 24 hours)
      const eligibleItems = await tierIndex.findEligibleForMigration({
        fromTier: 'hot',
        accessThresholdMs: 24 * 60 * 60 * 1000, // 24 hours
      })

      // stale-1 should be eligible because accessedAt is null (never accessed)
      expect(eligibleItems.some((item) => item.id === 'stale-1')).toBe(true)
    })

    it('should find items with low access count', async () => {
      // Record items with different access counts
      await tierIndex.record({ id: 'popular-1', sourceTable: 'events', tier: 'hot' })
      for (let i = 0; i < 100; i++) {
        await tierIndex.recordAccess('popular-1')
      }

      await tierIndex.record({ id: 'unpopular-1', sourceTable: 'events', tier: 'hot' })
      await tierIndex.recordAccess('unpopular-1') // Only 1 access

      // Find items with low access count
      const eligibleItems = await tierIndex.findEligibleForMigration({
        fromTier: 'hot',
        maxAccessCount: 10,
      })

      expect(eligibleItems.some((item) => item.id === 'unpopular-1')).toBe(true)
      expect(eligibleItems.some((item) => item.id === 'popular-1')).toBe(false)
    })

    it('should respect limit on eligible items', async () => {
      // Record many items
      for (let i = 0; i < 20; i++) {
        await tierIndex.record({ id: `item-${i}`, sourceTable: 'events', tier: 'hot' })
      }

      const eligibleItems = await tierIndex.findEligibleForMigration({
        fromTier: 'hot',
        limit: 5,
      })

      expect(eligibleItems.length).toBeLessThanOrEqual(5)
    })

    it('should sort by access time (oldest first) for migration', async () => {
      // This ensures we migrate least-recently-used items first
      const eligibleItems = await tierIndex.findEligibleForMigration({
        fromTier: 'hot',
        accessThresholdMs: 24 * 60 * 60 * 1000,
        orderBy: 'accessed_at',
        orderDirection: 'asc',
      })

      // Items should be sorted by accessedAt ascending (oldest first)
      for (let i = 1; i < eligibleItems.length; i++) {
        const prev = eligibleItems[i - 1]
        const curr = eligibleItems[i]
        if (prev?.accessedAt && curr?.accessedAt) {
          expect(curr.accessedAt).toBeGreaterThanOrEqual(prev.accessedAt)
        }
      }
    })
  })

  describe('update location on migration', () => {
    it('should update tier and location when migrating', async () => {
      // Record in hot tier
      await tierIndex.record({
        id: 'migrate-1',
        sourceTable: 'events',
        tier: 'hot',
      })

      // Migrate to warm tier
      const updated = await tierIndex.migrate('migrate-1', {
        tier: 'warm',
        location: 'r2://bucket/events/migrate-1.json',
      })

      expect(updated).toBeDefined()
      expect(updated!.tier).toBe('warm')
      expect(updated!.location).toBe('r2://bucket/events/migrate-1.json')
    })

    it('should return null when migrating non-existent item', async () => {
      const updated = await tierIndex.migrate('non-existent', {
        tier: 'warm',
        location: 'r2://bucket/non-existent.json',
      })

      expect(updated).toBeNull()
    })

    it('should preserve other fields when migrating', async () => {
      // Record with some initial data
      await tierIndex.record({
        id: 'preserve-1',
        sourceTable: 'things',
        tier: 'hot',
      })

      // Access it a few times
      await tierIndex.recordAccess('preserve-1')
      await tierIndex.recordAccess('preserve-1')
      await tierIndex.recordAccess('preserve-1')

      // Get pre-migration state
      const before = await tierIndex.get('preserve-1')

      // Migrate
      const after = await tierIndex.migrate('preserve-1', {
        tier: 'warm',
        location: 'r2://bucket/preserve-1.json',
      })

      // Verify source_table is preserved
      expect(after!.sourceTable).toBe(before!.sourceTable)
      // Verify access_count is preserved
      expect(after!.accessCount).toBe(before!.accessCount)
      // Verify created_at is preserved
      expect(after!.createdAt).toBe(before!.createdAt)
    })
  })

  describe('batch location updates', () => {
    it('should update multiple items in a single operation', async () => {
      // Record multiple items
      await tierIndex.record({ id: 'batch-1', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'batch-2', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'batch-3', sourceTable: 'events', tier: 'hot' })

      // Batch migrate
      const updates = [
        { id: 'batch-1', tier: 'warm' as StorageTier, location: 'r2://batch-1' },
        { id: 'batch-2', tier: 'warm' as StorageTier, location: 'r2://batch-2' },
        { id: 'batch-3', tier: 'warm' as StorageTier, location: 'r2://batch-3' },
      ]

      const results = await tierIndex.batchMigrate(updates)

      expect(results).toHaveLength(3)
      expect(results.every((r) => r !== null && r.tier === 'warm')).toBe(true)
    })

    it('should handle partial failures in batch migration', async () => {
      // Record some items (but not all)
      await tierIndex.record({ id: 'exists-1', sourceTable: 'events', tier: 'hot' })
      // batch-missing does NOT exist

      const updates = [
        { id: 'exists-1', tier: 'warm' as StorageTier, location: 'r2://exists-1' },
        { id: 'missing-1', tier: 'warm' as StorageTier, location: 'r2://missing-1' },
      ]

      const results = await tierIndex.batchMigrate(updates)

      expect(results).toHaveLength(2)
      expect(results[0]).not.toBeNull() // exists-1 succeeded
      expect(results[1]).toBeNull() // missing-1 failed
    })

    it('should be atomic within batch (all or nothing option)', async () => {
      await tierIndex.record({ id: 'atomic-1', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'atomic-2', sourceTable: 'events', tier: 'hot' })

      const updates = [
        { id: 'atomic-1', tier: 'warm' as StorageTier, location: 'r2://atomic-1' },
        { id: 'non-existent', tier: 'warm' as StorageTier, location: 'r2://non-existent' }, // Will fail
      ]

      // With atomic option, entire batch should fail
      await expect(
        tierIndex.batchMigrate(updates, { atomic: true })
      ).rejects.toThrow(/batch migration failed/)

      // Verify atomic-1 was not migrated (rolled back)
      const item = await tierIndex.get('atomic-1')
      expect(item!.tier).toBe('hot')
    })
  })

  describe('access tracking', () => {
    it('should increment access_count on access', async () => {
      await tierIndex.record({ id: 'track-1', sourceTable: 'events', tier: 'hot' })

      await tierIndex.recordAccess('track-1')
      await tierIndex.recordAccess('track-1')
      await tierIndex.recordAccess('track-1')

      const entry = await tierIndex.get('track-1')
      expect(entry!.accessCount).toBe(3)
    })

    it('should update accessed_at timestamp on access', async () => {
      await tierIndex.record({ id: 'track-2', sourceTable: 'events', tier: 'hot' })

      const before = Date.now()
      await tierIndex.recordAccess('track-2')
      const after = Date.now()

      const entry = await tierIndex.get('track-2')
      expect(entry!.accessedAt).toBeGreaterThanOrEqual(before)
      expect(entry!.accessedAt).toBeLessThanOrEqual(after)
    })

    it('should batch record accesses', async () => {
      await tierIndex.record({ id: 'batch-access-1', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'batch-access-2', sourceTable: 'events', tier: 'hot' })

      await tierIndex.batchRecordAccess(['batch-access-1', 'batch-access-2'])

      const entry1 = await tierIndex.get('batch-access-1')
      const entry2 = await tierIndex.get('batch-access-2')

      expect(entry1!.accessCount).toBeGreaterThan(0)
      expect(entry2!.accessCount).toBeGreaterThan(0)
    })
  })

  describe('getById', () => {
    it('should retrieve an entry by ID', async () => {
      await tierIndex.record({
        id: 'get-test-1',
        sourceTable: 'events',
        tier: 'hot',
      })

      const entry = await tierIndex.get('get-test-1')

      expect(entry).toBeDefined()
      expect(entry!.id).toBe('get-test-1')
      expect(entry!.sourceTable).toBe('events')
      expect(entry!.tier).toBe('hot')
    })

    it('should return null for non-existent ID', async () => {
      const entry = await tierIndex.get('non-existent-id')

      expect(entry).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete an entry by ID', async () => {
      await tierIndex.record({
        id: 'delete-test-1',
        sourceTable: 'events',
        tier: 'hot',
      })

      const deleted = await tierIndex.delete('delete-test-1')

      expect(deleted).toBe(true)

      const entry = await tierIndex.get('delete-test-1')
      expect(entry).toBeNull()
    })

    it('should return false when deleting non-existent entry', async () => {
      const deleted = await tierIndex.delete('non-existent')

      expect(deleted).toBe(false)
    })
  })

  describe('Schema Initialization', () => {
    it('should initialize schema on first operation', async () => {
      await tierIndex.ensureSchema()

      // Check that CREATE TABLE was called
      const createTableQuery = sql._queries.find((q) => q.sql.toLowerCase().includes('create table'))
      expect(createTableQuery).toBeDefined()
      expect(createTableQuery?.sql.toLowerCase()).toContain('tier_index')
    })

    it('should only initialize schema once', async () => {
      await tierIndex.ensureSchema()
      await tierIndex.ensureSchema()
      await tierIndex.ensureSchema()

      // Count CREATE TABLE calls
      const createTableCalls = sql._queries.filter((q) => q.sql.toLowerCase().includes('create table'))

      // Should only have been called once
      expect(createTableCalls.length).toBe(1)
    })
  })

  describe('Type Definitions', () => {
    it('should properly type TierIndexEntry', () => {
      // This is a compile-time check - if types are wrong, TS will fail
      const entry: TierIndexEntry = {
        id: 'type-test-1',
        sourceTable: 'events',
        tier: 'hot',
        location: null,
        createdAt: Date.now(),
        migratedAt: null,
        accessedAt: null,
        accessCount: 0,
      }

      expect(entry.tier).toBe('hot')
      expect(entry.location).toBeNull()
    })

    it('should enforce StorageTier enum values', () => {
      // TypeScript should only allow 'hot' | 'warm' | 'cold'
      const validTiers: StorageTier[] = ['hot', 'warm', 'cold']
      expect(validTiers).toHaveLength(3)
    })

    it('should properly type CreateTierIndexInput', () => {
      const hotInput: CreateTierIndexInput = {
        id: 'create-type-1',
        sourceTable: 'events',
        tier: 'hot',
      }

      const warmInput: CreateTierIndexInput = {
        id: 'create-type-2',
        sourceTable: 'events',
        tier: 'warm',
        location: 'r2://test',
      }

      expect(hotInput.tier).toBe('hot')
      expect(warmInput.location).toBe('r2://test')
    })
  })

  describe('statistics', () => {
    it('should return tier distribution statistics', async () => {
      await tierIndex.record({ id: 'stats-hot-1', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'stats-hot-2', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'stats-warm-1', sourceTable: 'events', tier: 'warm', location: 'r2://1' })
      await tierIndex.record({ id: 'stats-cold-1', sourceTable: 'events', tier: 'cold', location: 'archive://1' })

      const stats = await tierIndex.getStatistics()

      expect(stats.hot).toBe(2)
      expect(stats.warm).toBe(1)
      expect(stats.cold).toBe(1)
      expect(stats.total).toBe(4)
    })

    it('should return statistics by source table', async () => {
      await tierIndex.record({ id: 'table-stats-1', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'table-stats-2', sourceTable: 'events', tier: 'hot' })
      await tierIndex.record({ id: 'table-stats-3', sourceTable: 'things', tier: 'hot' })

      const stats = await tierIndex.getStatistics({ sourceTable: 'events' })

      expect(stats.total).toBe(2)
    })
  })
})
