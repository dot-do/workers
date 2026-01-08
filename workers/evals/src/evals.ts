/**
 * EvalsDO - evals.do AI Evaluations/Benchmarks Worker
 *
 * Implements the evaluations/benchmarks interface for:
 * - AI model evaluations and comparisons
 * - Test suite execution with datasets
 * - Metrics collection and aggregation
 * - Comparison reporting and leaderboards
 *
 * @see ARCHITECTURE.md
 */

import type {
  MockDOState,
  MockEvalsEnv,
} from '../test/helpers.js'

// ============================================================================
// Types
// ============================================================================

// Evaluation Types
export interface EvaluationConfig {
  name: string
  description?: string
  type: 'accuracy' | 'latency' | 'cost' | 'quality' | 'custom'
  prompt: string | PromptTemplate
  expectedOutput?: string | ExpectedOutputMatcher
  models: string[]
  dataset?: DatasetReference
  scoringFunction?: string
  metadata?: Record<string, unknown>
}

export interface PromptTemplate {
  template: string
  variables: string[]
}

export interface ExpectedOutputMatcher {
  type: 'exact' | 'contains' | 'regex' | 'semantic' | 'custom'
  value: string
  threshold?: number
}

export interface DatasetReference {
  id: string
  name?: string
}

export interface Evaluation {
  id: string
  name: string
  description?: string
  type: 'accuracy' | 'latency' | 'cost' | 'quality' | 'custom'
  prompt: string | PromptTemplate
  expectedOutput?: string | ExpectedOutputMatcher
  models: string[]
  dataset?: DatasetReference
  scoringFunction?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ListEvaluationsOptions {
  limit?: number
  offset?: number
  type?: 'accuracy' | 'latency' | 'cost' | 'quality' | 'custom'
  orderBy?: 'createdAt' | 'updatedAt' | 'name'
  order?: 'asc' | 'desc'
}

export interface RunOptions {
  models?: string[]
  datasetSubset?: string[]
  concurrency?: number
  timeout?: number
}

export interface ListRunsOptions {
  limit?: number
  offset?: number
  status?: 'pending' | 'running' | 'completed' | 'failed'
}

export interface EvaluationRun {
  id: string
  evaluationId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  results: ModelResult[]
  summary?: EvaluationSummary
  error?: string
}

export interface ModelResult {
  model: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: string
  score?: number
  metrics: EvaluationMetrics
  error?: string
}

export interface EvaluationMetrics {
  latencyMs: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost?: number
}

export interface EvaluationSummary {
  totalModels: number
  completedModels: number
  failedModels: number
  averageScore?: number
  bestModel?: string
  worstModel?: string
  averageLatencyMs: number
  totalCost?: number
}

// Metrics Types
export interface MetricInput {
  model: string
  name: string
  value: number
  unit?: string
  timestamp?: string
  metadata?: Record<string, unknown>
}

export interface Metric {
  id: string
  runId: string
  model: string
  name: string
  value: number
  unit?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface MetricQueryOptions {
  model?: string
  name?: string
  startTime?: string
  endTime?: string
  limit?: number
}

export interface AggregateOptions {
  groupBy?: 'model' | 'name' | 'timestamp'
  metrics?: string[]
  operation?: 'avg' | 'sum' | 'min' | 'max' | 'p50' | 'p95' | 'p99'
}

export interface AggregatedMetrics {
  runId: string
  groups: MetricGroup[]
  summary: {
    totalMetrics: number
    startTime: string
    endTime: string
  }
}

export interface MetricGroup {
  key: string
  metrics: {
    name: string
    avg: number
    min: number
    max: number
    sum: number
    count: number
    p50?: number
    p95?: number
    p99?: number
  }[]
}

export interface ModelMetricOptions {
  evaluationId?: string
  startTime?: string
  endTime?: string
}

export interface ModelAggregatedMetrics {
  model: string
  totalRuns: number
  metrics: {
    latencyMs: { avg: number; min: number; max: number; p50: number; p95: number; p99: number }
    inputTokens: { avg: number; total: number }
    outputTokens: { avg: number; total: number }
    cost: { avg: number; total: number }
    score?: { avg: number; min: number; max: number }
  }
}

export interface CompareOptions {
  evaluationId?: string
  startTime?: string
  endTime?: string
}

export interface ModelComparison {
  metric: string
  models: {
    model: string
    value: number
    rank: number
  }[]
  winner: string
  difference: number
  percentageDifference: number
}

export interface TimeSeriesOptions {
  model?: string
  interval?: 'minute' | 'hour' | 'day' | 'week'
  startTime?: string
  endTime?: string
}

export interface TimeSeriesData {
  evaluationId: string
  metric: string
  interval: string
  dataPoints: {
    timestamp: string
    value: number
    count: number
  }[]
}

// Dataset Types
export interface DatasetConfig {
  name: string
  description?: string
  schema?: DatasetSchema
  items?: DatasetItem[]
  metadata?: Record<string, unknown>
}

export interface DatasetSchema {
  fields: {
    name: string
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required?: boolean
    description?: string
  }[]
}

export interface Dataset {
  id: string
  name: string
  description?: string
  schema?: DatasetSchema
  itemCount: number
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface DatasetItem {
  id?: string
  input: string | Record<string, unknown>
  expectedOutput?: string | Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface ListDatasetsOptions {
  limit?: number
  offset?: number
}

export interface DatasetItemsOptions {
  limit?: number
  offset?: number
  random?: boolean
}

// Test Suite Types
export interface TestSuiteConfig {
  name: string
  description?: string
  evaluations: string[]
  datasets: string[]
  models: string[]
  scoringConfig?: ScoringConfig
  parallelism?: number
  timeout?: number
  retryConfig?: RetryConfig
  metadata?: Record<string, unknown>
}

export interface ScoringConfig {
  method: 'exact' | 'contains' | 'semantic' | 'custom' | 'llm-judge'
  threshold?: number
  customFunction?: string
  judgeModel?: string
  judgePrompt?: string
}

export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  retryOn: ('timeout' | 'rate_limit' | 'server_error')[]
}

export interface TestSuite {
  id: string
  name: string
  description?: string
  evaluations: string[]
  datasets: string[]
  models: string[]
  scoringConfig?: ScoringConfig
  parallelism?: number
  timeout?: number
  retryConfig?: RetryConfig
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ListTestSuitesOptions {
  limit?: number
  offset?: number
}

export interface TestSuiteRunOptions {
  models?: string[]
  datasets?: string[]
  evaluations?: string[]
  samplingRate?: number
  dryRun?: boolean
}

export interface TestSuiteRun {
  id: string
  suiteId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: {
    total: number
    completed: number
    failed: number
    percentage: number
  }
  startedAt: string
  completedAt?: string
  results?: TestSuiteResults
  error?: string
}

export interface TestSuiteResults {
  overall: {
    passed: number
    failed: number
    skipped: number
    score: number
  }
  byModel: {
    model: string
    passed: number
    failed: number
    score: number
    latency: { avg: number; p50: number; p95: number }
    cost: number
  }[]
  byEvaluation: {
    evaluationId: string
    name: string
    passed: number
    failed: number
    score: number
  }[]
  byDataset: {
    datasetId: string
    name: string
    passed: number
    failed: number
    score: number
  }[]
  failures: TestFailure[]
}

export interface TestFailure {
  evaluationId: string
  datasetItemId: string
  model: string
  input: string
  expectedOutput: string
  actualOutput: string
  score: number
  error?: string
}

// Report Types
export interface ReportOptions {
  includeRawData?: boolean
  includeCharts?: boolean
  metrics?: string[]
}

export interface EvaluationReport {
  id: string
  runId: string
  evaluationName: string
  evaluationType: string
  generatedAt: string
  summary: ReportSummary
  modelResults: ModelReportResult[]
  charts?: ChartData[]
  rawData?: unknown
}

export interface ReportSummary {
  totalModels: number
  totalPrompts: number
  duration: number
  bestModel: {
    model: string
    score: number
  }
  worstModel: {
    model: string
    score: number
  }
  averageLatency: number
  totalCost: number
  overallScore: number
}

export interface ModelReportResult {
  model: string
  rank: number
  score: number
  accuracy?: number
  latency: {
    avg: number
    min: number
    max: number
    p50: number
    p95: number
    p99: number
  }
  tokens: {
    input: number
    output: number
    total: number
  }
  cost: number
  samples: SampleResult[]
}

export interface SampleResult {
  promptIndex: number
  prompt: string
  expectedOutput?: string
  actualOutput: string
  score: number
  latency: number
  correct?: boolean
}

export interface ChartData {
  type: 'bar' | 'line' | 'scatter' | 'radar'
  title: string
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
    }[]
  }
}

export interface ComparisonReportOptions {
  metrics?: string[]
  includeCharts?: boolean
  baseline?: string
}

export interface ComparisonReport {
  id: string
  runIds: string[]
  generatedAt: string
  baseline?: string
  comparisons: RunComparison[]
  trends: TrendAnalysis
  recommendations: string[]
}

export interface RunComparison {
  runId: string
  evaluationName: string
  timestamp: string
  models: string[]
  metrics: {
    name: string
    value: number
    change?: number
    changePercent?: number
  }[]
}

export interface TrendAnalysis {
  metric: string
  trend: 'improving' | 'declining' | 'stable'
  slope: number
  confidence: number
  dataPoints: { timestamp: string; value: number }[]
}

export interface LeaderboardOptions {
  metric?: 'score' | 'latency' | 'cost' | 'accuracy'
  evaluationType?: string
  limit?: number
  timeRange?: {
    start: string
    end: string
  }
}

export interface Leaderboard {
  metric: string
  generatedAt: string
  entries: LeaderboardEntry[]
  metadata: {
    totalEvaluations: number
    totalRuns: number
    timeRange: { start: string; end: string }
  }
}

export interface LeaderboardEntry {
  rank: number
  model: string
  value: number
  evaluationCount: number
  trend: 'up' | 'down' | 'stable'
  previousRank?: number
}

export type ExportFormat = 'json' | 'csv' | 'markdown' | 'html' | 'pdf'

export interface ExportedReport {
  reportId: string
  format: ExportFormat
  content: string | Buffer
  filename: string
  mimeType: string
}

// ============================================================================
// Allowed RPC Methods
// ============================================================================

const ALLOWED_METHODS = new Set([
  // Evaluation operations
  'createEvaluation',
  'getEvaluation',
  'listEvaluations',
  'deleteEvaluation',
  'runEvaluation',
  'getEvaluationRun',
  'listEvaluationRuns',
  // Metrics operations
  'collectMetric',
  'getMetrics',
  'aggregateMetrics',
  'getModelMetrics',
  'compareModels',
  'getMetricTimeSeries',
  // Dataset operations
  'createDataset',
  'getDataset',
  'listDatasets',
  'updateDataset',
  'deleteDataset',
  'addDatasetItems',
  'getDatasetItems',
  // Test suite operations
  'createTestSuite',
  'getTestSuite',
  'listTestSuites',
  'deleteTestSuite',
  'runTestSuite',
  'getTestSuiteRun',
  'cancelTestSuiteRun',
  // Report operations
  'generateReport',
  'generateComparisonReport',
  'getLeaderboard',
  'exportReport',
])

// ============================================================================
// EvalsDO Implementation
// ============================================================================

export class EvalsDO {
  private ctx: MockDOState
  private env: MockEvalsEnv

  // In-memory stores (in a real DO, these would use this.ctx.storage)
  private evaluations: Map<string, Evaluation> = new Map()
  private evaluationRuns: Map<string, EvaluationRun> = new Map()
  private metrics: Map<string, Metric[]> = new Map()
  private datasets: Map<string, Dataset> = new Map()
  private datasetItems: Map<string, DatasetItem[]> = new Map()
  private testSuites: Map<string, TestSuite> = new Map()
  private testSuiteRuns: Map<string, TestSuiteRun> = new Map()
  private reports: Map<string, EvaluationReport> = new Map()

  constructor(ctx: MockDOState, env: MockEvalsEnv) {
    this.ctx = ctx
    this.env = env
  }

  // ==========================================================================
  // Evaluation Operations
  // ==========================================================================

  async createEvaluation(config: EvaluationConfig): Promise<Evaluation> {
    // Validate required fields
    if (!config.prompt) {
      throw new Error('Missing required field: prompt')
    }
    if (!config.models || config.models.length === 0) {
      throw new Error('Models array cannot be empty')
    }

    const now = new Date().toISOString()
    const evaluation: Evaluation = {
      id: this.generateUUID(),
      name: config.name,
      description: config.description,
      type: config.type,
      prompt: config.prompt,
      expectedOutput: config.expectedOutput,
      models: config.models,
      dataset: config.dataset,
      scoringFunction: config.scoringFunction,
      metadata: config.metadata,
      createdAt: now,
      updatedAt: now,
    }

    this.evaluations.set(evaluation.id, evaluation)
    return evaluation
  }

  async getEvaluation(id: string): Promise<Evaluation | null> {
    return this.evaluations.get(id) ?? null
  }

  async listEvaluations(options?: ListEvaluationsOptions): Promise<Evaluation[]> {
    let evaluations = Array.from(this.evaluations.values())

    // Filter by type
    if (options?.type) {
      evaluations = evaluations.filter(e => e.type === options.type)
    }

    // Sort
    const orderBy = options?.orderBy ?? 'createdAt'
    const order = options?.order ?? 'asc'
    evaluations.sort((a, b) => {
      const aVal = a[orderBy] ?? ''
      const bVal = b[orderBy] ?? ''
      const cmp = aVal.localeCompare(bVal)
      return order === 'desc' ? -cmp : cmp
    })

    // Pagination
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? evaluations.length
    return evaluations.slice(offset, offset + limit)
  }

  async deleteEvaluation(id: string): Promise<boolean> {
    if (!this.evaluations.has(id)) {
      return false
    }
    this.evaluations.delete(id)
    return true
  }

  async runEvaluation(evaluationId: string, options?: RunOptions): Promise<EvaluationRun> {
    const evaluation = await this.getEvaluation(evaluationId)
    if (!evaluation) {
      throw new Error(`Evaluation not found: ${evaluationId}`)
    }

    const models = options?.models ?? evaluation.models
    const now = new Date().toISOString()

    const run: EvaluationRun = {
      id: this.generateUUID(),
      evaluationId,
      status: 'pending',
      startedAt: now,
      results: models.map(model => ({
        model,
        status: 'pending' as const,
        metrics: {
          latencyMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      })),
    }

    this.evaluationRuns.set(run.id, run)
    return run
  }

  async getEvaluationRun(runId: string): Promise<EvaluationRun | null> {
    return this.evaluationRuns.get(runId) ?? null
  }

  async listEvaluationRuns(evaluationId: string, options?: ListRunsOptions): Promise<EvaluationRun[]> {
    let runs = Array.from(this.evaluationRuns.values())
      .filter(r => r.evaluationId === evaluationId)

    if (options?.status) {
      runs = runs.filter(r => r.status === options.status)
    }

    const offset = options?.offset ?? 0
    const limit = options?.limit ?? runs.length
    return runs.slice(offset, offset + limit)
  }

  // ==========================================================================
  // Metrics Operations
  // ==========================================================================

  async collectMetric(runId: string, input: MetricInput): Promise<Metric> {
    // Validate metric value
    if (Number.isNaN(input.value)) {
      throw new Error('Invalid metric value: NaN')
    }

    const metric: Metric = {
      id: this.generateUUID(),
      runId,
      model: input.model,
      name: input.name,
      value: input.value,
      unit: input.unit,
      timestamp: input.timestamp ?? new Date().toISOString(),
      metadata: input.metadata,
    }

    if (!this.metrics.has(runId)) {
      this.metrics.set(runId, [])
    }
    this.metrics.get(runId)!.push(metric)

    return metric
  }

  async getMetrics(runId: string, options?: MetricQueryOptions): Promise<Metric[]> {
    let metrics = this.metrics.get(runId) ?? []

    if (options?.model) {
      metrics = metrics.filter(m => m.model === options.model)
    }
    if (options?.name) {
      metrics = metrics.filter(m => m.name === options.name)
    }
    if (options?.startTime) {
      metrics = metrics.filter(m => m.timestamp >= options.startTime!)
    }
    if (options?.endTime) {
      metrics = metrics.filter(m => m.timestamp <= options.endTime!)
    }
    if (options?.limit) {
      metrics = metrics.slice(0, options.limit)
    }

    return metrics
  }

  async aggregateMetrics(runId: string, options?: AggregateOptions): Promise<AggregatedMetrics> {
    const metrics = this.metrics.get(runId) ?? []
    const groupBy = options?.groupBy ?? 'model'

    // Group metrics
    const groups = new Map<string, Metric[]>()
    for (const metric of metrics) {
      const key = groupBy === 'model' ? metric.model : groupBy === 'name' ? metric.name : metric.timestamp
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(metric)
    }

    // Aggregate each group
    const result: MetricGroup[] = []
    for (const [key, groupMetrics] of groups) {
      // Group by metric name within each group
      const byName = new Map<string, number[]>()
      for (const m of groupMetrics) {
        if (!byName.has(m.name)) {
          byName.set(m.name, [])
        }
        byName.get(m.name)!.push(m.value)
      }

      const metricStats = []
      for (const [name, values] of byName) {
        values.sort((a, b) => a - b)
        const sum = values.reduce((a, b) => a + b, 0)
        const avg = sum / values.length
        const p50 = values[Math.floor(values.length * 0.5)] ?? 0
        const p95 = values[Math.floor(values.length * 0.95)] ?? values[values.length - 1] ?? 0
        const p99 = values[Math.floor(values.length * 0.99)] ?? values[values.length - 1] ?? 0

        metricStats.push({
          name,
          avg,
          min: Math.min(...values),
          max: Math.max(...values),
          sum,
          count: values.length,
          p50,
          p95,
          p99,
        })
      }

      result.push({ key, metrics: metricStats })
    }

    const timestamps = metrics.map(m => m.timestamp).sort()
    return {
      runId,
      groups: result,
      summary: {
        totalMetrics: metrics.length,
        startTime: timestamps[0] ?? new Date().toISOString(),
        endTime: timestamps[timestamps.length - 1] ?? new Date().toISOString(),
      },
    }
  }

  async getModelMetrics(model: string, options?: ModelMetricOptions): Promise<ModelAggregatedMetrics> {
    // Collect all metrics for this model across all runs
    const modelMetrics: Metric[] = []
    const runIds = new Set<string>()

    for (const [runId, metrics] of this.metrics) {
      // Filter by evaluationId if provided
      if (options?.evaluationId && !runId.startsWith(options.evaluationId)) {
        continue
      }
      for (const m of metrics) {
        if (m.model === model) {
          modelMetrics.push(m)
          runIds.add(runId)
        }
      }
    }

    // Calculate aggregations
    const latencies = modelMetrics.filter(m => m.name === 'latencyMs').map(m => m.value)
    const inputTokens = modelMetrics.filter(m => m.name === 'inputTokens').map(m => m.value)
    const outputTokens = modelMetrics.filter(m => m.name === 'outputTokens').map(m => m.value)
    const costs = modelMetrics.filter(m => m.name === 'cost').map(m => m.value)
    const scores = modelMetrics.filter(m => m.name === 'score').map(m => m.value)

    const calcStats = (values: number[]) => {
      if (values.length === 0) return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, total: 0 }
      values.sort((a, b) => a - b)
      const sum = values.reduce((a, b) => a + b, 0)
      return {
        avg: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p50: values[Math.floor(values.length * 0.5)] ?? 0,
        p95: values[Math.floor(values.length * 0.95)] ?? values[values.length - 1] ?? 0,
        p99: values[Math.floor(values.length * 0.99)] ?? values[values.length - 1] ?? 0,
        total: sum,
      }
    }

    const latencyStats = calcStats(latencies)
    const inputStats = calcStats(inputTokens)
    const outputStats = calcStats(outputTokens)
    const costStats = calcStats(costs)
    const scoreStats = scores.length > 0 ? calcStats(scores) : undefined

    return {
      model,
      totalRuns: runIds.size,
      metrics: {
        latencyMs: latencyStats,
        inputTokens: { avg: inputStats.avg, total: inputStats.total },
        outputTokens: { avg: outputStats.avg, total: outputStats.total },
        cost: { avg: costStats.avg, total: costStats.total },
        score: scoreStats ? { avg: scoreStats.avg, min: scoreStats.min, max: scoreStats.max } : undefined,
      },
    }
  }

  async compareModels(models: string[], metric: string, options?: CompareOptions): Promise<ModelComparison> {
    // Collect values for each model
    const modelValues: { model: string; values: number[] }[] = []

    for (const model of models) {
      const values: number[] = []
      for (const [, metrics] of this.metrics) {
        for (const m of metrics) {
          if (m.model === model && m.name === metric) {
            values.push(m.value)
          }
        }
      }
      modelValues.push({ model, values })
    }

    // Calculate average for each model
    const modelAvgs = modelValues.map(mv => ({
      model: mv.model,
      value: mv.values.length > 0 ? mv.values.reduce((a, b) => a + b, 0) / mv.values.length : 0,
    }))

    // Determine if lower is better (latency, cost) or higher is better (score, accuracy)
    const lowerIsBetter = metric === 'latencyMs' || metric === 'cost'

    // Sort by value
    modelAvgs.sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value)

    // Assign ranks
    const rankedModels = modelAvgs.map((ma, idx) => ({
      model: ma.model,
      value: ma.value,
      rank: idx + 1,
    }))

    const winner = rankedModels[0]?.model ?? ''
    const values = rankedModels.map(r => r.value)
    const difference = values.length >= 2 ? Math.abs(values[0] - values[1]) : 0
    const percentageDifference = values.length >= 2 && values[1] !== 0
      ? Math.abs((values[0] - values[1]) / values[1]) * 100
      : 0

    return {
      metric,
      models: rankedModels,
      winner,
      difference,
      percentageDifference,
    }
  }

  async getMetricTimeSeries(evaluationId: string, metric: string, options?: TimeSeriesOptions): Promise<TimeSeriesData> {
    const interval = options?.interval ?? 'minute'

    // Collect all metrics matching the evaluation
    const dataPoints: Map<string, { sum: number; count: number }> = new Map()

    for (const [runId, metrics] of this.metrics) {
      if (!runId.startsWith(evaluationId)) continue

      for (const m of metrics) {
        if (m.name !== metric) continue
        if (options?.model && m.model !== options.model) continue

        // Bucket by interval
        const date = new Date(m.timestamp)
        let bucket: string
        switch (interval) {
          case 'hour':
            bucket = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString()
            break
          case 'day':
            bucket = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
            break
          case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            bucket = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).toISOString()
            break
          default:
            bucket = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()).toISOString()
        }

        if (!dataPoints.has(bucket)) {
          dataPoints.set(bucket, { sum: 0, count: 0 })
        }
        const dp = dataPoints.get(bucket)!
        dp.sum += m.value
        dp.count++
      }
    }

    const sortedPoints = Array.from(dataPoints.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, dp]) => ({
        timestamp,
        value: dp.sum / dp.count,
        count: dp.count,
      }))

    return {
      evaluationId,
      metric,
      interval,
      dataPoints: sortedPoints,
    }
  }

  // ==========================================================================
  // Dataset Operations
  // ==========================================================================

  async createDataset(config: DatasetConfig): Promise<Dataset> {
    const now = new Date().toISOString()
    const id = this.generateUUID()

    const dataset: Dataset = {
      id,
      name: config.name,
      description: config.description,
      schema: config.schema,
      itemCount: config.items?.length ?? 0,
      metadata: config.metadata,
      createdAt: now,
      updatedAt: now,
    }

    this.datasets.set(id, dataset)

    // Store items if provided
    if (config.items && config.items.length > 0) {
      const items = config.items.map(item => ({
        ...item,
        id: item.id ?? this.generateUUID(),
      }))
      this.datasetItems.set(id, items)
    }

    return dataset
  }

  async getDataset(id: string): Promise<Dataset | null> {
    return this.datasets.get(id) ?? null
  }

  async listDatasets(options?: ListDatasetsOptions): Promise<Dataset[]> {
    let datasets = Array.from(this.datasets.values())

    const offset = options?.offset ?? 0
    const limit = options?.limit ?? datasets.length
    return datasets.slice(offset, offset + limit)
  }

  async updateDataset(id: string, updates: Partial<DatasetConfig>): Promise<Dataset> {
    const dataset = this.datasets.get(id)
    if (!dataset) {
      throw new Error(`Dataset not found: ${id}`)
    }

    const updated: Dataset = {
      ...dataset,
      name: updates.name ?? dataset.name,
      description: updates.description ?? dataset.description,
      schema: updates.schema ?? dataset.schema,
      metadata: updates.metadata ?? dataset.metadata,
      updatedAt: new Date().toISOString(),
    }

    this.datasets.set(id, updated)
    return updated
  }

  async deleteDataset(id: string): Promise<boolean> {
    if (!this.datasets.has(id)) {
      return false
    }
    this.datasets.delete(id)
    this.datasetItems.delete(id)
    return true
  }

  async addDatasetItems(datasetId: string, items: DatasetItem[]): Promise<number> {
    const dataset = this.datasets.get(datasetId)
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`)
    }

    if (!this.datasetItems.has(datasetId)) {
      this.datasetItems.set(datasetId, [])
    }

    const storedItems = items.map(item => ({
      ...item,
      id: item.id ?? this.generateUUID(),
    }))
    this.datasetItems.get(datasetId)!.push(...storedItems)

    // Update item count
    dataset.itemCount += items.length
    dataset.updatedAt = new Date().toISOString()
    this.datasets.set(datasetId, dataset)

    return items.length
  }

  async getDatasetItems(datasetId: string, options?: DatasetItemsOptions): Promise<DatasetItem[]> {
    let items = this.datasetItems.get(datasetId) ?? []

    if (options?.random) {
      items = [...items].sort(() => Math.random() - 0.5)
    }

    const offset = options?.offset ?? 0
    const limit = options?.limit ?? items.length
    return items.slice(offset, offset + limit)
  }

  // ==========================================================================
  // Test Suite Operations
  // ==========================================================================

  async createTestSuite(config: TestSuiteConfig): Promise<TestSuite> {
    const now = new Date().toISOString()
    const id = this.generateUUID()

    const suite: TestSuite = {
      id,
      name: config.name,
      description: config.description,
      evaluations: config.evaluations,
      datasets: config.datasets,
      models: config.models,
      scoringConfig: config.scoringConfig,
      parallelism: config.parallelism,
      timeout: config.timeout,
      retryConfig: config.retryConfig,
      metadata: config.metadata,
      createdAt: now,
      updatedAt: now,
    }

    this.testSuites.set(id, suite)
    return suite
  }

  async getTestSuite(id: string): Promise<TestSuite | null> {
    return this.testSuites.get(id) ?? null
  }

  async listTestSuites(options?: ListTestSuitesOptions): Promise<TestSuite[]> {
    let suites = Array.from(this.testSuites.values())

    const offset = options?.offset ?? 0
    const limit = options?.limit ?? suites.length
    return suites.slice(offset, offset + limit)
  }

  async deleteTestSuite(id: string): Promise<boolean> {
    if (!this.testSuites.has(id)) {
      return false
    }
    this.testSuites.delete(id)
    return true
  }

  async runTestSuite(suiteId: string, options?: TestSuiteRunOptions): Promise<TestSuiteRun> {
    const suite = await this.getTestSuite(suiteId)
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteId}`)
    }

    const now = new Date().toISOString()
    const isDryRun = options?.dryRun ?? false

    const run: TestSuiteRun = {
      id: this.generateUUID(),
      suiteId,
      status: isDryRun ? 'completed' : 'pending',
      progress: {
        total: suite.models.length * suite.evaluations.length,
        completed: isDryRun ? suite.models.length * suite.evaluations.length : 0,
        failed: 0,
        percentage: isDryRun ? 100 : 0,
      },
      startedAt: now,
      completedAt: isDryRun ? now : undefined,
      results: isDryRun ? this.generateDryRunResults(suite) : undefined,
    }

    this.testSuiteRuns.set(run.id, run)
    return run
  }

  private generateDryRunResults(suite: TestSuite): TestSuiteResults {
    return {
      overall: {
        passed: suite.models.length * suite.evaluations.length,
        failed: 0,
        skipped: 0,
        score: 1.0,
      },
      byModel: suite.models.map(model => ({
        model,
        passed: suite.evaluations.length,
        failed: 0,
        score: 1.0,
        latency: { avg: 100, p50: 100, p95: 150 },
        cost: 0.001,
      })),
      byEvaluation: suite.evaluations.map(evalId => ({
        evaluationId: evalId,
        name: evalId,
        passed: suite.models.length,
        failed: 0,
        score: 1.0,
      })),
      byDataset: suite.datasets.map(datasetId => ({
        datasetId,
        name: datasetId,
        passed: suite.models.length,
        failed: 0,
        score: 1.0,
      })),
      failures: [],
    }
  }

  async getTestSuiteRun(runId: string): Promise<TestSuiteRun | null> {
    return this.testSuiteRuns.get(runId) ?? null
  }

  async cancelTestSuiteRun(runId: string): Promise<boolean> {
    const run = this.testSuiteRuns.get(runId)
    if (!run) {
      return false
    }
    if (run.status === 'completed' || run.status === 'failed') {
      return false
    }

    run.status = 'cancelled'
    run.completedAt = new Date().toISOString()
    this.testSuiteRuns.set(runId, run)
    return true
  }

  // ==========================================================================
  // Report Operations
  // ==========================================================================

  async generateReport(runId: string, options?: ReportOptions): Promise<EvaluationReport> {
    const now = new Date().toISOString()
    const reportId = this.generateUUID()

    // Generate mock report data
    const report: EvaluationReport = {
      id: reportId,
      runId,
      evaluationName: 'Test Evaluation',
      evaluationType: 'accuracy',
      generatedAt: now,
      summary: {
        totalModels: 3,
        totalPrompts: 10,
        duration: 5000,
        bestModel: { model: 'gpt-4o', score: 0.95 },
        worstModel: { model: 'llama-3-70b', score: 0.85 },
        averageLatency: 150,
        totalCost: 0.05,
        overallScore: 0.9,
      },
      modelResults: [
        {
          model: 'gpt-4o',
          rank: 1,
          score: 0.95,
          accuracy: 0.95,
          latency: { avg: 120, min: 80, max: 200, p50: 115, p95: 180, p99: 195 },
          tokens: { input: 1000, output: 500, total: 1500 },
          cost: 0.02,
          samples: options?.includeRawData ? [
            { promptIndex: 0, prompt: 'Test', actualOutput: 'Response', score: 0.95, latency: 120 },
          ] : [],
        },
        {
          model: 'claude-sonnet-4-20250514',
          rank: 2,
          score: 0.92,
          accuracy: 0.92,
          latency: { avg: 140, min: 90, max: 220, p50: 135, p95: 200, p99: 215 },
          tokens: { input: 1000, output: 550, total: 1550 },
          cost: 0.015,
          samples: [],
        },
        {
          model: 'llama-3-70b',
          rank: 3,
          score: 0.85,
          accuracy: 0.85,
          latency: { avg: 180, min: 100, max: 300, p50: 170, p95: 280, p99: 295 },
          tokens: { input: 1000, output: 600, total: 1600 },
          cost: 0.015,
          samples: [],
        },
      ],
      charts: options?.includeCharts ? [
        {
          type: 'bar',
          title: 'Model Scores',
          data: {
            labels: ['gpt-4o', 'claude-sonnet-4-20250514', 'llama-3-70b'],
            datasets: [{ label: 'Score', data: [0.95, 0.92, 0.85] }],
          },
        },
      ] : undefined,
    }

    this.reports.set(reportId, report)
    return report
  }

  async generateComparisonReport(runIds: string[], options?: ComparisonReportOptions): Promise<ComparisonReport> {
    const now = new Date().toISOString()

    const comparisons: RunComparison[] = runIds.map((runId, idx) => ({
      runId,
      evaluationName: `Evaluation ${idx + 1}`,
      timestamp: now,
      models: ['gpt-4o', 'claude-sonnet-4-20250514'],
      metrics: [
        { name: 'score', value: 0.9 + idx * 0.01, change: idx > 0 ? 0.01 : undefined, changePercent: idx > 0 ? 1.1 : undefined },
        { name: 'latency', value: 150 - idx * 5, change: idx > 0 ? -5 : undefined, changePercent: idx > 0 ? -3.3 : undefined },
      ],
    }))

    return {
      id: this.generateUUID(),
      runIds,
      generatedAt: now,
      baseline: options?.baseline,
      comparisons,
      trends: {
        metric: 'score',
        trend: 'improving',
        slope: 0.01,
        confidence: 0.85,
        dataPoints: runIds.map((_, idx) => ({
          timestamp: new Date(Date.now() - (runIds.length - idx) * 86400000).toISOString(),
          value: 0.9 + idx * 0.01,
        })),
      },
      recommendations: [
        'Consider using gpt-4o for best accuracy',
        'Monitor latency trends for llama-3-70b',
      ],
    }
  }

  async getLeaderboard(options?: LeaderboardOptions): Promise<Leaderboard> {
    const metric = options?.metric ?? 'score'
    const limit = options?.limit ?? 10
    const now = new Date().toISOString()

    // Collect model data
    const modelData = new Map<string, { values: number[]; evalCount: number }>()

    for (const [, metrics] of this.metrics) {
      for (const m of metrics) {
        if (m.name === metric || (metric === 'score' && m.name === 'score') ||
            (metric === 'latency' && m.name === 'latencyMs') ||
            (metric === 'cost' && m.name === 'cost')) {
          if (!modelData.has(m.model)) {
            modelData.set(m.model, { values: [], evalCount: 0 })
          }
          const data = modelData.get(m.model)!
          data.values.push(m.value)
          data.evalCount++
        }
      }
    }

    // If no data, return mock leaderboard
    if (modelData.size === 0) {
      const mockModels = ['gpt-4o', 'claude-sonnet-4-20250514', 'llama-3-70b']
      const lowerIsBetter = metric === 'latency' || metric === 'cost'
      const mockValues = lowerIsBetter ? [100, 120, 150] : [0.95, 0.92, 0.85]

      return {
        metric,
        generatedAt: now,
        entries: mockModels.slice(0, limit).map((model, idx) => ({
          rank: idx + 1,
          model,
          value: mockValues[idx],
          evaluationCount: 5,
          trend: 'stable' as const,
        })),
        metadata: {
          totalEvaluations: 3,
          totalRuns: 5,
          timeRange: options?.timeRange ?? {
            start: new Date(Date.now() - 7 * 86400000).toISOString(),
            end: now,
          },
        },
      }
    }

    // Calculate averages and sort
    const entries: Array<{ model: string; avg: number; evalCount: number }> = []
    for (const [model, data] of modelData) {
      const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length
      entries.push({ model, avg, evalCount: data.evalCount })
    }

    const lowerIsBetter = metric === 'latency' || metric === 'cost'
    entries.sort((a, b) => lowerIsBetter ? a.avg - b.avg : b.avg - a.avg)

    return {
      metric,
      generatedAt: now,
      entries: entries.slice(0, limit).map((e, idx) => ({
        rank: idx + 1,
        model: e.model,
        value: e.avg,
        evaluationCount: e.evalCount,
        trend: 'stable' as const,
      })),
      metadata: {
        totalEvaluations: modelData.size,
        totalRuns: Array.from(modelData.values()).reduce((sum, d) => sum + d.evalCount, 0),
        timeRange: options?.timeRange ?? {
          start: new Date(Date.now() - 7 * 86400000).toISOString(),
          end: now,
        },
      },
    }
  }

  async exportReport(reportId: string, format: ExportFormat): Promise<ExportedReport> {
    const report = this.reports.get(reportId)
    if (!report) {
      throw new Error(`Report not found: ${reportId}`)
    }

    let content: string
    let mimeType: string
    let ext: string

    switch (format) {
      case 'json':
        content = JSON.stringify(report, null, 2)
        mimeType = 'application/json'
        ext = 'json'
        break
      case 'csv':
        content = this.reportToCsv(report)
        mimeType = 'text/csv'
        ext = 'csv'
        break
      case 'markdown':
        content = this.reportToMarkdown(report)
        mimeType = 'text/markdown'
        ext = 'md'
        break
      case 'html':
        content = this.reportToHtml(report)
        mimeType = 'text/html'
        ext = 'html'
        break
      case 'pdf':
        // PDF not implemented, return HTML
        content = this.reportToHtml(report)
        mimeType = 'application/pdf'
        ext = 'pdf'
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    return {
      reportId,
      format,
      content,
      filename: `report-${reportId}.${ext}`,
      mimeType,
    }
  }

  private reportToCsv(report: EvaluationReport): string {
    const headers = ['Model', 'Rank', 'Score', 'Latency Avg', 'Cost']
    const rows = report.modelResults.map(r => [r.model, r.rank, r.score, r.latency.avg, r.cost].join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  private reportToMarkdown(report: EvaluationReport): string {
    let md = `# Evaluation Report: ${report.evaluationName}\n\n`
    md += `Generated: ${report.generatedAt}\n\n`
    md += `## Summary\n\n`
    md += `- Best Model: ${report.summary.bestModel.model} (${report.summary.bestModel.score})\n`
    md += `- Overall Score: ${report.summary.overallScore}\n\n`
    md += `## Model Results\n\n`
    md += `| Model | Rank | Score | Latency |\n`
    md += `|-------|------|-------|--------|\n`
    for (const r of report.modelResults) {
      md += `| ${r.model} | ${r.rank} | ${r.score} | ${r.latency.avg}ms |\n`
    }
    return md
  }

  private reportToHtml(report: EvaluationReport): string {
    return `<!DOCTYPE html>
<html>
<head><title>Evaluation Report</title></head>
<body>
<h1>Evaluation Report: ${report.evaluationName}</h1>
<p>Generated: ${report.generatedAt}</p>
<h2>Summary</h2>
<ul>
<li>Best Model: ${report.summary.bestModel.model}</li>
<li>Overall Score: ${report.summary.overallScore}</li>
</ul>
<h2>Results</h2>
<table>
<tr><th>Model</th><th>Rank</th><th>Score</th></tr>
${report.modelResults.map(r => `<tr><td>${r.model}</td><td>${r.rank}</td><td>${r.score}</td></tr>`).join('\n')}
</table>
</body>
</html>`
  }

  // ==========================================================================
  // RPC Interface
  // ==========================================================================

  hasMethod(name: string): boolean {
    return ALLOWED_METHODS.has(name)
  }

  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.hasMethod(method)) {
      throw new Error(`Method '${method}' not allowed or not found`)
    }

    const fn = (this as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method '${method}' not found`)
    }

    return fn.apply(this, params)
  }

  // ==========================================================================
  // HTTP Handler
  // ==========================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    try {
      // HATEOAS discovery at root
      if (path === '/' && method === 'GET') {
        return this.jsonResponse({
          api: 'evals.do',
          version: '1.0.0',
          description: 'AI Evaluations and Benchmarks Service',
          links: {
            evaluations: '/api/evaluations',
            datasets: '/api/datasets',
            suites: '/api/suites',
            leaderboard: '/api/leaderboard',
            rpc: '/rpc',
          },
          discover: {
            methods: Array.from(ALLOWED_METHODS).map(name => ({ name })),
          },
        })
      }

      // RPC endpoint
      if (path === '/rpc' && method === 'POST') {
        const body = await request.json() as { method: string; params: unknown[] }
        if (!this.hasMethod(body.method)) {
          return this.jsonResponse({ error: `Method '${body.method}' not allowed` }, 400)
        }
        try {
          const result = await this.invoke(body.method, body.params)
          return this.jsonResponse({ result })
        } catch (err) {
          return this.jsonResponse({ error: (err as Error).message }, 400)
        }
      }

      // === Evaluation endpoints ===

      // List evaluations
      if (path === '/api/evaluations' && method === 'GET') {
        const evaluations = await this.listEvaluations()
        return this.jsonResponse(evaluations)
      }

      // Create evaluation
      if (path === '/api/evaluations' && method === 'POST') {
        const config = await request.json() as EvaluationConfig
        const evaluation = await this.createEvaluation(config)
        return this.jsonResponse(evaluation, 201)
      }

      // Get/Delete evaluation by ID
      const evalMatch = path.match(/^\/api\/evaluations\/([^/]+)$/)
      if (evalMatch) {
        const id = evalMatch[1]
        if (method === 'GET') {
          const evaluation = await this.getEvaluation(id)
          if (!evaluation) {
            return this.jsonResponse({ error: 'Evaluation not found' }, 404)
          }
          return this.jsonResponse(evaluation)
        }
        if (method === 'DELETE') {
          await this.deleteEvaluation(id)
          return this.jsonResponse({ success: true })
        }
      }

      // Run evaluation
      const runEvalMatch = path.match(/^\/api\/evaluations\/([^/]+)\/run$/)
      if (runEvalMatch && method === 'POST') {
        const id = runEvalMatch[1]
        const options = await request.json() as RunOptions
        try {
          const run = await this.runEvaluation(id, options)
          return this.jsonResponse(run)
        } catch (err) {
          return this.jsonResponse({ error: (err as Error).message }, 404)
        }
      }

      // List evaluation runs
      const listRunsMatch = path.match(/^\/api\/evaluations\/([^/]+)\/runs$/)
      if (listRunsMatch && method === 'GET') {
        const id = listRunsMatch[1]
        const runs = await this.listEvaluationRuns(id)
        return this.jsonResponse(runs)
      }

      // === Metrics endpoints ===

      // Get metrics for run
      const metricsMatch = path.match(/^\/api\/runs\/([^/]+)\/metrics$/)
      if (metricsMatch && method === 'GET') {
        const runId = metricsMatch[1]
        const metrics = await this.getMetrics(runId)
        return this.jsonResponse(metrics)
      }

      // Aggregate metrics
      const aggregateMatch = path.match(/^\/api\/runs\/([^/]+)\/metrics\/aggregate$/)
      if (aggregateMatch && method === 'GET') {
        const runId = aggregateMatch[1]
        const aggregated = await this.aggregateMetrics(runId)
        return this.jsonResponse(aggregated)
      }

      // Model metrics
      const modelMetricsMatch = path.match(/^\/api\/models\/([^/]+)\/metrics$/)
      if (modelMetricsMatch && method === 'GET') {
        const model = decodeURIComponent(modelMetricsMatch[1])
        const modelMetrics = await this.getModelMetrics(model)
        return this.jsonResponse(modelMetrics)
      }

      // Compare models
      if (path === '/api/models/compare' && method === 'POST') {
        const body = await request.json() as { models: string[]; metric: string }
        const comparison = await this.compareModels(body.models, body.metric)
        return this.jsonResponse(comparison)
      }

      // Time series
      const timeSeriesMatch = path.match(/^\/api\/evaluations\/([^/]+)\/timeseries\/([^/]+)$/)
      if (timeSeriesMatch && method === 'GET') {
        const evalId = timeSeriesMatch[1]
        const metric = timeSeriesMatch[2]
        const timeSeries = await this.getMetricTimeSeries(evalId, metric)
        return this.jsonResponse(timeSeries)
      }

      // === Dataset endpoints ===

      // List datasets
      if (path === '/api/datasets' && method === 'GET') {
        const datasets = await this.listDatasets()
        return this.jsonResponse(datasets)
      }

      // Create dataset
      if (path === '/api/datasets' && method === 'POST') {
        const config = await request.json() as DatasetConfig
        const dataset = await this.createDataset(config)
        return this.jsonResponse(dataset, 201)
      }

      // Get dataset items
      const datasetItemsMatch = path.match(/^\/api\/datasets\/([^/]+)\/items$/)
      if (datasetItemsMatch && method === 'GET') {
        const datasetId = datasetItemsMatch[1]
        const items = await this.getDatasetItems(datasetId)
        return this.jsonResponse(items)
      }

      // === Test Suite endpoints ===

      // List suites
      if (path === '/api/suites' && method === 'GET') {
        const suites = await this.listTestSuites()
        return this.jsonResponse(suites)
      }

      // Create suite
      if (path === '/api/suites' && method === 'POST') {
        const config = await request.json() as TestSuiteConfig
        const suite = await this.createTestSuite(config)
        return this.jsonResponse(suite, 201)
      }

      // Run suite
      const runSuiteMatch = path.match(/^\/api\/suites\/([^/]+)\/run$/)
      if (runSuiteMatch && method === 'POST') {
        const suiteId = runSuiteMatch[1]
        const options = await request.json() as TestSuiteRunOptions
        try {
          const run = await this.runTestSuite(suiteId, options)
          return this.jsonResponse(run)
        } catch (err) {
          return this.jsonResponse({ error: (err as Error).message }, 404)
        }
      }

      // Get suite run
      const suiteRunMatch = path.match(/^\/api\/suites\/([^/]+)\/runs\/([^/]+)$/)
      if (suiteRunMatch && method === 'GET') {
        const runId = suiteRunMatch[2]
        const run = await this.getTestSuiteRun(runId)
        if (!run) {
          return this.jsonResponse({ error: 'Run not found' }, 404)
        }
        return this.jsonResponse(run)
      }

      // Cancel suite run
      const cancelRunMatch = path.match(/^\/api\/suites\/([^/]+)\/runs\/([^/]+)\/cancel$/)
      if (cancelRunMatch && method === 'POST') {
        const runId = cancelRunMatch[2]
        const success = await this.cancelTestSuiteRun(runId)
        return this.jsonResponse({ success })
      }

      // === Report endpoints ===

      // Generate report
      const reportMatch = path.match(/^\/api\/runs\/([^/]+)\/report$/)
      if (reportMatch && method === 'GET') {
        const runId = reportMatch[1]
        const report = await this.generateReport(runId)
        return this.jsonResponse(report)
      }

      // Compare reports
      if (path === '/api/reports/compare' && method === 'POST') {
        const body = await request.json() as { runIds: string[] }
        const comparison = await this.generateComparisonReport(body.runIds)
        return this.jsonResponse(comparison)
      }

      // Leaderboard
      if (path === '/api/leaderboard' && method === 'GET') {
        const metric = url.searchParams.get('metric') as 'score' | 'latency' | 'cost' | 'accuracy' | undefined
        const limitParam = url.searchParams.get('limit')
        const limit = limitParam ? parseInt(limitParam, 10) : undefined
        const leaderboard = await this.getLeaderboard({ metric, limit })
        return this.jsonResponse(leaderboard)
      }

      // Export report
      const exportMatch = path.match(/^\/api\/reports\/([^/]+)\/export\/([^/]+)$/)
      if (exportMatch && method === 'GET') {
        const reportId = exportMatch[1]
        const format = exportMatch[2] as ExportFormat

        // Generate a report first if it doesn't exist
        if (!this.reports.has(reportId)) {
          await this.generateReport(reportId)
        }

        try {
          const exported = await this.exportReport(reportId, format)
          return new Response(exported.content as string, {
            headers: { 'Content-Type': exported.mimeType },
          })
        } catch (err) {
          return this.jsonResponse({ error: (err as Error).message }, 404)
        }
      }

      return this.jsonResponse({ error: 'Not found' }, 404)
    } catch (err) {
      return this.jsonResponse({ error: (err as Error).message }, 500)
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  private jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export default { EvalsDO }
