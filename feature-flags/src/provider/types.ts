/**
 * OpenFeature Provider Types for Cloudflare Workers
 * Spec: https://openfeature.dev/specification/sections/providers
 */

import type { EvaluationContext, JsonValue, Logger, ResolutionDetails } from '@openfeature/server-sdk'

/**
 * Cloudflare environment bindings
 */
export interface CloudflareEnv {
  DB: D1Database
  CACHE: KVNamespace
  ANALYTICS?: AnalyticsEngineDataset
  ENVIRONMENT?: string
  CACHE_TTL_SECONDS?: string
  ENABLE_ANALYTICS?: string
}

/**
 * Flag metadata stored in D1
 */
export interface FlagDefinition {
  key: string
  type: 'boolean' | 'string' | 'number' | 'object'
  defaultValue: JsonValue
  enabled: boolean
  targeting?: TargetingRule[]
  variants?: FlagVariant[]
  createdAt: string
  updatedAt: string
  description?: string
  tags?: string[]
}

/**
 * Flag variant for A/B testing
 */
export interface FlagVariant {
  name: string
  value: JsonValue
  weight: number
  description?: string
}

/**
 * Targeting rule for context-based evaluation
 */
export interface TargetingRule {
  id: string
  conditions: TargetingCondition[]
  variant?: string
  value?: JsonValue
  enabled: boolean
}

/**
 * Targeting condition
 */
export interface TargetingCondition {
  property: string
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'in' | 'notIn' | 'greaterThan' | 'lessThan' | 'matches'
  value: JsonValue
}

/**
 * Cache entry for flag evaluation
 */
export interface CacheEntry {
  value: JsonValue
  variant?: string
  reason: string
  flagMetadata?: Record<string, unknown>
  cachedAt: number
  ttl: number
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  flagKey: string
  value: JsonValue
  variant?: string
  targetingKey?: string
  context: Record<string, unknown>
  timestamp: number
  evaluationTimeMs: number
  cacheHit: boolean
  error?: string
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  env: CloudflareEnv
  cacheTTL?: number
  enableAnalytics?: boolean
  logger?: Logger
}

/**
 * OpenFeature error codes
 * Spec: https://openfeature.dev/specification/types#error-code
 */
export enum ErrorCode {
  PROVIDER_NOT_READY = 'PROVIDER_NOT_READY',
  FLAG_NOT_FOUND = 'FLAG_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  TARGETING_KEY_MISSING = 'TARGETING_KEY_MISSING',
  INVALID_CONTEXT = 'INVALID_CONTEXT',
  GENERAL = 'GENERAL',
}

/**
 * Evaluation result with resolution details
 */
export interface EvaluationResult<T extends JsonValue> extends ResolutionDetails<T> {
  value: T
  variant?: string
  reason: string
  flagMetadata?: Record<string, unknown>
  errorCode?: ErrorCode
  errorMessage?: string
}
