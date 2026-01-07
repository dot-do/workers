/**
 * evals.do - Know if your AI is actually good.
 *
 * Systematic AI evaluation with LLM judges.
 * Test, measure, and track AI quality over time.
 *
 * @see https://evals.do
 *
 * @example
 * ```typescript
 * import evals from 'evals.do'
 *
 * // Tagged template - describe your eval criteria
 * const eval = await evals.do`
 *   Evaluate customer support responses for:
 *   - Helpfulness (was the question answered?)
 *   - Tone (friendly and professional?)
 *   - Accuracy (factually correct?)
 * `
 *
 * // Run evaluation
 * const result = await evals.run(eval.id, {
 *   input: 'How do I reset my password?',
 *   output: 'Click forgot password on the login page...'
 * })
 *
 * // Track quality over time
 * const report = await evals.report('customer-support', { days: 30 })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types

/**
 * A single criterion for evaluation
 */
export interface Criterion {
  id: string
  name: string
  description: string
  /** Weight for aggregate scoring (0-1) */
  weight?: number
  /** Custom rubric for this criterion */
  rubric?: string
  /** Examples of good/bad scores */
  examples?: Array<{
    score: number
    text: string
    explanation: string
  }>
}

/**
 * Scoring rubric defining how to evaluate
 */
export interface Rubric {
  id: string
  name: string
  description?: string
  /** Score scale (e.g., 1-5, 1-10, pass/fail) */
  scale: {
    min: number
    max: number
    labels?: Record<number, string>
  }
  criteria: Criterion[]
  createdAt: Date
  updatedAt: Date
}

/**
 * A judge configuration (LLM-as-judge)
 */
export interface Judge {
  id: string
  name: string
  /** Model to use for judging */
  model: string
  /** System prompt for the judge */
  systemPrompt?: string
  /** Whether to include chain-of-thought reasoning */
  reasoning?: boolean
  /** Temperature for judge model */
  temperature?: number
  createdAt: Date
}

/**
 * An eval definition
 */
export interface Eval {
  id: string
  name: string
  description?: string
  /** The rubric to use for evaluation */
  rubricId: string
  rubric?: Rubric
  /** The judge to use */
  judgeId: string
  judge?: Judge
  /** Dataset ID for batch evals */
  datasetId?: string
  /** Tags for organization */
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * A score for a single criterion
 */
export interface Score {
  criterionId: string
  criterionName: string
  value: number
  /** Judge's reasoning for this score */
  reasoning?: string
  /** Confidence in this score (0-1) */
  confidence?: number
}

/**
 * Result of a single evaluation
 */
export interface Result {
  id: string
  evalId: string
  /** The input that produced the output */
  input: unknown
  /** The AI output being evaluated */
  output: unknown
  /** Expected output (for comparison) */
  expected?: unknown
  /** Scores for each criterion */
  scores: Score[]
  /** Aggregate score (weighted average) */
  aggregateScore: number
  /** Pass/fail based on threshold */
  passed: boolean
  /** Full judge reasoning */
  reasoning?: string
  /** Metadata */
  metadata?: Record<string, unknown>
  /** Time taken to evaluate */
  latencyMs: number
  createdAt: Date
}

/**
 * Comparison between two outputs
 */
export interface Comparison {
  id: string
  evalId: string
  input: unknown
  outputA: unknown
  outputB: unknown
  /** Which output is better: 'a', 'b', or 'tie' */
  winner: 'a' | 'b' | 'tie'
  /** Margin of victory (0-1) */
  margin: number
  /** Per-criterion comparison */
  criteriaComparison: Array<{
    criterionId: string
    winner: 'a' | 'b' | 'tie'
    reasoning: string
  }>
  reasoning: string
  createdAt: Date
}

/**
 * Aggregate report over time
 */
export interface Report {
  evalId: string
  evalName: string
  period: { start: Date; end: Date }
  /** Total evaluations run */
  totalEvaluations: number
  /** Average aggregate score */
  averageScore: number
  /** Pass rate (0-1) */
  passRate: number
  /** Score distribution */
  distribution: Record<number, number>
  /** Per-criterion averages */
  criteriaAverages: Array<{
    criterionId: string
    criterionName: string
    average: number
    trend: 'up' | 'down' | 'stable'
  }>
  /** Trend over time */
  trend: Array<{
    date: Date
    averageScore: number
    passRate: number
    count: number
  }>
  /** Notable regressions */
  regressions: Array<{
    date: Date
    criterionId: string
    previousAverage: number
    newAverage: number
    changePercent: number
  }>
}

/**
 * Options for the tagged template
 */
export interface DoOptions {
  /** Pass threshold (default: scale midpoint) */
  passThreshold?: number
  /** Model for LLM judge */
  model?: string
  /** Include reasoning in results */
  reasoning?: boolean
  /** Tags for organization */
  tags?: string[]
}

/**
 * Options for running an eval
 */
export interface RunOptions {
  /** The input that produced the output */
  input: unknown
  /** The AI output to evaluate */
  output: unknown
  /** Expected output for comparison */
  expected?: unknown
  /** Additional context for the judge */
  context?: Record<string, unknown>
  /** Custom metadata to attach */
  metadata?: Record<string, unknown>
}

/**
 * Options for batch eval runs
 */
export interface BatchRunOptions {
  /** Dataset of input/output pairs */
  dataset?: Array<{ input: unknown; output: unknown; expected?: unknown }>
  /** Dataset ID to use */
  datasetId?: string
  /** Run in parallel (default: true) */
  parallel?: boolean
  /** Max concurrent evaluations */
  concurrency?: number
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

/**
 * Evals client interface
 */
export interface EvalsClient {
  /**
   * Create an eval from natural language criteria
   *
   * @example
   * ```typescript
   * const eval = await evals.do`
   *   Evaluate code reviews for:
   *   - Identifies bugs (catches real issues)
   *   - Constructive tone (helpful not harsh)
   *   - Actionable feedback (specific suggestions)
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Eval>>

  /**
   * Create an eval with full configuration
   */
  create(options: {
    name: string
    description?: string
    rubric: {
      scale?: { min: number; max: number; labels?: Record<number, string> }
      criteria: Array<{
        name: string
        description: string
        weight?: number
        rubric?: string
      }>
    }
    judge?: {
      model?: string
      systemPrompt?: string
      reasoning?: boolean
      temperature?: number
    }
    passThreshold?: number
    tags?: string[]
  }): Promise<Eval>

  /**
   * Run a single evaluation
   *
   * @example
   * ```typescript
   * const result = await evals.run('code-review-quality', {
   *   input: { code: '...', pr_description: '...' },
   *   output: 'LGTM, ship it!'
   * })
   *
   * if (!result.passed) {
   *   console.log('Quality issue:', result.reasoning)
   * }
   * ```
   */
  run(evalNameOrId: string, options: RunOptions): Promise<Result>

  /**
   * Run batch evaluations
   */
  batch(evalNameOrId: string, options: BatchRunOptions): Promise<{
    results: Result[]
    summary: {
      total: number
      passed: number
      failed: number
      averageScore: number
      passRate: number
    }
  }>

  /**
   * Get an eval definition
   */
  get(nameOrId: string): Promise<Eval>

  /**
   * List all evals
   */
  list(options?: { tags?: string[]; limit?: number }): Promise<Eval[]>

  /**
   * Update an eval
   */
  update(nameOrId: string, updates: Partial<Eval>): Promise<Eval>

  /**
   * Delete an eval
   */
  delete(nameOrId: string): Promise<void>

  /**
   * Compare two outputs head-to-head
   *
   * @example
   * ```typescript
   * const comparison = await evals.compare('response-quality', {
   *   input: 'Explain quantum computing',
   *   outputA: 'Response from model A...',
   *   outputB: 'Response from model B...'
   * })
   *
   * console.log(`Winner: ${comparison.winner}`)
   * ```
   */
  compare(evalNameOrId: string, options: {
    input: unknown
    outputA: unknown
    outputB: unknown
    context?: Record<string, unknown>
  }): Promise<Comparison>

  /**
   * Create or get a rubric
   *
   * @example
   * ```typescript
   * const rubric = await evals.rubric('5-star-quality', {
   *   scale: { min: 1, max: 5, labels: { 1: 'Poor', 5: 'Excellent' } },
   *   criteria: [
   *     { name: 'Accuracy', description: 'Factually correct' },
   *     { name: 'Clarity', description: 'Easy to understand' }
   *   ]
   * })
   * ```
   */
  rubric(name: string, options?: {
    scale?: { min: number; max: number; labels?: Record<number, string> }
    criteria?: Array<{
      name: string
      description: string
      weight?: number
      examples?: Array<{ score: number; text: string; explanation: string }>
    }>
  }): Promise<Rubric>

  /**
   * Create or get a judge configuration
   *
   * @example
   * ```typescript
   * const judge = await evals.judge('strict-reviewer', {
   *   model: 'claude-3-opus',
   *   systemPrompt: 'You are a strict but fair code reviewer...',
   *   reasoning: true
   * })
   * ```
   */
  judge(name: string, options?: {
    model?: string
    systemPrompt?: string
    reasoning?: boolean
    temperature?: number
  }): Promise<Judge>

  /**
   * Generate an evaluation report
   *
   * @example
   * ```typescript
   * const report = await evals.report('customer-support', {
   *   days: 30,
   *   groupBy: 'day'
   * })
   *
   * console.log(`Pass rate: ${report.passRate * 100}%`)
   * console.log(`Regressions: ${report.regressions.length}`)
   * ```
   */
  report(evalNameOrId: string, options?: {
    /** Number of days to include */
    days?: number
    /** Date range */
    start?: Date
    end?: Date
    /** Group results by time period */
    groupBy?: 'hour' | 'day' | 'week' | 'month'
    /** Filter by metadata */
    filter?: Record<string, unknown>
  }): Promise<Report>

  /**
   * List evaluation results
   */
  results(evalNameOrId: string, options?: {
    /** Filter to passed/failed only */
    passed?: boolean
    /** Score threshold */
    minScore?: number
    maxScore?: number
    /** Limit results */
    limit?: number
    /** Pagination offset */
    offset?: number
    /** Date range */
    start?: Date
    end?: Date
  }): Promise<Result[]>

  /**
   * Get a specific result
   */
  result(resultId: string): Promise<Result>

  /**
   * Stream evaluation results in real-time
   */
  stream(evalNameOrId: string): AsyncIterable<Result>
}

/**
 * Create a configured evals client
 */
export function Evals(options?: ClientOptions): EvalsClient {
  return createClient<EvalsClient>('https://evals.do', options)
}

/**
 * Default evals client
 */
export const evals: EvalsClient = Evals({
  apiKey: typeof process !== 'undefined' ? (process.env?.EVALS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

export default evals

export type { ClientOptions } from 'rpc.do'
