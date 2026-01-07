/**
 * benchmarks.do - What do you want benchmarks to .do for you?
 *
 * Compare AI performance on standard tasks, objectively.
 * Run industry-standard benchmarks against any model.
 *
 * @see https://benchmarks.do
 *
 * @example
 * ```typescript
 * import benchmarks from 'benchmarks.do'
 *
 * // Tagged template - describe what you want to measure
 * const results = await benchmarks.do`
 *   Compare Claude and GPT-4 on MMLU and HumanEval
 * `
 *
 * // Run a specific benchmark
 * const run = await benchmarks.run('MMLU', {
 *   model: 'claude-3-opus',
 *   categories: ['math', 'science']
 * })
 *
 * // Get the leaderboard
 * const leaders = await benchmarks.leaderboard('HumanEval')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Standard benchmark names
export type StandardBenchmark =
  | 'MMLU' // Massive Multitask Language Understanding
  | 'MMLU-Pro' // MMLU Professional
  | 'HumanEval' // Code generation
  | 'HumanEval+' // Extended HumanEval
  | 'GSM8K' // Grade school math
  | 'MATH' // Competition math
  | 'ARC-Challenge' // AI2 Reasoning Challenge
  | 'ARC-Easy' // ARC Easy set
  | 'HellaSwag' // Commonsense reasoning
  | 'WinoGrande' // Pronoun resolution
  | 'TruthfulQA' // Truthfulness
  | 'DROP' // Discrete reasoning over paragraphs
  | 'BIG-Bench' // Beyond the Imitation Game
  | 'BIG-Bench-Hard' // BIG-Bench Hard subset
  | 'GPQA' // Graduate-level science QA
  | 'MBPP' // Mostly Basic Python Problems
  | 'MT-Bench' // Multi-turn chat
  | 'AlpacaEval' // Instruction following
  | 'Chatbot-Arena' // Human preference
  | 'LMSYS-Elo' // LMSYS Elo rating
  | 'SWE-Bench' // Software engineering
  | 'AIME' // Math olympiad
  | 'LiveCodeBench' // Live coding
  | string // Custom benchmarks

// Types
export interface Benchmark {
  id: string
  name: StandardBenchmark
  description: string
  category: 'reasoning' | 'coding' | 'math' | 'knowledge' | 'chat' | 'safety' | 'multimodal'
  taskCount: number
  metrics: string[] // e.g., ['accuracy', 'pass@1', 'pass@10']
  version: string
  source?: string // e.g., 'OpenAI', 'Anthropic', 'Google', 'Meta'
  url?: string
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: string
  benchmarkId: string
  prompt: string
  category?: string
  subcategory?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  expectedOutput?: string
  metadata?: Record<string, unknown>
}

export interface Submission {
  id: string
  taskId: string
  runId: string
  model: string
  input: string
  output: string
  latencyMs: number
  tokens: { input: number; output: number; total: number }
  correct?: boolean
  score?: number
  metadata?: Record<string, unknown>
  submittedAt: Date
}

export interface Score {
  benchmarkId: string
  benchmarkName: string
  model: string
  metric: string
  value: number
  confidence?: number // 95% confidence interval
  sampleSize: number
  submittedAt: Date
}

export interface Run {
  id: string
  benchmarkId: string
  benchmarkName: string
  model: string
  provider: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: { completed: number; total: number; percentage: number }
  scores: Score[]
  config: RunConfig
  startedAt: Date
  completedAt?: Date
  error?: string
}

export interface RunConfig {
  model: string
  provider?: string
  categories?: string[]
  taskLimit?: number
  temperature?: number
  maxTokens?: number
  timeout?: number
  retries?: number
  parallel?: number
}

export interface LeaderboardEntry {
  rank: number
  model: string
  provider: string
  score: number
  metric: string
  confidence?: number
  runId: string
  submittedAt: Date
  verified: boolean
}

export interface Leaderboard {
  benchmarkId: string
  benchmarkName: string
  metric: string
  entries: LeaderboardEntry[]
  lastUpdated: Date
}

export interface ComparisonResult {
  benchmark: string
  metric: string
  models: Array<{
    model: string
    score: number
    rank: number
    delta?: number // difference from top
  }>
}

export interface DoOptions {
  models?: string[]
  benchmarks?: StandardBenchmark[]
  categories?: string[]
  detailed?: boolean
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
    const prompt = stringsOrPrompt.reduce(
      (acc, str, i) => acc + str + (values[i] !== undefined ? String(values[i]) : ''),
      ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

// Client interface
export interface BenchmarksClient {
  /**
   * Run benchmarks from natural language description
   *
   * @example
   * ```typescript
   * const results = await benchmarks.do`
   *   Compare Claude, GPT-4, and Gemini on MMLU and HumanEval
   * `
   * ```
   */
  do: TaggedTemplate<Promise<ComparisonResult[]>>

  /**
   * List available benchmarks
   *
   * @example
   * ```typescript
   * const all = await benchmarks.list()
   * const coding = await benchmarks.list({ category: 'coding' })
   * ```
   */
  list(options?: { category?: Benchmark['category']; search?: string }): Promise<Benchmark[]>

  /**
   * Get benchmark details
   */
  get(benchmarkId: string): Promise<Benchmark>

  /**
   * Run a benchmark against a model
   *
   * @example
   * ```typescript
   * const run = await benchmarks.run('MMLU', {
   *   model: 'claude-3-opus',
   *   categories: ['math', 'science']
   * })
   * ```
   */
  run(benchmark: StandardBenchmark, config: RunConfig): Promise<Run>

  /**
   * Submit results for a benchmark task
   *
   * @example
   * ```typescript
   * await benchmarks.submit(runId, {
   *   taskId: 'task_123',
   *   output: 'The answer is 42',
   *   latencyMs: 1250
   * })
   * ```
   */
  submit(
    runId: string,
    submission: {
      taskId: string
      output: string
      latencyMs?: number
      tokens?: { input: number; output: number }
    }
  ): Promise<Submission>

  /**
   * Get leaderboard for a benchmark
   *
   * @example
   * ```typescript
   * const leaders = await benchmarks.leaderboard('HumanEval')
   * const top10 = await benchmarks.leaderboard('MMLU', { limit: 10 })
   * ```
   */
  leaderboard(
    benchmark: StandardBenchmark,
    options?: { metric?: string; limit?: number; verified?: boolean }
  ): Promise<Leaderboard>

  /**
   * Compare models across benchmarks
   *
   * @example
   * ```typescript
   * const comparison = await benchmarks.compare(
   *   ['claude-3-opus', 'gpt-4', 'gemini-ultra'],
   *   ['MMLU', 'HumanEval', 'GSM8K']
   * )
   * ```
   */
  compare(models: string[], benchmarkIds: StandardBenchmark[]): Promise<ComparisonResult[]>

  /**
   * Get results for a run
   *
   * @example
   * ```typescript
   * const results = await benchmarks.results(runId)
   * ```
   */
  results(runId: string): Promise<Run>

  /**
   * Get run status
   */
  status(runId: string): Promise<Run>

  /**
   * Cancel a running benchmark
   */
  cancel(runId: string): Promise<Run>

  /**
   * List runs
   */
  runs(options?: {
    benchmarkId?: string
    model?: string
    status?: Run['status']
    limit?: number
  }): Promise<Run[]>

  /**
   * Create a custom benchmark
   *
   * @example
   * ```typescript
   * const custom = await benchmarks.create({
   *   name: 'MyDomainBench',
   *   description: 'Domain-specific evaluation',
   *   category: 'knowledge',
   *   tasks: [
   *     { prompt: 'Question 1', expectedOutput: 'Answer 1' },
   *     { prompt: 'Question 2', expectedOutput: 'Answer 2' }
   *   ]
   * })
   * ```
   */
  create(definition: {
    name: string
    description: string
    category: Benchmark['category']
    tasks: Array<{ prompt: string; expectedOutput?: string; metadata?: Record<string, unknown> }>
    metrics?: string[]
  }): Promise<Benchmark>

  /**
   * Get tasks for a benchmark
   */
  tasks(benchmarkId: string, options?: { category?: string; limit?: number }): Promise<Task[]>

  /**
   * Stream run progress
   */
  stream(runId: string): AsyncIterable<{
    type: 'progress' | 'task' | 'score' | 'complete' | 'error'
    data: unknown
  }>
}

/**
 * Create a configured benchmarks client
 *
 * @example
 * ```typescript
 * import { Benchmarks } from 'benchmarks.do'
 *
 * const benchmarks = Benchmarks({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Benchmarks(options?: ClientOptions): BenchmarksClient {
  return createClient<BenchmarksClient>('https://benchmarks.do', options)
}

/**
 * Default benchmarks client instance
 *
 * For Workers environment, import 'rpc.do/env' first to enable
 * automatic environment variable resolution.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import { benchmarks } from 'benchmarks.do'
 *
 * const all = await benchmarks.list()
 * ```
 */
export const benchmarks: BenchmarksClient = Benchmarks()

// Named exports
export { Benchmarks, benchmarks }

// Default export = camelCase instance
export default benchmarks

export type { ClientOptions } from 'rpc.do'
