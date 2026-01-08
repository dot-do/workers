/**
 * models.do - Pick the right model. Every time.
 *
 * Complete LLM model catalog with real-time pricing,
 * performance benchmarks, and capability comparisons.
 *
 * @see https://models.do
 *
 * @example
 * ```typescript
 * import models from 'models.do'
 *
 * // Tagged template - describe what you need
 * const model = await models.do`
 *   I need a model for code generation that's fast and affordable
 * `
 *
 * // Browse all models
 * const all = await models.list()
 *
 * // Compare specific models
 * const comparison = await models.compare(['gpt-4o', 'claude-3-opus', 'gemini-1.5-pro'])
 *
 * // Get pricing for a model
 * const pricing = await models.pricing('claude-3-5-sonnet')
 *
 * // Find the best model for your use case
 * const recommended = await models.recommend({
 *   task: 'code-generation',
 *   budget: 'medium',
 *   latency: 'low'
 * })
 *
 * // Compare by specific criteria
 * const priceComparison = await models.compareByPrice(
 *   ['gpt-4o', 'claude-3-5-sonnet'],
 *   { monthlyTokens: { input: 10_000_000, output: 5_000_000 } }
 * )
 *
 * const perfComparison = await models.compareByPerformance(
 *   ['gpt-4o', 'claude-3-5-sonnet'],
 *   { criteria: 'latency' }
 * )
 *
 * const capComparison = await models.compareByCapability(
 *   ['gpt-4o', 'claude-3-5-sonnet'],
 *   { capabilities: ['function-calling', 'vision'] }
 * )
 *
 * const benchComparison = await models.compareByBenchmark(
 *   ['gpt-4o', 'claude-3-5-sonnet'],
 *   { benchmarks: ['MMLU', 'HumanEval'] }
 * )
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Provider types
export type Provider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'meta'
  | 'cohere'
  | 'amazon'
  | 'deepseek'
  | 'groq'
  | 'together'
  | 'fireworks'
  | 'perplexity'
  | 'xai'

export type ModelCategory =
  | 'flagship'
  | 'fast'
  | 'vision'
  | 'code'
  | 'embedding'
  | 'reasoning'
  | 'multimodal'
  | 'open-source'

export type TaskType =
  | 'code-generation'
  | 'code-review'
  | 'chat'
  | 'summarization'
  | 'translation'
  | 'analysis'
  | 'creative-writing'
  | 'data-extraction'
  | 'embedding'
  | 'reasoning'
  | 'function-calling'
  | 'vision'
  | 'audio'

// Core types
export interface Pricing {
  /** Input tokens cost per 1M tokens in USD */
  inputPerMillion: number
  /** Output tokens cost per 1M tokens in USD */
  outputPerMillion: number
  /** Cached input tokens cost per 1M tokens (if supported) */
  cachedInputPerMillion?: number
  /** Batch input discount per 1M tokens (if supported) */
  batchInputPerMillion?: number
  /** Batch output discount per 1M tokens (if supported) */
  batchOutputPerMillion?: number
  /** Currency (default: USD) */
  currency: string
  /** Pricing effective date */
  effectiveDate: Date
  /** Free tier tokens per month (if any) */
  freeTier?: number
}

export interface Benchmark {
  name: string
  score: number
  maxScore?: number
  percentile?: number
  source: string
  date: Date
}

export interface PerformanceMetrics {
  /** Time to first token in milliseconds */
  timeToFirstToken: number
  /** Tokens per second output */
  tokensPerSecond: number
  /** Average latency in milliseconds */
  averageLatency: number
  /** P95 latency in milliseconds */
  p95Latency: number
  /** Uptime percentage */
  uptime: number
  /** Last measured */
  measuredAt: Date
}

export interface Capability {
  /** Capability name */
  name: string
  /** Whether supported */
  supported: boolean
  /** Quality rating 1-5 */
  quality?: number
  /** Additional notes */
  notes?: string
}

export interface ContextWindow {
  /** Maximum input tokens */
  maxInput: number
  /** Maximum output tokens */
  maxOutput: number
  /** Total context window */
  total: number
  /** Extended context available (if any) */
  extended?: number
}

export interface Model {
  /** Unique model identifier (e.g., 'gpt-4o', 'claude-3-opus') */
  id: string
  /** Display name */
  name: string
  /** Provider */
  provider: Provider
  /** Model categories */
  categories: ModelCategory[]
  /** Description */
  description?: string
  /** Version */
  version?: string
  /** Release date */
  releaseDate?: Date
  /** Whether deprecated */
  deprecated: boolean
  /** Deprecation date (if deprecated) */
  deprecationDate?: Date
  /** Successor model (if deprecated) */
  successor?: string
  /** Context window details */
  contextWindow: ContextWindow
  /** Pricing information */
  pricing: Pricing
  /** Performance metrics */
  performance?: PerformanceMetrics
  /** Benchmark results */
  benchmarks: Benchmark[]
  /** Capabilities */
  capabilities: Capability[]
  /** Supported modalities */
  modalities: {
    text: boolean
    image: boolean
    audio: boolean
    video: boolean
  }
  /** Knowledge cutoff date */
  knowledgeCutoff?: Date
  /** Fine-tuning available */
  fineTuningAvailable: boolean
  /** API availability */
  availability: 'ga' | 'beta' | 'preview' | 'deprecated'
  /** Tags for search */
  tags: string[]
}

export interface Usage {
  /** Model ID */
  modelId: string
  /** Time period */
  period: 'hour' | 'day' | 'week' | 'month'
  /** Total input tokens */
  inputTokens: number
  /** Total output tokens */
  outputTokens: number
  /** Total cost in USD */
  totalCost: number
  /** Request count */
  requests: number
  /** Average latency */
  avgLatency: number
  /** Error rate */
  errorRate: number
}

export interface ModelComparison {
  models: Model[]
  pricing: {
    modelId: string
    inputPerMillion: number
    outputPerMillion: number
    costFor1kRequests: number
  }[]
  performance: {
    modelId: string
    tokensPerSecond: number
    timeToFirstToken: number
    latency: number
  }[]
  benchmarks: {
    benchmark: string
    scores: { modelId: string; score: number }[]
  }[]
  recommendation?: {
    modelId: string
    reason: string
    score: number
  }
}

// Comparison criteria types
export type PricingCriteria = 'input' | 'output' | 'total' | 'cached' | 'batch'
export type PerformanceCriteria = 'latency' | 'throughput' | 'ttft' | 'p95' | 'uptime'
export type SortOrder = 'asc' | 'desc'

export interface PriceComparisonOptions {
  /** Pricing criteria to compare */
  criteria?: PricingCriteria
  /** Estimated monthly tokens for cost calculation */
  monthlyTokens?: {
    input: number
    output: number
  }
  /** Sort order (default: asc for price) */
  sortBy?: SortOrder
  /** Include batch pricing if available */
  includeBatch?: boolean
  /** Include cached pricing if available */
  includeCached?: boolean
}

export interface PriceComparisonResult {
  models: {
    modelId: string
    name: string
    provider: Provider
    inputPerMillion: number
    outputPerMillion: number
    cachedInputPerMillion?: number
    batchInputPerMillion?: number
    batchOutputPerMillion?: number
    estimatedMonthlyCost?: number
    rank: number
    /** Percentage difference from cheapest */
    deltaFromCheapest: number
  }[]
  cheapest: string
  mostExpensive: string
  averageCost: number
  /** Cost savings if switching from most expensive to cheapest */
  maxSavings: number
}

export interface PerformanceComparisonOptions {
  /** Performance criteria to compare */
  criteria?: PerformanceCriteria
  /** Sort order (default: desc for performance) */
  sortBy?: SortOrder
  /** Weight factors for combined scoring */
  weights?: {
    latency?: number
    throughput?: number
    ttft?: number
    uptime?: number
  }
}

export interface PerformanceComparisonResult {
  models: {
    modelId: string
    name: string
    provider: Provider
    timeToFirstToken: number
    tokensPerSecond: number
    averageLatency: number
    p95Latency: number
    uptime: number
    rank: number
    /** Combined performance score (0-100) */
    performanceScore: number
    measuredAt: Date
  }[]
  fastest: string
  highestThroughput: string
  mostReliable: string
  /** Overall best performer based on weights */
  bestOverall: string
}

export interface CapabilityComparisonOptions {
  /** Specific capabilities to compare */
  capabilities?: string[]
  /** Minimum quality threshold (1-5) */
  minQuality?: number
  /** Only show models where all capabilities are supported */
  requireAll?: boolean
}

export interface CapabilityComparisonResult {
  capabilities: string[]
  models: {
    modelId: string
    name: string
    provider: Provider
    capabilitySupport: {
      capability: string
      supported: boolean
      quality?: number
      notes?: string
    }[]
    supportedCount: number
    averageQuality: number
    rank: number
  }[]
  /** Models that support all requested capabilities */
  fullSupport: string[]
  /** Capability with least support across models */
  rarestCapability: string
  /** Capability with most support across models */
  mostCommonCapability: string
}

export interface BenchmarkComparisonOptions {
  /** Specific benchmarks to compare */
  benchmarks?: string[]
  /** Minimum score threshold */
  minScore?: number
  /** Weight factors for combined scoring */
  weights?: Record<string, number>
}

export interface BenchmarkComparisonResult {
  benchmarks: string[]
  models: {
    modelId: string
    name: string
    provider: Provider
    scores: {
      benchmark: string
      score: number
      maxScore?: number
      percentile?: number
      source: string
      date: Date
    }[]
    averageScore: number
    averagePercentile?: number
    rank: number
  }[]
  /** Best model for each benchmark */
  leaders: Record<string, string>
  /** Overall best performer */
  bestOverall: string
}

export interface RecommendOptions {
  /** Task type */
  task: TaskType
  /** Budget: low, medium, high, unlimited */
  budget?: 'low' | 'medium' | 'high' | 'unlimited'
  /** Latency requirement: low, medium, high */
  latency?: 'low' | 'medium' | 'high'
  /** Quality requirement: low, medium, high, best */
  quality?: 'low' | 'medium' | 'high' | 'best'
  /** Minimum context window */
  minContextWindow?: number
  /** Required capabilities */
  capabilities?: string[]
  /** Preferred providers */
  preferProviders?: Provider[]
  /** Exclude providers */
  excludeProviders?: Provider[]
  /** Include deprecated models */
  includeDeprecated?: boolean
}

export interface Recommendation {
  /** Recommended model */
  model: Model
  /** Match score 0-100 */
  score: number
  /** Why this model was recommended */
  reason: string
  /** Trade-offs */
  tradeoffs: string[]
  /** Alternative models */
  alternatives: {
    model: Model
    score: number
    reason: string
  }[]
}

// Client interface
export interface ModelsClient {
  /**
   * Find the right model from natural language description
   *
   * @example
   * ```typescript
   * const model = await models.do`
   *   I need a fast model for code completion that supports function calling
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Recommendation>>

  /**
   * List all available models
   *
   * @example
   * ```typescript
   * const all = await models.list()
   * const anthropic = await models.list({ provider: 'anthropic' })
   * const flagship = await models.list({ category: 'flagship' })
   * ```
   */
  list(options?: {
    provider?: Provider
    category?: ModelCategory
    task?: TaskType
    minContextWindow?: number
    maxPricePerMillion?: number
    includeDeprecated?: boolean
    limit?: number
  }): Promise<Model[]>

  /**
   * Get a specific model by ID
   *
   * @example
   * ```typescript
   * const model = await models.get('claude-3-5-sonnet')
   * ```
   */
  get(modelId: string): Promise<Model>

  /**
   * Compare multiple models side by side
   *
   * @example
   * ```typescript
   * const comparison = await models.compare([
   *   'gpt-4o', 'claude-3-opus', 'gemini-1.5-pro'
   * ])
   * ```
   */
  compare(modelIds: string[]): Promise<ModelComparison>

  /**
   * Get pricing for a model
   *
   * @example
   * ```typescript
   * const pricing = await models.pricing('gpt-4o')
   *
   * // Calculate cost for usage
   * const cost = await models.pricing('claude-3-5-sonnet', {
   *   inputTokens: 1000000,
   *   outputTokens: 500000
   * })
   * ```
   */
  pricing(modelId: string, usage?: {
    inputTokens?: number
    outputTokens?: number
  }): Promise<Pricing & { estimatedCost?: number }>

  /**
   * Get benchmark results for a model
   *
   * @example
   * ```typescript
   * const benchmarks = await models.benchmarks('claude-3-opus')
   * ```
   */
  benchmarks(modelId: string): Promise<Benchmark[]>

  /**
   * Get capabilities for a model
   *
   * @example
   * ```typescript
   * const caps = await models.capabilities('gpt-4o')
   * ```
   */
  capabilities(modelId: string): Promise<Capability[]>

  /**
   * Get AI-powered model recommendation
   *
   * @example
   * ```typescript
   * const rec = await models.recommend({
   *   task: 'code-generation',
   *   budget: 'medium',
   *   latency: 'low',
   *   capabilities: ['function-calling', 'streaming']
   * })
   * ```
   */
  recommend(options: RecommendOptions): Promise<Recommendation>

  /**
   * Get usage statistics for a model
   *
   * @example
   * ```typescript
   * const usage = await models.usage('claude-3-5-sonnet', { period: 'month' })
   * ```
   */
  usage(modelId: string, options?: {
    period?: 'hour' | 'day' | 'week' | 'month'
  }): Promise<Usage>

  /**
   * Search models by query
   *
   * @example
   * ```typescript
   * const results = await models.search('fast code generation vision')
   * ```
   */
  search(query: string, options?: {
    limit?: number
    provider?: Provider
  }): Promise<Model[]>

  /**
   * Get all providers
   *
   * @example
   * ```typescript
   * const providers = await models.providers()
   * ```
   */
  providers(): Promise<{
    id: Provider
    name: string
    modelCount: number
    website: string
  }[]>

  /**
   * Get model performance metrics
   *
   * @example
   * ```typescript
   * const perf = await models.performance('gpt-4o')
   * ```
   */
  performance(modelId: string): Promise<PerformanceMetrics>

  /**
   * Calculate estimated cost for usage
   *
   * @example
   * ```typescript
   * const cost = await models.estimateCost({
   *   modelId: 'claude-3-5-sonnet',
   *   inputTokens: 1000000,
   *   outputTokens: 500000,
   *   requests: 1000
   * })
   * ```
   */
  estimateCost(options: {
    modelId: string
    inputTokens: number
    outputTokens: number
    requests?: number
  }): Promise<{
    totalCost: number
    inputCost: number
    outputCost: number
    costPerRequest: number
  }>

  /**
   * Compare models by pricing
   *
   * Find the most cost-effective models for your use case.
   *
   * @example
   * ```typescript
   * // Compare pricing across models
   * const priceComparison = await models.compareByPrice(
   *   ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'],
   *   {
   *     monthlyTokens: { input: 10_000_000, output: 5_000_000 },
   *     includeBatch: true
   *   }
   * )
   *
   * console.log(`Cheapest: ${priceComparison.cheapest}`)
   * console.log(`Max savings: $${priceComparison.maxSavings}/month`)
   * ```
   */
  compareByPrice(modelIds: string[], options?: PriceComparisonOptions): Promise<PriceComparisonResult>

  /**
   * Compare models by performance metrics
   *
   * Find the fastest or most reliable models.
   *
   * @example
   * ```typescript
   * // Compare performance with custom weights
   * const perfComparison = await models.compareByPerformance(
   *   ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-flash'],
   *   {
   *     criteria: 'latency',
   *     weights: { latency: 0.4, throughput: 0.4, uptime: 0.2 }
   *   }
   * )
   *
   * console.log(`Fastest: ${perfComparison.fastest}`)
   * console.log(`Best overall: ${perfComparison.bestOverall}`)
   * ```
   */
  compareByPerformance(modelIds: string[], options?: PerformanceComparisonOptions): Promise<PerformanceComparisonResult>

  /**
   * Compare models by capability support
   *
   * Find models that support specific features.
   *
   * @example
   * ```typescript
   * // Find models supporting specific capabilities
   * const capComparison = await models.compareByCapability(
   *   ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'],
   *   {
   *     capabilities: ['function-calling', 'vision', 'streaming', 'json-mode'],
   *     requireAll: true,
   *     minQuality: 4
   *   }
   * )
   *
   * console.log(`Full support: ${capComparison.fullSupport.join(', ')}`)
   * console.log(`Rarest capability: ${capComparison.rarestCapability}`)
   * ```
   */
  compareByCapability(modelIds: string[], options?: CapabilityComparisonOptions): Promise<CapabilityComparisonResult>

  /**
   * Compare models by benchmark scores
   *
   * Find the best models for specific tasks based on benchmark performance.
   *
   * @example
   * ```typescript
   * // Compare on specific benchmarks
   * const benchComparison = await models.compareByBenchmark(
   *   ['gpt-4o', 'claude-3-opus', 'gemini-1.5-pro'],
   *   {
   *     benchmarks: ['MMLU', 'HumanEval', 'GSM8K'],
   *     weights: { 'HumanEval': 2.0, 'MMLU': 1.0, 'GSM8K': 1.0 }
   *   }
   * )
   *
   * console.log(`Best for coding: ${benchComparison.leaders['HumanEval']}`)
   * console.log(`Best overall: ${benchComparison.bestOverall}`)
   * ```
   */
  compareByBenchmark(modelIds: string[], options?: BenchmarkComparisonOptions): Promise<BenchmarkComparisonResult>

  /**
   * Get a comprehensive multi-dimensional comparison
   *
   * Compare models across all dimensions: price, performance, capabilities, and benchmarks.
   *
   * @example
   * ```typescript
   * // Full comparison across all dimensions
   * const fullComparison = await models.compareAll(
   *   ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'],
   *   {
   *     priceOptions: { monthlyTokens: { input: 1_000_000, output: 500_000 } },
   *     performanceOptions: { weights: { latency: 0.5, throughput: 0.5 } },
   *     capabilityOptions: { capabilities: ['function-calling', 'vision'] },
   *     benchmarkOptions: { benchmarks: ['MMLU', 'HumanEval'] }
   *   }
   * )
   * ```
   */
  compareAll(modelIds: string[], options?: {
    priceOptions?: PriceComparisonOptions
    performanceOptions?: PerformanceComparisonOptions
    capabilityOptions?: CapabilityComparisonOptions
    benchmarkOptions?: BenchmarkComparisonOptions
  }): Promise<{
    price: PriceComparisonResult
    performance: PerformanceComparisonResult
    capability: CapabilityComparisonResult
    benchmark: BenchmarkComparisonResult
    /** AI-generated summary and recommendation */
    summary: {
      bestValue: string
      bestPerformance: string
      mostCapable: string
      bestOverall: string
      recommendation: string
    }
  }>
}

/**
 * Create a configured models client
 *
 * @example
 * ```typescript
 * import { Models } from 'models.do'
 *
 * const models = Models({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Models(options?: ClientOptions): ModelsClient {
  return createClient<ModelsClient>('https://models.do', options)
}

/**
 * Default models client instance
 *
 * For Workers environment, import 'rpc.do/env' first to enable
 * automatic environment variable resolution.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import { models } from 'models.do'
 *
 * const all = await models.list()
 * ```
 */
export const models: ModelsClient = Models()

// Named exports
export { Models, models }

// Default export = camelCase instance
export default models

export type { ClientOptions } from 'rpc.do'
