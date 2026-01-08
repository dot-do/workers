/**
 * Cascade Queue Worker - Entry Point
 *
 * Exports the Cascade Queue Durable Object and related types for
 * processing soft/eventual cascade operations (~> and <~).
 *
 * @module @dotdo/cascade
 */

// Re-export everything from cascade module
export {
  // Types
  type CascadeOperator,
  type CascadeAction,
  type CascadeStatus,
  type CascadePriority,
  type CascadeOperation,
  type CascadeMetadata,
  type RetryInfo,
  type CascadeTimestamps,
  type CascadeQueueConfig,
  type RetryPolicy,
  type DeadLetterConfig,
  type CascadeStats,
  type EnqueueOptions,
  type ProcessResult,
  type CascadeQueueEnv,

  // Errors
  CascadeError,
  TargetNotFoundError,
  CascadeTimeoutError,
  CascadeRejectedError,

  // Configuration
  DEFAULT_CASCADE_CONFIG,
  INITIAL_STATS,

  // Utilities
  generateOperationId,
  generateCorrelationId,
  calculateBackoff,
  createRelationshipKey,

  // Durable Object
  CascadeQueueDO,
} from './cascade.js'

// Default export is the worker
export { default } from './cascade.js'
