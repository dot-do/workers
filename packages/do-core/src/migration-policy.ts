/**
 * Migration Policy Engine - Type Definitions and Stubs
 *
 * This file defines the types and interfaces for the migration policy engine.
 * Implementation is pending (RED phase - tests written first).
 *
 * The Migration Policy Engine manages tiered storage migration:
 * - hot tier: Active data in Durable Object SQLite
 * - warm tier: Less frequently accessed data
 * - cold tier: Archive/R2 storage
 *
 * @module migration-policy
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Storage tier levels
 */
export type StorageTier = 'hot' | 'warm' | 'cold'

/**
 * Migration priority types
 */
export type MigrationPriority = 'access-frequency' | 'ttl' | 'size-pressure' | 'emergency' | 'retention'

/**
 * Policy for hot to warm tier migration
 */
export interface HotToWarmPolicy {
  /** Maximum age in milliseconds before item is eligible for migration */
  maxAge: number
  /** Minimum access count in window to keep item hot */
  minAccessCount: number
  /** Percentage threshold for hot tier size to trigger migration */
  maxHotSizePercent: number
  /** Optional: Time window for access counting */
  accessWindow?: number
}

/**
 * Policy for warm to cold tier migration
 */
export interface WarmToColdPolicy {
  /** Maximum age in milliseconds in warm tier before cold migration */
  maxAge: number
  /** Minimum batch size in bytes for cold migration */
  minPartitionSize: number
  /** Optional: Retention period before deletion */
  retentionPeriod?: number
}

/**
 * Batch size configuration
 */
export interface BatchSizeConfig {
  /** Minimum number of items per batch */
  min: number
  /** Maximum number of items per batch */
  max: number
  /** Target batch size in bytes */
  targetBytes: number
}

/**
 * Base migration policy interface
 */
export interface MigrationPolicy {
  hotToWarm: HotToWarmPolicy
  warmToCold: WarmToColdPolicy
}

/**
 * Full migration policy configuration
 */
export interface MigrationPolicyConfig extends MigrationPolicy {
  batchSize?: BatchSizeConfig
}

/**
 * Decision result from policy evaluation
 */
export interface MigrationDecision {
  /** Whether the item should be migrated */
  shouldMigrate: boolean
  /** Human-readable reason for the decision */
  reason: string
  /** Target tier if migration is recommended */
  targetTier?: StorageTier
  /** Priority rule that made the decision */
  priority?: MigrationPriority
  /** Whether this is an emergency migration */
  isEmergency?: boolean
}

/**
 * Candidate item for migration
 */
export interface MigrationCandidate {
  /** Unique identifier of the item */
  itemId: string
  /** Current storage tier */
  sourceTier: StorageTier
  /** Target storage tier */
  targetTier: StorageTier
  /** Timestamp when candidate was created */
  createdAt: number
  /** Estimated size in bytes */
  estimatedBytes: number
  /** Priority score (lower = higher priority) */
  priority?: number
}

/**
 * Usage statistics for a storage tier
 */
export interface TierUsage {
  /** Storage tier */
  tier: StorageTier
  /** Number of items in tier */
  itemCount: number
  /** Total bytes used */
  totalBytes: number
  /** Maximum capacity in bytes */
  maxBytes: number
  /** Percentage of capacity used */
  percentFull: number
}

/**
 * Access statistics for an item
 */
export interface AccessStats {
  /** Item identifier */
  itemId: string
  /** Total access count */
  totalAccesses: number
  /** Accesses within the recent window */
  recentAccesses: number
  /** Timestamp of last access */
  lastAccessedAt: number
  /** Window size in milliseconds */
  accessWindow: number
}

/**
 * Batch selection result
 */
export interface BatchSelection<T = unknown> {
  /** Selected items for the batch */
  items: T[]
  /** Total size of batch in bytes */
  totalBytes: number
  /** Whether to proceed with migration */
  shouldProceed: boolean
  /** Reason for the decision */
  reason: string
  /** Timestamp when migration started */
  startedAt?: number
  /** Timestamp when migration completed */
  completedAt?: number
}

/**
 * Migration statistics
 */
export interface MigrationStatistics {
  /** Total migrations evaluated */
  totalMigrationsEvaluated: number
  /** Total bytes migrated */
  totalBytesMigrated: number
  /** Timestamp of last migration */
  lastMigrationAt: number | null
  /** Average migration time in milliseconds */
  averageMigrationTimeMs: number
}

// ============================================================================
// Migration Policy Engine - Stub Implementation
// ============================================================================

/**
 * Migration Policy Engine
 *
 * Evaluates migration policies and selects candidates for tier migration.
 * This is the RED phase stub - implementation pending.
 */
export class MigrationPolicyEngine {
  private config: MigrationPolicyConfig
  private statistics: MigrationStatistics = {
    totalMigrationsEvaluated: 0,
    totalBytesMigrated: 0,
    lastMigrationAt: null,
    averageMigrationTimeMs: 0,
  }
  private migrationTimes: number[] = []

  constructor(policy: MigrationPolicyConfig) {
    this.validatePolicy(policy)
    this.config = {
      ...policy,
      batchSize: policy.batchSize ?? {
        min: 10,
        max: 1000,
        targetBytes: 10 * 1024 * 1024,
      },
    }
  }

  /**
   * Validate policy configuration
   */
  private validatePolicy(policy: MigrationPolicyConfig): void {
    if (policy.hotToWarm.maxAge <= 0) {
      throw new Error('maxAge must be positive')
    }
    if (policy.hotToWarm.maxHotSizePercent < 0 || policy.hotToWarm.maxHotSizePercent > 100) {
      throw new Error('maxHotSizePercent must be between 0 and 100')
    }
  }

  /**
   * Evaluate if an item should migrate from hot to warm tier
   */
  evaluateHotToWarm(
    item: { id: string; createdAt: number; lastAccessedAt: number; accessCount: number; tier: string },
    tierUsage: TierUsage,
    accessStats?: AccessStats
  ): MigrationDecision {
    const now = Date.now()
    const itemAge = now - item.createdAt
    const policy = this.config.hotToWarm

    // Check for emergency migration (highest priority check for extreme pressure)
    if (tierUsage.percentFull >= 99) {
      return {
        shouldMigrate: true,
        reason: 'emergency: tier at critical capacity',
        targetTier: 'warm',
        priority: 'emergency',
        isEmergency: true,
      }
    }

    // Check access frequency (high priority) - frequently accessed items stay hot
    const recentAccesses = accessStats?.recentAccesses ?? 0
    if (recentAccesses >= policy.minAccessCount) {
      return {
        shouldMigrate: false,
        reason: 'frequently accessed in recent window',
        priority: 'access-frequency',
        isEmergency: false,
      }
    }

    // Check TTL expiration
    if (itemAge > policy.maxAge) {
      return {
        shouldMigrate: true,
        reason: 'TTL exceeded',
        targetTier: 'warm',
        priority: 'ttl',
        isEmergency: false,
      }
    }

    // Check size pressure threshold
    if (tierUsage.percentFull > policy.maxHotSizePercent) {
      return {
        shouldMigrate: true,
        reason: 'hot tier size threshold exceeded',
        targetTier: 'warm',
        priority: 'size-pressure',
        isEmergency: false,
      }
    }

    // Item is below TTL and tier has space
    return {
      shouldMigrate: false,
      reason: 'below TTL and tier has capacity',
      priority: 'ttl',
      isEmergency: false,
    }
  }

  /**
   * Evaluate if an item should migrate from warm to cold tier
   */
  evaluateWarmToCold(
    item: { id: string; createdAt: number; tier: string }
  ): MigrationDecision {
    const now = Date.now()
    const itemAge = now - item.createdAt
    const policy = this.config.warmToCold

    // Check if item has exceeded the warm tier retention period
    if (itemAge > policy.maxAge) {
      return {
        shouldMigrate: true,
        reason: 'retention period exceeded',
        targetTier: 'cold',
        priority: 'retention',
        isEmergency: false,
      }
    }

    return {
      shouldMigrate: false,
      reason: 'within retention period',
      priority: 'retention',
      isEmergency: false,
    }
  }

  /**
   * Select a batch of items for hot to warm migration
   */
  selectHotToWarmBatch<T extends { id: string; sizeBytes: number; createdAt: number; accessCount: number }>(
    items: T[],
    tierUsage: TierUsage
  ): BatchSelection<T> {
    const batchConfig = this.config.batchSize!

    // Handle empty item list
    if (items.length === 0) {
      return {
        items: [],
        totalBytes: 0,
        shouldProceed: false,
        reason: 'no items to migrate',
      }
    }

    // Prioritize items for migration (older and less accessed first)
    const prioritized = this.prioritizeCandidates(items, tierUsage)

    // Determine if we're under pressure (should migrate even small batches)
    const underPressure = tierUsage.percentFull > this.config.hotToWarm.maxHotSizePercent

    // If not under pressure and below minimum batch count, don't proceed
    if (!underPressure && items.length < batchConfig.min) {
      return {
        items: [],
        totalBytes: 0,
        shouldProceed: false,
        reason: 'below minimum batch count',
      }
    }

    // Select items up to batch limits
    const selectedItems: T[] = []
    let totalBytes = 0

    for (const item of prioritized) {
      // Check batch count limit
      if (selectedItems.length >= batchConfig.max) {
        break
      }

      // Check if adding this item would exceed target bytes by too much
      if (totalBytes > 0 && totalBytes + item.sizeBytes > batchConfig.targetBytes * 1.2) {
        break
      }

      selectedItems.push(item)
      totalBytes += item.sizeBytes
    }

    // Check if we have enough items
    if (!underPressure && selectedItems.length < batchConfig.min) {
      return {
        items: [],
        totalBytes: 0,
        shouldProceed: false,
        reason: 'below minimum batch count',
      }
    }

    return {
      items: selectedItems,
      totalBytes,
      shouldProceed: selectedItems.length > 0,
      reason: selectedItems.length > 0 ? 'batch ready for migration' : 'no eligible items',
    }
  }

  /**
   * Select a batch of items for warm to cold migration
   */
  selectWarmToColdBatch<T extends { id: string; sizeBytes: number }>(
    items: T[]
  ): BatchSelection<T> {
    const policy = this.config.warmToCold

    // Calculate total size
    const totalBytes = items.reduce((sum, item) => sum + item.sizeBytes, 0)

    // Check if batch meets minimum partition size
    if (totalBytes < policy.minPartitionSize) {
      return {
        items,
        totalBytes,
        shouldProceed: false,
        reason: 'below minimum partition size',
      }
    }

    return {
      items,
      totalBytes,
      shouldProceed: true,
      reason: 'batch meets minimum partition size',
    }
  }

  /**
   * Create a migration candidate from an item
   */
  createCandidate(
    item: { id: string; sizeBytes: number },
    sourceTier: StorageTier,
    targetTier: StorageTier
  ): MigrationCandidate {
    return {
      itemId: item.id,
      sourceTier,
      targetTier,
      createdAt: Date.now(),
      estimatedBytes: item.sizeBytes,
    }
  }

  /**
   * Prioritize migration candidates
   *
   * Priority is based on: older items and less accessed items first.
   * Score = age (ms) - (accessCount * weight)
   * Higher score = higher priority for migration
   */
  prioritizeCandidates<T extends { id: string; createdAt: number; accessCount: number }>(
    items: T[],
    _tierUsage: TierUsage
  ): T[] {
    const now = Date.now()
    const accessWeight = 60 * 60 * 1000 // 1 hour per access

    return [...items].sort((a, b) => {
      const ageA = now - a.createdAt
      const ageB = now - b.createdAt
      const scoreA = ageA - (a.accessCount * accessWeight)
      const scoreB = ageB - (b.accessCount * accessWeight)
      // Higher score = higher priority (should migrate first)
      return scoreB - scoreA
    })
  }

  /**
   * Record a migration for statistics
   */
  recordMigration(batch: BatchSelection): void {
    this.statistics.totalMigrationsEvaluated++
    this.statistics.totalBytesMigrated += batch.totalBytes
    this.statistics.lastMigrationAt = Date.now()

    if (batch.startedAt && batch.completedAt) {
      const duration = batch.completedAt - batch.startedAt
      this.migrationTimes.push(duration)
      this.statistics.averageMigrationTimeMs =
        this.migrationTimes.reduce((a, b) => a + b, 0) / this.migrationTimes.length
    }
  }

  /**
   * Get migration statistics
   */
  getStatistics(): MigrationStatistics {
    return { ...this.statistics }
  }

  /**
   * Update policy configuration
   */
  updatePolicy(updates: Partial<MigrationPolicyConfig>): void {
    if (updates.hotToWarm) {
      this.config.hotToWarm = { ...this.config.hotToWarm, ...updates.hotToWarm }
    }
    if (updates.warmToCold) {
      this.config.warmToCold = { ...this.config.warmToCold, ...updates.warmToCold }
    }
    if (updates.batchSize) {
      this.config.batchSize = { ...this.config.batchSize, ...updates.batchSize }
    }
  }

  /**
   * Get current policy configuration
   */
  getPolicy(): MigrationPolicyConfig {
    return { ...this.config }
  }
}
