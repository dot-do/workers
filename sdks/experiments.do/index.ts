/**
 * experiments.do - Test everything. Know what works.
 *
 * A/B testing and feature experiments with statistical rigor.
 *
 * @see https://experiments.do
 *
 * @example
 * ```typescript
 * import experiments from 'experiments.do'
 *
 * // Tagged template - describe what you want to test
 * const exp = await experiments.do`
 *   Test whether a green checkout button increases conversions
 *   compared to the current blue button
 * `
 *
 * // Assign users to variants
 * const variant = await experiments.assign('checkout-button', userId)
 * if (variant.name === 'green-button') {
 *   showGreenButton()
 * }
 *
 * // Track conversions
 * await experiments.track('checkout-button', userId, 'converted', { value: 99.99 })
 *
 * // Get results with statistical significance
 * const results = await experiments.results('checkout-button')
 * console.log(results.winner) // 'green-button'
 * console.log(results.confidence) // 0.95
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Variant {
  id: string
  name: string
  description?: string
  weight: number // Percentage allocation (0-100)
  isControl: boolean
  config?: Record<string, unknown>
}

export interface Segment {
  id: string
  name: string
  description?: string
  rules: SegmentRule[]
}

export interface SegmentRule {
  attribute: string
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'not_in'
  value: unknown
}

export interface Experiment {
  id: string
  name: string
  description?: string
  hypothesis?: string
  variants: Variant[]
  segments?: Segment[]
  metrics: string[]
  primaryMetric: string
  status: 'draft' | 'running' | 'paused' | 'concluded'
  trafficAllocation: number // Percentage of traffic in experiment (0-100)
  startedAt?: Date
  concludedAt?: Date
  winner?: string
  createdAt: Date
  updatedAt: Date
}

export interface Assignment {
  experimentId: string
  experimentName: string
  userId: string
  variant: Variant
  assignedAt: Date
  context?: Record<string, unknown>
}

export interface MetricEvent {
  experimentId: string
  userId: string
  variantId: string
  metric: string
  value?: number
  metadata?: Record<string, unknown>
  timestamp: Date
}

export interface VariantResult {
  variant: Variant
  sampleSize: number
  conversions: number
  conversionRate: number
  averageValue?: number
  totalValue?: number
  confidenceInterval: [number, number]
}

export interface Result {
  experiment: Experiment
  variantResults: VariantResult[]
  winner?: string
  confidence: number // Statistical significance (0-1)
  isSignificant: boolean
  lift?: number // Percentage improvement over control
  pValue?: number
  sampleSize: number
  duration: number // Days running
  recommendedAction: 'continue' | 'conclude' | 'increase_traffic'
}

export interface Metric {
  name: string
  type: 'conversion' | 'revenue' | 'count' | 'duration'
  description?: string
  goal: 'increase' | 'decrease'
}

export interface RolloutConfig {
  percentage: number
  segments?: string[]
  excludeSegments?: string[]
}

export interface DoOptions {
  context?: Record<string, unknown>
  segments?: string[]
}

// Tagged template helper
type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

function tagged<T>(fn: (prompt: string, options?: DoOptions) => T): TaggedTemplate<T> {
  return function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      return fn(stringsOrPrompt, values[0] as DoOptions | undefined)
    }
    const prompt = stringsOrPrompt.reduce((acc, str, i) =>
      acc + str + (values[i] !== undefined ? String(values[i]) : ''), ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

// Client interface
export interface ExperimentsClient {
  /**
   * Create an experiment from natural language
   *
   * @example
   * ```typescript
   * const exp = await experiments.do`
   *   Test whether showing social proof increases signups
   *   by comparing "Join 10,000+ users" vs no social proof
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Experiment>>

  /**
   * Create an experiment with full configuration
   *
   * @example
   * ```typescript
   * const exp = await experiments.create({
   *   name: 'checkout-button-color',
   *   hypothesis: 'A green button will increase conversions',
   *   variants: [
   *     { name: 'control', isControl: true, weight: 50, config: { color: 'blue' } },
   *     { name: 'green-button', isControl: false, weight: 50, config: { color: 'green' } }
   *   ],
   *   primaryMetric: 'checkout_completed',
   *   trafficAllocation: 100
   * })
   * ```
   */
  create(config: {
    name: string
    description?: string
    hypothesis?: string
    variants: Array<Omit<Variant, 'id'>>
    segments?: Array<Omit<Segment, 'id'>>
    metrics?: string[]
    primaryMetric: string
    trafficAllocation?: number
  }): Promise<Experiment>

  /**
   * Get an experiment by name or ID
   */
  get(nameOrId: string): Promise<Experiment>

  /**
   * List all experiments
   */
  list(options?: {
    status?: Experiment['status']
    limit?: number
    offset?: number
  }): Promise<Experiment[]>

  /**
   * Update an experiment
   */
  update(nameOrId: string, updates: Partial<{
    description: string
    hypothesis: string
    trafficAllocation: number
    variants: Array<Omit<Variant, 'id'>>
  }>): Promise<Experiment>

  /**
   * Delete an experiment
   */
  delete(nameOrId: string): Promise<void>

  /**
   * Start an experiment
   */
  start(nameOrId: string): Promise<Experiment>

  /**
   * Pause an experiment
   */
  pause(nameOrId: string): Promise<Experiment>

  /**
   * Resume a paused experiment
   */
  resume(nameOrId: string): Promise<Experiment>

  // Assignment

  /**
   * Assign a user to an experiment variant
   *
   * @example
   * ```typescript
   * const assignment = await experiments.assign('checkout-button', userId, {
   *   country: 'US',
   *   plan: 'pro'
   * })
   * console.log(assignment.variant.name) // 'green-button'
   * ```
   */
  assign(nameOrId: string, userId: string, context?: Record<string, unknown>): Promise<Assignment>

  /**
   * Get a user's current assignment for an experiment
   */
  assignment(nameOrId: string, userId: string): Promise<Assignment | null>

  /**
   * Get all assignments for a user
   */
  assignments(userId: string): Promise<Assignment[]>

  // Tracking

  /**
   * Track a metric event for an experiment
   *
   * @example
   * ```typescript
   * // Track conversion
   * await experiments.track('checkout-button', userId, 'checkout_completed')
   *
   * // Track with value (for revenue metrics)
   * await experiments.track('pricing-test', userId, 'revenue', { value: 99.99 })
   * ```
   */
  track(nameOrId: string, userId: string, metric: string, options?: {
    value?: number
    metadata?: Record<string, unknown>
  }): Promise<MetricEvent>

  /**
   * Batch track multiple events
   */
  trackBatch(events: Array<{
    experiment: string
    userId: string
    metric: string
    value?: number
    metadata?: Record<string, unknown>
  }>): Promise<MetricEvent[]>

  // Results

  /**
   * Get experiment results with statistical analysis
   *
   * @example
   * ```typescript
   * const results = await experiments.results('checkout-button')
   * if (results.isSignificant) {
   *   console.log(`Winner: ${results.winner} with ${results.lift}% lift`)
   * }
   * ```
   */
  results(nameOrId: string, options?: {
    metric?: string // Defaults to primaryMetric
    dateRange?: { start: Date; end: Date }
  }): Promise<Result>

  /**
   * Get raw metrics for an experiment
   */
  metrics(nameOrId: string, options?: {
    variant?: string
    metric?: string
    limit?: number
  }): Promise<MetricEvent[]>

  // Conclude

  /**
   * Conclude an experiment and optionally roll out winner
   *
   * @example
   * ```typescript
   * // Conclude and record winner
   * await experiments.conclude('checkout-button', {
   *   winner: 'green-button',
   *   notes: 'Green button showed 15% lift in conversions'
   * })
   * ```
   */
  conclude(nameOrId: string, options?: {
    winner?: string
    notes?: string
  }): Promise<Experiment>

  // Rollout

  /**
   * Gradually roll out a winning variant
   *
   * @example
   * ```typescript
   * // Start with 10% rollout
   * await experiments.rollout('checkout-button', 'green-button', { percentage: 10 })
   *
   * // Increase to 50%
   * await experiments.rollout('checkout-button', 'green-button', { percentage: 50 })
   *
   * // Full rollout
   * await experiments.rollout('checkout-button', 'green-button', { percentage: 100 })
   * ```
   */
  rollout(nameOrId: string, variant: string, config: RolloutConfig): Promise<Experiment>

  /**
   * Get current rollout status
   */
  rolloutStatus(nameOrId: string): Promise<{
    variant: string
    percentage: number
    segments?: string[]
  } | null>

  // Segments

  /**
   * Create a user segment
   */
  createSegment(segment: Omit<Segment, 'id'>): Promise<Segment>

  /**
   * List all segments
   */
  listSegments(): Promise<Segment[]>

  /**
   * Delete a segment
   */
  deleteSegment(segmentId: string): Promise<void>

  // Metrics

  /**
   * Define a metric
   */
  defineMetric(metric: Metric): Promise<Metric>

  /**
   * List all metrics
   */
  listMetrics(): Promise<Metric[]>
}

/**
 * Create a configured experiments client
 */
export function Experiments(options?: ClientOptions): ExperimentsClient {
  return createClient<ExperimentsClient>('https://experiments.do', options)
}

/**
 * Default experiments client
 */
export const experiments: ExperimentsClient = Experiments({
  apiKey: typeof process !== 'undefined' ? (process.env?.EXPERIMENTS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

export default experiments

export type { ClientOptions } from 'rpc.do'
