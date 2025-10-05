/**
 * OpenFeature Provider for Cloudflare Workers
 * Main package export
 */

// Core provider
export { CloudflareWorkersProvider } from './provider/CloudflareWorkersProvider'
export { TargetingEngine } from './provider/targeting'
export { CacheManager } from './provider/cache'
export { AnalyticsManager } from './provider/analytics'

// Types
export type {
  CloudflareEnv,
  FlagDefinition,
  FlagVariant,
  TargetingRule,
  TargetingCondition,
  CacheEntry,
  AnalyticsEvent,
  ProviderConfig,
  EvaluationResult,
} from './provider/types'

// Re-export OpenFeature types for convenience
export type { EvaluationContext, JsonValue, Logger, Hook, ProviderMetadata } from '@openfeature/server-sdk'
