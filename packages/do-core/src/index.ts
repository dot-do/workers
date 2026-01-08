/**
 * @dotdo/do - Slim Durable Object Core
 *
 * A minimal Durable Object implementation providing:
 * - Minimal DO interface contract (fetch, constructor)
 * - State persistence (KV-style storage)
 * - Alarm handling (scheduled wake-ups)
 * - WebSocket hibernation (cost-effective long-lived connections)
 * - Lazy schema initialization (performance optimization)
 * - Repository pattern for consistent data access
 *
 * Target: ~500-800 lines of core code
 *
 * This module is the RED phase - tests define the contract,
 * implementation comes in GREEN phase.
 */

// Re-export core types and DOCore class (no dependencies)
export * from './core.js'

// Import CDC mixin for side effects (augments DOCore prototype with CDC methods)
// This MUST be imported before any DOCore usage to ensure prototype is augmented
import './cdc-mixin.js'

// Re-export CDC Pipeline (optimized change data capture)
export * from './cdc-pipeline.js'

// Re-export CDC Watermark Manager (checkpoint tracking)
export * from './cdc-watermark-manager.js'

// Re-export CDC Mixin (adds CDC methods to DOCore)
export * from './cdc-mixin.js'

// Re-export schema module (depends on core types)
export * from './schema.js'

// Re-export agent module (depends on core)
export * from './agent.js'

// Re-export MCP error types
export * from './mcp-error.js'

// Re-export CRUD mixin (depends on core)
export * from './crud-mixin.js'

// Re-export Actions mixin (depends on core)
export * from './actions-mixin.js'

// Re-export Events mixin (depends on core)
export * from './events.js'

// Re-export Things mixin (depends on core)
export * from './things-mixin.js'

// Re-export Event mixin (event sourcing, depends on core)
export * from './event-mixin.js'

// Re-export EventStore (stream-based event sourcing repository)
export * from './event-store.js'

// Re-export Repository pattern (base classes and interfaces)
export * from './repository.js'

// Re-export EventsRepository (depends on repository)
export * from './events-repository.js'

// Re-export ThingsRepository (depends on repository)
export * from './things-repository.js'

// Re-export ErrorBoundary (no dependencies)
export * from './error-boundary.js'

// Re-export Projections (CQRS read models, depends on events)
export * from './projections.js'

// Re-export MRL (Matryoshka Representation Learning) utilities
export * from './mrl.js'

// Re-export Cold Vector Search (R2 Parquet partition search)
export * from './cold-vector-search.js'

// Re-export Two-Phase Search (MRL hot/cold vector search)
export * from './two-phase-search.js'

// Re-export ParquetSerializer (Parquet-compatible binary serialization)
export * from './parquet-serializer.js'

// Re-export TierIndex (lakehouse tier tracking)
export * from './tier-index.js'

// Re-export MigrationPolicy (tiered storage migration policies)
// Note: StorageTier is already exported from tier-index.js
export {
  type MigrationPriority,
  type HotToWarmPolicy,
  type WarmToColdPolicy,
  type BatchSizeConfig,
  type MigrationPolicy,
  type MigrationPolicyConfig,
  type MigrationDecision,
  type MigrationCandidate,
  type TierUsage,
  type AccessStats,
  type BatchSelection,
  type MigrationStatistics,
  MigrationPolicyEngine,
} from './migration-policy.js'

// Re-export ClusterManager (K-means cluster assignment for R2 partitioning)
export * from './cluster-manager.js'

// Re-export Saga Pattern (cross-DO transaction support)
export * from './saga.js'

// Re-export Schema Migration System (DO storage schema evolution)
// Note: Full migrations API available via '@dotdo/do/migrations' for tree-shaking
export {
  // Core types
  type Migration,
  type MigrationContext,
  type MigrationRecord,
  type MigrationResult,
  type MigrationRunResult,
  type MigrationStatus,
  type MigrationConfig,
  type MigrationDefinition,
  type RegisteredMigrations,
  type SchemaDrift,
  // Error types
  MigrationError,
  MigrationInProgressError,
  InvalidMigrationVersionError,
  SchemaDriftError,
  MigrationSqlError,
  MigrationTimeoutError,
  DEFAULT_MIGRATION_CONFIG,
  // Registry functions
  registerMigrations,
  getMigrations,
  getRegisteredTypes,
  hasMigrations,
  getLatestVersion,
  getPendingMigrations,
  clearRegistry,
  // Mixin and base classes
  MigrationMixin,
  MigratableDO,
  defineMigrations,
  isMigratableType,
  RequiresMigration,
  type MigrationProvider,
  // Runner
  MigrationRunner,
  createMigrationRunner,
  type MigrationRunnerOptions,
  // Schema hash utilities
  extractSchema,
  computeSchemaHash,
  computeSchemaHashFromStorage,
  computeMigrationChecksum,
  schemasMatch,
  describeSchemaChanges,
  type SchemaInfo,
  type TableInfo,
  type ColumnInfo,
  type IndexInfo,
  type TriggerInfo,
} from './migrations/index.js'
