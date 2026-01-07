/**
 * Migration Policy Engine Tests - RED Phase (TDD)
 *
 * Tests for the migration policy engine that manages tiered storage migration.
 * This implements the policy evaluation for hot -> warm -> cold data migration.
 *
 * The Migration Policy Engine provides:
 * - Time-based migration rules (TTL expiration)
 * - Access frequency tracking to prevent migrating hot data
 * - Size threshold enforcement for storage tiers
 * - Retention period management
 * - Batch size optimization for migrations
 * - Policy priority ordering
 *
 * @module migration-policy.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  MigrationPolicyEngine,
  MigrationPolicy,
  MigrationCandidate,
  MigrationDecision,
  StorageTier,
  type MigrationPolicyConfig,
  type TierUsage,
  type AccessStats,
} from '../src/migration-policy.js'

// ============================================================================
// Test Types
// ============================================================================

/**
 * Example item that can be migrated between storage tiers
 */
interface TestItem {
  id: string
  createdAt: number
  lastAccessedAt: number
  accessCount: number
  sizeBytes: number
  tier: StorageTier
  data: unknown
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a default migration policy configuration
 */
function createDefaultPolicy(): MigrationPolicyConfig {
  return {
    hotToWarm: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      minAccessCount: 5, // Items accessed >= 5 times in window stay hot
      maxHotSizePercent: 80, // Migrate when hot tier > 80% full
      accessWindow: 60 * 60 * 1000, // 1 hour access window
    },
    warmToCold: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      minPartitionSize: 1024 * 1024, // 1MB minimum batch
      retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 day retention
    },
    batchSize: {
      min: 10, // Minimum 10 items per batch
      max: 1000, // Maximum 1000 items per batch
      targetBytes: 10 * 1024 * 1024, // Target 10MB per batch
    },
  }
}

/**
 * Create a test item at a specific tier
 */
function createTestItem(
  overrides: Partial<TestItem> = {}
): TestItem {
  const now = Date.now()
  return {
    id: `item-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now - 12 * 60 * 60 * 1000, // 12 hours ago
    lastAccessedAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
    accessCount: 3,
    sizeBytes: 1024, // 1KB
    tier: 'hot',
    data: { value: 'test' },
    ...overrides,
  }
}

/**
 * Create tier usage statistics
 */
function createTierUsage(overrides: Partial<TierUsage> = {}): TierUsage {
  return {
    tier: 'hot',
    itemCount: 100,
    totalBytes: 1024 * 1024, // 1MB
    maxBytes: 10 * 1024 * 1024, // 10MB
    percentFull: 10,
    ...overrides,
  }
}

/**
 * Create access statistics for an item
 */
function createAccessStats(overrides: Partial<AccessStats> = {}): AccessStats {
  const now = Date.now()
  return {
    itemId: `item-${Math.random().toString(36).slice(2, 10)}`,
    totalAccesses: 10,
    recentAccesses: 3, // Accesses in the window
    lastAccessedAt: now - 30 * 60 * 1000, // 30 minutes ago
    accessWindow: 60 * 60 * 1000, // 1 hour window
    ...overrides,
  }
}

// ============================================================================
// Migration Policy Configuration Tests
// ============================================================================

describe('MigrationPolicy', () => {
  describe('Policy Configuration', () => {
    it('should create policy with hot->warm settings', () => {
      const policy: MigrationPolicy = {
        hotToWarm: {
          maxAge: 86400000, // 24 hours
          minAccessCount: 5,
          maxHotSizePercent: 80,
        },
        warmToCold: {
          maxAge: 604800000, // 7 days
          minPartitionSize: 1048576, // 1MB
        },
      }

      expect(policy.hotToWarm.maxAge).toBe(86400000)
      expect(policy.hotToWarm.minAccessCount).toBe(5)
      expect(policy.hotToWarm.maxHotSizePercent).toBe(80)
    })

    it('should create policy with warm->cold settings', () => {
      const policy: MigrationPolicy = {
        hotToWarm: {
          maxAge: 86400000,
          minAccessCount: 5,
          maxHotSizePercent: 80,
        },
        warmToCold: {
          maxAge: 604800000, // 7 days
          minPartitionSize: 1048576, // 1MB minimum batch
        },
      }

      expect(policy.warmToCold.maxAge).toBe(604800000)
      expect(policy.warmToCold.minPartitionSize).toBe(1048576)
    })

    it('should validate policy constraints', () => {
      // hotToWarm maxAge should be positive
      expect(() => {
        new MigrationPolicyEngine({
          hotToWarm: {
            maxAge: -1,
            minAccessCount: 5,
            maxHotSizePercent: 80,
          },
          warmToCold: {
            maxAge: 604800000,
            minPartitionSize: 1048576,
          },
        })
      }).toThrow(/maxAge must be positive/)

      // maxHotSizePercent should be 0-100
      expect(() => {
        new MigrationPolicyEngine({
          hotToWarm: {
            maxAge: 86400000,
            minAccessCount: 5,
            maxHotSizePercent: 150,
          },
          warmToCold: {
            maxAge: 604800000,
            minPartitionSize: 1048576,
          },
        })
      }).toThrow(/maxHotSizePercent must be between 0 and 100/)
    })
  })
})

// ============================================================================
// Migration Policy Engine Tests
// ============================================================================

describe('MigrationPolicyEngine', () => {
  let engine: MigrationPolicyEngine
  let policy: MigrationPolicyConfig
  let now: number

  beforeEach(() => {
    now = Date.now()
    vi.useFakeTimers()
    vi.setSystemTime(now)
    policy = createDefaultPolicy()
    engine = new MigrationPolicyEngine(policy)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Hot to Warm Migration', () => {
    it('should migrate hot->warm after TTL expires', () => {
      const item = createTestItem({
        id: 'old-item',
        createdAt: now - 25 * 60 * 60 * 1000, // 25 hours ago (> 24h TTL)
        lastAccessedAt: now - 25 * 60 * 60 * 1000,
        accessCount: 2, // Below threshold
        tier: 'hot',
      })

      const tierUsage = createTierUsage({ percentFull: 50 })

      const decision = engine.evaluateHotToWarm(item, tierUsage)

      expect(decision.shouldMigrate).toBe(true)
      expect(decision.reason).toContain('TTL')
      expect(decision.targetTier).toBe('warm')
    })

    it('should NOT migrate frequently accessed items', () => {
      const item = createTestItem({
        id: 'hot-item',
        createdAt: now - 25 * 60 * 60 * 1000, // 25 hours ago (> TTL)
        lastAccessedAt: now - 10 * 60 * 1000, // 10 minutes ago (recent)
        accessCount: 10, // Above threshold (>= 5)
        tier: 'hot',
      })

      const accessStats = createAccessStats({
        itemId: 'hot-item',
        recentAccesses: 10, // 10 accesses in the window
        lastAccessedAt: now - 10 * 60 * 1000,
      })

      const tierUsage = createTierUsage({ percentFull: 50 })

      const decision = engine.evaluateHotToWarm(item, tierUsage, accessStats)

      expect(decision.shouldMigrate).toBe(false)
      expect(decision.reason).toContain('frequently accessed')
    })

    it('should migrate when hot tier exceeds size threshold', () => {
      const item = createTestItem({
        id: 'size-pressure-item',
        createdAt: now - 12 * 60 * 60 * 1000, // 12 hours ago (< TTL)
        lastAccessedAt: now - 2 * 60 * 60 * 1000,
        accessCount: 2, // Below frequent access threshold
        tier: 'hot',
      })

      // Hot tier is 85% full (> 80% threshold)
      const tierUsage = createTierUsage({
        percentFull: 85,
        totalBytes: 8.5 * 1024 * 1024,
        maxBytes: 10 * 1024 * 1024,
      })

      const decision = engine.evaluateHotToWarm(item, tierUsage)

      expect(decision.shouldMigrate).toBe(true)
      expect(decision.reason).toContain('size threshold')
    })

    it('should not migrate items below TTL when tier has space', () => {
      const item = createTestItem({
        id: 'fresh-item',
        createdAt: now - 6 * 60 * 60 * 1000, // 6 hours ago (< 24h TTL)
        lastAccessedAt: now - 1 * 60 * 60 * 1000,
        accessCount: 2,
        tier: 'hot',
      })

      const tierUsage = createTierUsage({ percentFull: 30 })

      const decision = engine.evaluateHotToWarm(item, tierUsage)

      expect(decision.shouldMigrate).toBe(false)
      expect(decision.reason).toContain('below TTL')
    })
  })

  describe('Warm to Cold Migration', () => {
    it('should migrate warm->cold after retention period', () => {
      const item = createTestItem({
        id: 'old-warm-item',
        createdAt: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago (> 7 day retention)
        lastAccessedAt: now - 10 * 24 * 60 * 60 * 1000,
        accessCount: 1,
        tier: 'warm',
      })

      const decision = engine.evaluateWarmToCold(item)

      expect(decision.shouldMigrate).toBe(true)
      expect(decision.reason).toContain('retention period')
      expect(decision.targetTier).toBe('cold')
    })

    it('should respect minimum batch sizes', () => {
      // Create items that together are below minimum partition size
      const items: TestItem[] = []
      for (let i = 0; i < 5; i++) {
        items.push(createTestItem({
          id: `small-item-${i}`,
          sizeBytes: 100 * 1024, // 100KB each = 500KB total (< 1MB min)
          tier: 'warm',
          createdAt: now - 10 * 24 * 60 * 60 * 1000,
        }))
      }

      const candidates = engine.selectWarmToColdBatch(items)

      // Should not include items if total is below minPartitionSize
      expect(candidates.totalBytes).toBeLessThan(policy.warmToCold.minPartitionSize)
      expect(candidates.shouldProceed).toBe(false)
      expect(candidates.reason).toContain('minimum partition size')
    })

    it('should proceed when batch meets minimum size', () => {
      // Create items that together exceed minimum partition size
      const items: TestItem[] = []
      for (let i = 0; i < 20; i++) {
        items.push(createTestItem({
          id: `large-item-${i}`,
          sizeBytes: 100 * 1024, // 100KB each = 2MB total (> 1MB min)
          tier: 'warm',
          createdAt: now - 10 * 24 * 60 * 60 * 1000,
        }))
      }

      const candidates = engine.selectWarmToColdBatch(items)

      expect(candidates.totalBytes).toBeGreaterThanOrEqual(policy.warmToCold.minPartitionSize)
      expect(candidates.shouldProceed).toBe(true)
    })
  })

  describe('Policy Priority', () => {
    it('should evaluate policies in priority order', () => {
      // When multiple policies apply, higher priority wins
      const item = createTestItem({
        id: 'priority-item',
        createdAt: now - 25 * 60 * 60 * 1000, // Exceeds TTL
        lastAccessedAt: now - 5 * 60 * 1000, // Very recent access
        accessCount: 100, // Very high access count
        tier: 'hot',
      })

      const accessStats = createAccessStats({
        itemId: 'priority-item',
        recentAccesses: 100,
        lastAccessedAt: now - 5 * 60 * 1000,
      })

      // Even with high tier pressure
      const tierUsage = createTierUsage({ percentFull: 95 })

      // Access frequency should have higher priority than TTL/size
      const decision = engine.evaluateHotToWarm(item, tierUsage, accessStats)

      // Frequently accessed items should NOT be migrated even under pressure
      expect(decision.shouldMigrate).toBe(false)
      expect(decision.priority).toBe('access-frequency')
    })

    it('should apply emergency migration under extreme pressure', () => {
      const item = createTestItem({
        id: 'emergency-item',
        createdAt: now - 1 * 60 * 60 * 1000, // Only 1 hour old
        accessCount: 10, // Somewhat active
        tier: 'hot',
      })

      // Tier at 99% capacity - emergency
      const tierUsage = createTierUsage({ percentFull: 99 })

      const decision = engine.evaluateHotToWarm(item, tierUsage)

      expect(decision.shouldMigrate).toBe(true)
      expect(decision.reason).toContain('emergency')
      expect(decision.isEmergency).toBe(true)
    })
  })

  describe('Batch Operations', () => {
    it('should respect minimum batch count', () => {
      const items: TestItem[] = []
      for (let i = 0; i < 5; i++) { // Only 5 items (< 10 minimum)
        items.push(createTestItem({
          id: `batch-item-${i}`,
          tier: 'hot',
          createdAt: now - 25 * 60 * 60 * 1000, // Eligible for migration
          accessCount: 1,
        }))
      }

      const tierUsage = createTierUsage({ percentFull: 50 })
      const batch = engine.selectHotToWarmBatch(items, tierUsage)

      // Should wait for more items unless under pressure
      expect(batch.items.length).toBe(0)
      expect(batch.shouldProceed).toBe(false)
      expect(batch.reason).toContain('minimum batch')
    })

    it('should respect maximum batch count', () => {
      const items: TestItem[] = []
      for (let i = 0; i < 2000; i++) { // 2000 items (> 1000 max)
        items.push(createTestItem({
          id: `batch-item-${i}`,
          tier: 'hot',
          createdAt: now - 25 * 60 * 60 * 1000, // Eligible
          accessCount: 1,
        }))
      }

      const tierUsage = createTierUsage({ percentFull: 85 })
      const batch = engine.selectHotToWarmBatch(items, tierUsage)

      expect(batch.items.length).toBeLessThanOrEqual(1000)
    })

    it('should target batch size by bytes', () => {
      const items: TestItem[] = []
      // Each item is 1MB
      for (let i = 0; i < 20; i++) {
        items.push(createTestItem({
          id: `big-item-${i}`,
          tier: 'hot',
          sizeBytes: 1024 * 1024, // 1MB each
          createdAt: now - 25 * 60 * 60 * 1000,
          accessCount: 1,
        }))
      }

      const tierUsage = createTierUsage({ percentFull: 85 })
      const batch = engine.selectHotToWarmBatch(items, tierUsage)

      // Should target ~10MB, so roughly 10 items
      expect(batch.totalBytes).toBeLessThanOrEqual(policy.batchSize.targetBytes * 1.2) // Allow 20% overflow
      expect(batch.totalBytes).toBeGreaterThanOrEqual(policy.batchSize.targetBytes * 0.5)
    })
  })

  describe('Migration Candidates', () => {
    it('should create migration candidate with metadata', () => {
      const item = createTestItem({
        id: 'candidate-item',
        tier: 'hot',
      })

      const candidate: MigrationCandidate = engine.createCandidate(item, 'hot', 'warm')

      expect(candidate.itemId).toBe('candidate-item')
      expect(candidate.sourceTier).toBe('hot')
      expect(candidate.targetTier).toBe('warm')
      expect(candidate.createdAt).toBeGreaterThan(0)
      expect(candidate.estimatedBytes).toBe(item.sizeBytes)
    })

    it('should prioritize candidates by age and access', () => {
      const items: TestItem[] = [
        createTestItem({
          id: 'old-inactive',
          createdAt: now - 30 * 60 * 60 * 1000, // Oldest
          accessCount: 1, // Least accessed
        }),
        createTestItem({
          id: 'new-active',
          createdAt: now - 12 * 60 * 60 * 1000, // Newer
          accessCount: 10, // More accessed
        }),
        createTestItem({
          id: 'old-active',
          createdAt: now - 30 * 60 * 60 * 1000, // Old
          accessCount: 8, // Somewhat accessed
        }),
      ]

      const tierUsage = createTierUsage({ percentFull: 85 })
      const prioritized = engine.prioritizeCandidates(items, tierUsage)

      // Old + inactive should be first priority
      expect(prioritized[0].id).toBe('old-inactive')
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should track migration statistics', async () => {
      const items: TestItem[] = []
      for (let i = 0; i < 15; i++) {
        items.push(createTestItem({
          id: `stat-item-${i}`,
          tier: 'hot',
          createdAt: now - 25 * 60 * 60 * 1000,
          accessCount: 1,
          sizeBytes: 1024,
        }))
      }

      const tierUsage = createTierUsage({ percentFull: 85 })
      const batch = engine.selectHotToWarmBatch(items, tierUsage)

      // Record the migration
      engine.recordMigration(batch)

      const stats = engine.getStatistics()

      expect(stats.totalMigrationsEvaluated).toBeGreaterThan(0)
      expect(stats.lastMigrationAt).toBe(now)
    })

    it('should calculate migration throughput', () => {
      // Simulate multiple migrations
      for (let i = 0; i < 5; i++) {
        engine.recordMigration({
          items: [],
          totalBytes: 1024 * 1024, // 1MB each
          shouldProceed: true,
          reason: 'test',
          startedAt: now + i * 1000,
          completedAt: now + i * 1000 + 100,
        })
      }

      const stats = engine.getStatistics()

      expect(stats.totalBytesMigrated).toBe(5 * 1024 * 1024)
      expect(stats.averageMigrationTimeMs).toBeGreaterThan(0)
    })
  })

  describe('Policy Updates', () => {
    it('should allow runtime policy updates', () => {
      const newPolicy: Partial<MigrationPolicyConfig> = {
        hotToWarm: {
          maxAge: 12 * 60 * 60 * 1000, // Reduced to 12 hours
          minAccessCount: 10, // Increased threshold
          maxHotSizePercent: 70, // More aggressive
        },
      }

      engine.updatePolicy(newPolicy)

      const currentPolicy = engine.getPolicy()

      expect(currentPolicy.hotToWarm.maxAge).toBe(12 * 60 * 60 * 1000)
      expect(currentPolicy.hotToWarm.minAccessCount).toBe(10)
      expect(currentPolicy.hotToWarm.maxHotSizePercent).toBe(70)
    })

    it('should preserve unmodified policy sections on partial update', () => {
      const originalWarmToCold = { ...policy.warmToCold }

      engine.updatePolicy({
        hotToWarm: {
          maxAge: 12 * 60 * 60 * 1000,
          minAccessCount: 10,
          maxHotSizePercent: 70,
        },
      })

      const currentPolicy = engine.getPolicy()

      expect(currentPolicy.warmToCold).toEqual(originalWarmToCold)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty item list', () => {
      const tierUsage = createTierUsage({ percentFull: 50 })
      const batch = engine.selectHotToWarmBatch([], tierUsage)

      expect(batch.items).toHaveLength(0)
      expect(batch.shouldProceed).toBe(false)
    })

    it('should handle items with zero size', () => {
      const item = createTestItem({
        id: 'zero-size',
        sizeBytes: 0,
        tier: 'hot',
        createdAt: now - 25 * 60 * 60 * 1000,
      })

      const tierUsage = createTierUsage({ percentFull: 50 })
      const decision = engine.evaluateHotToWarm(item, tierUsage)

      // Should still be able to evaluate
      expect(decision.shouldMigrate).toBeDefined()
    })

    it('should handle items with future timestamps gracefully', () => {
      const item = createTestItem({
        id: 'future-item',
        createdAt: now + 60 * 60 * 1000, // 1 hour in future
        lastAccessedAt: now + 60 * 60 * 1000,
        tier: 'hot',
      })

      const tierUsage = createTierUsage({ percentFull: 50 })
      const decision = engine.evaluateHotToWarm(item, tierUsage)

      // Should treat as very fresh, not migrate
      expect(decision.shouldMigrate).toBe(false)
    })

    it('should handle concurrent policy evaluation', async () => {
      const items: TestItem[] = []
      for (let i = 0; i < 100; i++) {
        items.push(createTestItem({
          id: `concurrent-item-${i}`,
          tier: 'hot',
          createdAt: now - 25 * 60 * 60 * 1000,
        }))
      }

      const tierUsage = createTierUsage({ percentFull: 85 })

      // Evaluate multiple batches concurrently
      const results = await Promise.all([
        Promise.resolve(engine.selectHotToWarmBatch(items.slice(0, 50), tierUsage)),
        Promise.resolve(engine.selectHotToWarmBatch(items.slice(50), tierUsage)),
      ])

      // Both should complete without error
      expect(results).toHaveLength(2)
      expect(results[0].items).toBeDefined()
      expect(results[1].items).toBeDefined()
    })
  })
})

// ============================================================================
// Type Definitions Tests
// ============================================================================

describe('Type Definitions', () => {
  it('should properly type StorageTier', () => {
    const hotTier: StorageTier = 'hot'
    const warmTier: StorageTier = 'warm'
    const coldTier: StorageTier = 'cold'

    expect(hotTier).toBe('hot')
    expect(warmTier).toBe('warm')
    expect(coldTier).toBe('cold')
  })

  it('should properly type MigrationPolicy interface', () => {
    const policy: MigrationPolicy = {
      hotToWarm: {
        maxAge: 86400000,
        minAccessCount: 5,
        maxHotSizePercent: 80,
      },
      warmToCold: {
        maxAge: 604800000,
        minPartitionSize: 1048576,
      },
    }

    expect(policy.hotToWarm.maxAge).toBe(86400000)
    expect(policy.warmToCold.minPartitionSize).toBe(1048576)
  })

  it('should properly type MigrationDecision', () => {
    const decision: MigrationDecision = {
      shouldMigrate: true,
      reason: 'TTL exceeded',
      targetTier: 'warm',
      priority: 'ttl',
      isEmergency: false,
    }

    expect(decision.shouldMigrate).toBe(true)
    expect(decision.targetTier).toBe('warm')
  })

  it('should properly type MigrationCandidate', () => {
    const candidate: MigrationCandidate = {
      itemId: 'item-123',
      sourceTier: 'hot',
      targetTier: 'warm',
      createdAt: Date.now(),
      estimatedBytes: 1024,
      priority: 1,
    }

    expect(candidate.itemId).toBe('item-123')
    expect(candidate.sourceTier).toBe('hot')
    expect(candidate.targetTier).toBe('warm')
  })

  it('should properly type TierUsage', () => {
    const usage: TierUsage = {
      tier: 'hot',
      itemCount: 100,
      totalBytes: 1048576,
      maxBytes: 10485760,
      percentFull: 10,
    }

    expect(usage.tier).toBe('hot')
    expect(usage.percentFull).toBe(10)
  })

  it('should properly type AccessStats', () => {
    const stats: AccessStats = {
      itemId: 'item-123',
      totalAccesses: 100,
      recentAccesses: 10,
      lastAccessedAt: Date.now(),
      accessWindow: 3600000,
    }

    expect(stats.recentAccesses).toBe(10)
    expect(stats.accessWindow).toBe(3600000)
  })
})
