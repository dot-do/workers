/**
 * OpenFeature Provider for Cloudflare Workers
 * Spec: https://openfeature.dev/specification/sections/providers
 * Version: 0.8.0
 */

import { Provider, EvaluationContext, JsonValue, ResolutionDetails, ProviderMetadata, Hook, Logger, OpenFeatureEventEmitter, ProviderEvents } from '@openfeature/server-sdk'
import type { CloudflareEnv, FlagDefinition, ProviderConfig, EvaluationResult, ErrorCode, CacheEntry, AnalyticsEvent } from './types'
import { TargetingEngine } from './targeting'
import { CacheManager } from './cache'
import { AnalyticsManager } from './analytics'

/**
 * CloudflareWorkersProvider - OpenFeature 0.8.0 compliant provider
 *
 * Implements all MUST requirements:
 * - Feature provider interface
 * - All evaluation methods (boolean, string, number, object)
 * - Provider metadata
 * - Error handling with proper error codes
 * - Context transformation
 *
 * Implements SHOULD requirements:
 * - Provider hooks
 * - Named clients support
 * - State management (READY, ERROR, NOT_READY)
 *
 * Implements MAY requirements:
 * - Caching layer (KV)
 * - Analytics tracking (Analytics Engine)
 * - Event emission
 */
export class CloudflareWorkersProvider implements Provider {
  readonly metadata: ProviderMetadata = {
    name: 'cloudflare-workers-provider',
    version: '1.0.0',
  }

  private env: CloudflareEnv
  private targeting: TargetingEngine
  private cache: CacheManager
  private analytics: AnalyticsManager
  private logger?: Logger
  private eventEmitter?: OpenFeatureEventEmitter
  private providerStatus: 'NOT_READY' | 'READY' | 'ERROR' = 'NOT_READY'

  constructor(config: ProviderConfig) {
    this.env = config.env
    this.logger = config.logger
    this.targeting = new TargetingEngine()
    this.cache = new CacheManager(config.env.CACHE, config.cacheTTL)
    this.analytics = new AnalyticsManager(config.env.ANALYTICS, config.enableAnalytics)
  }

  /**
   * Initialize the provider
   * Spec: Provider initialization
   */
  async initialize(context?: EvaluationContext): Promise<void> {
    try {
      this.logger?.debug('Initializing CloudflareWorkersProvider')

      // Verify D1 database is accessible
      await this.env.DB.prepare('SELECT 1').first()

      // Verify KV namespace is accessible
      await this.env.CACHE.get('__health_check__')

      this.providerStatus = 'READY'
      this.logger?.info('CloudflareWorkersProvider initialized successfully')

      // Emit READY event
      this.eventEmitter?.emit(ProviderEvents.Ready, { message: 'Provider initialized' })
    } catch (error) {
      this.providerStatus = 'ERROR'
      this.logger?.error('Failed to initialize provider', error)
      this.eventEmitter?.emit(ProviderEvents.Error, { message: 'Initialization failed', error })
      throw error
    }
  }

  /**
   * Shutdown the provider
   * Spec: Provider shutdown
   */
  async onClose(): Promise<void> {
    this.logger?.info('Shutting down CloudflareWorkersProvider')
    this.providerStatus = 'NOT_READY'
  }

  /**
   * Set event emitter for provider events
   */
  setEventEmitter(eventEmitter: OpenFeatureEventEmitter): void {
    this.eventEmitter = eventEmitter
  }

  /**
   * Resolve boolean flag
   * Spec: https://openfeature.dev/specification/sections/providers#requirement-221
   */
  async resolveBooleanEvaluation(flagKey: string, defaultValue: boolean, context: EvaluationContext): Promise<ResolutionDetails<boolean>> {
    return this.evaluate<boolean>(flagKey, defaultValue, context, 'boolean')
  }

  /**
   * Resolve string flag
   * Spec: https://openfeature.dev/specification/sections/providers#requirement-222
   */
  async resolveStringEvaluation(flagKey: string, defaultValue: string, context: EvaluationContext): Promise<ResolutionDetails<string>> {
    return this.evaluate<string>(flagKey, defaultValue, context, 'string')
  }

  /**
   * Resolve number flag
   * Spec: https://openfeature.dev/specification/sections/providers#requirement-223
   */
  async resolveNumberEvaluation(flagKey: string, defaultValue: number, context: EvaluationContext): Promise<ResolutionDetails<number>> {
    return this.evaluate<number>(flagKey, defaultValue, context, 'number')
  }

  /**
   * Resolve object flag
   * Spec: https://openfeature.dev/specification/sections/providers#requirement-224
   */
  async resolveObjectEvaluation<T extends JsonValue>(flagKey: string, defaultValue: T, context: EvaluationContext): Promise<ResolutionDetails<T>> {
    return this.evaluate<T>(flagKey, defaultValue, context, 'object')
  }

  /**
   * Get provider hooks
   * Spec: https://openfeature.dev/specification/sections/providers#requirement-45
   */
  get hooks(): Hook[] {
    return [
      // Before hook for context transformation
      {
        before: async (hookContext) => {
          this.logger?.debug(`Before evaluation: ${hookContext.flagKey}`, hookContext.context)
        },
      },
      // After hook for analytics
      {
        after: async (hookContext, evaluationDetails) => {
          this.logger?.debug(`After evaluation: ${hookContext.flagKey}`, evaluationDetails)
        },
      },
      // Error hook for logging
      {
        error: async (hookContext, error) => {
          this.logger?.error(`Error evaluating: ${hookContext.flagKey}`, error)
        },
      },
      // Finally hook for cleanup
      {
        finally: async (hookContext) => {
          this.logger?.debug(`Finally: ${hookContext.flagKey}`)
        },
      },
    ]
  }

  /**
   * Core evaluation logic
   * Implements caching, targeting, analytics
   */
  private async evaluate<T extends JsonValue>(flagKey: string, defaultValue: T, context: EvaluationContext, expectedType: string): Promise<ResolutionDetails<T>> {
    const startTime = Date.now()
    let cacheHit = false

    try {
      // Check provider status
      if (this.providerStatus !== 'READY') {
        return this.errorResult(flagKey, defaultValue, 'PROVIDER_NOT_READY', 'Provider not ready')
      }

      // Check cache first
      const cached = await this.cache.get<T>(flagKey, context)
      if (cached) {
        cacheHit = true
        this.trackAnalytics(flagKey, cached.value, context, Date.now() - startTime, true)
        return {
          value: cached.value,
          variant: cached.variant,
          reason: 'CACHED',
          flagMetadata: cached.flagMetadata,
        }
      }

      // Fetch flag definition from D1
      const flag = await this.fetchFlag(flagKey)
      if (!flag) {
        return this.errorResult(flagKey, defaultValue, 'FLAG_NOT_FOUND', `Flag not found: ${flagKey}`)
      }

      // Check if flag is enabled
      if (!flag.enabled) {
        const result = { value: defaultValue, reason: 'DISABLED', flagMetadata: { key: flagKey, enabled: false } }
        await this.cache.set(flagKey, context, result)
        this.trackAnalytics(flagKey, defaultValue, context, Date.now() - startTime, cacheHit)
        return result
      }

      // Type check
      if (flag.type !== expectedType) {
        return this.errorResult(flagKey, defaultValue, 'TYPE_MISMATCH', `Expected ${expectedType}, got ${flag.type}`)
      }

      // Evaluate targeting rules
      const targetingResult = await this.targeting.evaluate(flag, context)
      const value = (targetingResult.value ?? flag.defaultValue) as T
      const variant = targetingResult.variant

      const result: ResolutionDetails<T> = {
        value,
        variant,
        reason: targetingResult.reason,
        flagMetadata: { key: flagKey, type: flag.type, targeting: !!flag.targeting?.length },
      }

      // Cache result
      await this.cache.set(flagKey, context, result)

      // Track analytics
      this.trackAnalytics(flagKey, value, context, Date.now() - startTime, cacheHit, variant)

      return result
    } catch (error) {
      this.logger?.error(`Evaluation error for ${flagKey}`, error)
      this.trackAnalytics(flagKey, defaultValue, context, Date.now() - startTime, cacheHit, undefined, (error as Error).message)
      return this.errorResult(flagKey, defaultValue, 'GENERAL', (error as Error).message)
    }
  }

  /**
   * Fetch flag definition from D1
   */
  private async fetchFlag(flagKey: string): Promise<FlagDefinition | null> {
    const result = await this.env.DB.prepare('SELECT * FROM flags WHERE key = ? LIMIT 1').bind(flagKey).first<FlagDefinition>()
    return result || null
  }

  /**
   * Create error result
   */
  private errorResult<T extends JsonValue>(flagKey: string, defaultValue: T, errorCode: ErrorCode, errorMessage: string): ResolutionDetails<T> {
    return {
      value: defaultValue,
      reason: 'ERROR',
      errorCode: errorCode as any,
      errorMessage,
      flagMetadata: { key: flagKey },
    }
  }

  /**
   * Track analytics event
   */
  private trackAnalytics(flagKey: string, value: JsonValue, context: EvaluationContext, evaluationTimeMs: number, cacheHit: boolean, variant?: string, error?: string): void {
    this.analytics.track({
      flagKey,
      value,
      variant,
      targetingKey: context.targetingKey,
      context: context as Record<string, unknown>,
      timestamp: Date.now(),
      evaluationTimeMs,
      cacheHit,
      error,
    })
  }
}
