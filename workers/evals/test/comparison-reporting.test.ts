/**
 * RED Tests: evals.do Comparison Reporting
 *
 * These tests define the contract for the evals.do worker's comparison and reporting features.
 * The EvalsDO must generate comprehensive reports and comparisons.
 *
 * RED PHASE: These tests MUST FAIL because EvalsDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-ig6n).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockEvalsEnv } from './helpers.js'

/**
 * Interface definition for EvalsDO reporting operations
 */
interface EvalsDOReportingContract {
  // Report generation
  generateReport(runId: string, options?: ReportOptions): Promise<EvaluationReport>
  generateComparisonReport(runIds: string[], options?: ComparisonReportOptions): Promise<ComparisonReport>

  // Leaderboard
  getLeaderboard(options?: LeaderboardOptions): Promise<Leaderboard>

  // Export
  exportReport(reportId: string, format: ExportFormat): Promise<ExportedReport>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Options for generating a report
 */
interface ReportOptions {
  includeRawData?: boolean
  includeCharts?: boolean
  metrics?: string[]
}

/**
 * A comprehensive evaluation report
 */
interface EvaluationReport {
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

/**
 * Summary section of a report
 */
interface ReportSummary {
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

/**
 * Results for a model in a report
 */
interface ModelReportResult {
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

/**
 * Individual sample result
 */
interface SampleResult {
  promptIndex: number
  prompt: string
  expectedOutput?: string
  actualOutput: string
  score: number
  latency: number
  correct?: boolean
}

/**
 * Chart data for visualization
 */
interface ChartData {
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

/**
 * Options for comparison report
 */
interface ComparisonReportOptions {
  metrics?: string[]
  includeCharts?: boolean
  baseline?: string
}

/**
 * A comparison report between runs
 */
interface ComparisonReport {
  id: string
  runIds: string[]
  generatedAt: string
  baseline?: string
  comparisons: RunComparison[]
  trends: TrendAnalysis
  recommendations: string[]
}

/**
 * Comparison between runs
 */
interface RunComparison {
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

/**
 * Trend analysis
 */
interface TrendAnalysis {
  metric: string
  trend: 'improving' | 'declining' | 'stable'
  slope: number
  confidence: number
  dataPoints: { timestamp: string; value: number }[]
}

/**
 * Options for leaderboard
 */
interface LeaderboardOptions {
  metric?: 'score' | 'latency' | 'cost' | 'accuracy'
  evaluationType?: string
  limit?: number
  timeRange?: {
    start: string
    end: string
  }
}

/**
 * Leaderboard data
 */
interface Leaderboard {
  metric: string
  generatedAt: string
  entries: LeaderboardEntry[]
  metadata: {
    totalEvaluations: number
    totalRuns: number
    timeRange: { start: string; end: string }
  }
}

/**
 * A leaderboard entry
 */
interface LeaderboardEntry {
  rank: number
  model: string
  value: number
  evaluationCount: number
  trend: 'up' | 'down' | 'stable'
  previousRank?: number
}

/**
 * Export format
 */
type ExportFormat = 'json' | 'csv' | 'markdown' | 'html' | 'pdf'

/**
 * Exported report
 */
interface ExportedReport {
  reportId: string
  format: ExportFormat
  content: string | Buffer
  filename: string
  mimeType: string
}

/**
 * Attempt to load EvalsDO - this will fail in RED phase
 */
async function loadEvalsDO(): Promise<new (ctx: MockDOState, env: MockEvalsEnv) => EvalsDOReportingContract> {
  const module = await import('../src/evals.js')
  return module.EvalsDO
}

describe('EvalsDO Comparison Reporting', () => {
  let ctx: MockDOState
  let env: MockEvalsEnv
  let EvalsDO: new (ctx: MockDOState, env: MockEvalsEnv) => EvalsDOReportingContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalsDO = await loadEvalsDO()
  })

  describe('generateReport()', () => {
    it('should generate a basic evaluation report', async () => {
      const instance = new EvalsDO(ctx, env)
      // Assume run exists from prior setup
      const report = await instance.generateReport('run-123')

      expect(report.id).toBeDefined()
      expect(report.runId).toBe('run-123')
      expect(report.generatedAt).toBeDefined()
      expect(report.summary).toBeDefined()
      expect(report.modelResults).toBeInstanceOf(Array)
    })

    it('should include summary statistics', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateReport('run-123')

      expect(report.summary.totalModels).toBeGreaterThan(0)
      expect(report.summary.bestModel).toBeDefined()
      expect(report.summary.worstModel).toBeDefined()
      expect(report.summary.averageLatency).toBeGreaterThanOrEqual(0)
      expect(report.summary.overallScore).toBeGreaterThanOrEqual(0)
      expect(report.summary.overallScore).toBeLessThanOrEqual(1)
    })

    it('should rank models in results', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateReport('run-123')

      const ranks = report.modelResults.map(r => r.rank)
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    })

    it('should include latency percentiles', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateReport('run-123')

      const modelResult = report.modelResults[0]
      expect(modelResult?.latency.p50).toBeDefined()
      expect(modelResult?.latency.p95).toBeDefined()
      expect(modelResult?.latency.p99).toBeDefined()
    })

    it('should include token usage', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateReport('run-123')

      const modelResult = report.modelResults[0]
      expect(modelResult?.tokens.input).toBeGreaterThanOrEqual(0)
      expect(modelResult?.tokens.output).toBeGreaterThanOrEqual(0)
      expect(modelResult?.tokens.total).toBe(
        (modelResult?.tokens.input ?? 0) + (modelResult?.tokens.output ?? 0)
      )
    })

    it('should include sample results when requested', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateReport('run-123', { includeRawData: true })

      const modelResult = report.modelResults[0]
      expect(modelResult?.samples).toBeInstanceOf(Array)
      expect(modelResult?.samples.length).toBeGreaterThan(0)
      expect(modelResult?.samples[0]?.prompt).toBeDefined()
      expect(modelResult?.samples[0]?.actualOutput).toBeDefined()
    })

    it('should include chart data when requested', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateReport('run-123', { includeCharts: true })

      expect(report.charts).toBeInstanceOf(Array)
      expect(report.charts?.length).toBeGreaterThan(0)
      expect(report.charts?.[0]?.type).toBeDefined()
      expect(report.charts?.[0]?.data).toBeDefined()
    })

    it('should filter metrics when specified', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateReport('run-123', { metrics: ['latency', 'score'] })

      // Report should focus on specified metrics
      expect(report.modelResults[0]?.latency).toBeDefined()
      expect(report.modelResults[0]?.score).toBeDefined()
    })
  })

  describe('generateComparisonReport()', () => {
    it('should compare multiple runs', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateComparisonReport(['run-1', 'run-2', 'run-3'])

      expect(report.id).toBeDefined()
      expect(report.runIds).toEqual(['run-1', 'run-2', 'run-3'])
      expect(report.comparisons).toHaveLength(3)
    })

    it('should calculate changes relative to baseline', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateComparisonReport(['run-1', 'run-2'], { baseline: 'run-1' })

      expect(report.baseline).toBe('run-1')
      const comparison = report.comparisons.find(c => c.runId === 'run-2')
      expect(comparison?.metrics[0]?.change).toBeDefined()
      expect(comparison?.metrics[0]?.changePercent).toBeDefined()
    })

    it('should include trend analysis', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateComparisonReport(['run-1', 'run-2', 'run-3', 'run-4', 'run-5'])

      expect(report.trends).toBeDefined()
      expect(report.trends.trend).toMatch(/improving|declining|stable/)
      expect(report.trends.confidence).toBeGreaterThanOrEqual(0)
      expect(report.trends.confidence).toBeLessThanOrEqual(1)
    })

    it('should provide recommendations', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateComparisonReport(['run-1', 'run-2'])

      expect(report.recommendations).toBeInstanceOf(Array)
      expect(report.recommendations.length).toBeGreaterThan(0)
    })

    it('should include charts when requested', async () => {
      const instance = new EvalsDO(ctx, env)
      const report = await instance.generateComparisonReport(['run-1', 'run-2'], { includeCharts: true })

      // Charts should be part of the comparison structure
      expect(report.comparisons.length).toBeGreaterThan(0)
    })
  })

  describe('getLeaderboard()', () => {
    it('should return model leaderboard by default metric', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard()

      expect(leaderboard.metric).toBeDefined()
      expect(leaderboard.generatedAt).toBeDefined()
      expect(leaderboard.entries).toBeInstanceOf(Array)
    })

    it('should return leaderboard by score', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard({ metric: 'score' })

      expect(leaderboard.metric).toBe('score')
      // Higher score is better, so should be sorted descending
      const values = leaderboard.entries.map(e => e.value)
      expect(values).toEqual([...values].sort((a, b) => b - a))
    })

    it('should return leaderboard by latency', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard({ metric: 'latency' })

      expect(leaderboard.metric).toBe('latency')
      // Lower latency is better, so should be sorted ascending
      const values = leaderboard.entries.map(e => e.value)
      expect(values).toEqual([...values].sort((a, b) => a - b))
    })

    it('should return leaderboard by cost', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard({ metric: 'cost' })

      expect(leaderboard.metric).toBe('cost')
      // Lower cost is better
    })

    it('should include rank information', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard()

      expect(leaderboard.entries[0]?.rank).toBe(1)
      expect(leaderboard.entries[1]?.rank).toBe(2)
    })

    it('should include trend indicators', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard()

      const entry = leaderboard.entries[0]
      expect(entry?.trend).toMatch(/up|down|stable/)
    })

    it('should respect limit option', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard({ limit: 5 })

      expect(leaderboard.entries.length).toBeLessThanOrEqual(5)
    })

    it('should filter by evaluation type', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard({ evaluationType: 'accuracy' })

      expect(leaderboard.metadata).toBeDefined()
    })

    it('should filter by time range', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard({
        timeRange: {
          start: '2025-01-01T00:00:00Z',
          end: '2025-01-07T23:59:59Z',
        },
      })

      expect(leaderboard.metadata.timeRange.start).toBe('2025-01-01T00:00:00Z')
    })

    it('should include metadata', async () => {
      const instance = new EvalsDO(ctx, env)
      const leaderboard = await instance.getLeaderboard()

      expect(leaderboard.metadata.totalEvaluations).toBeGreaterThanOrEqual(0)
      expect(leaderboard.metadata.totalRuns).toBeGreaterThanOrEqual(0)
    })
  })

  describe('exportReport()', () => {
    it('should export report as JSON', async () => {
      const instance = new EvalsDO(ctx, env)
      const exported = await instance.exportReport('report-123', 'json')

      expect(exported.reportId).toBe('report-123')
      expect(exported.format).toBe('json')
      expect(exported.mimeType).toBe('application/json')
      expect(exported.filename).toContain('.json')
      expect(typeof exported.content).toBe('string')
      expect(() => JSON.parse(exported.content as string)).not.toThrow()
    })

    it('should export report as CSV', async () => {
      const instance = new EvalsDO(ctx, env)
      const exported = await instance.exportReport('report-123', 'csv')

      expect(exported.format).toBe('csv')
      expect(exported.mimeType).toBe('text/csv')
      expect(exported.filename).toContain('.csv')
      expect(typeof exported.content).toBe('string')
      expect(exported.content).toContain(',')
    })

    it('should export report as Markdown', async () => {
      const instance = new EvalsDO(ctx, env)
      const exported = await instance.exportReport('report-123', 'markdown')

      expect(exported.format).toBe('markdown')
      expect(exported.mimeType).toBe('text/markdown')
      expect(exported.filename).toContain('.md')
      expect(typeof exported.content).toBe('string')
      expect(exported.content).toContain('#') // Markdown headers
    })

    it('should export report as HTML', async () => {
      const instance = new EvalsDO(ctx, env)
      const exported = await instance.exportReport('report-123', 'html')

      expect(exported.format).toBe('html')
      expect(exported.mimeType).toBe('text/html')
      expect(exported.filename).toContain('.html')
      expect(typeof exported.content).toBe('string')
      expect(exported.content).toContain('<html')
    })

    it('should throw for non-existent report', async () => {
      const instance = new EvalsDO(ctx, env)
      await expect(instance.exportReport('nonexistent', 'json')).rejects.toThrow(/not found/i)
    })
  })

  describe('HTTP endpoints for reporting', () => {
    it('should handle GET /api/runs/:runId/report', async () => {
      const instance = new EvalsDO(ctx, env)
      const request = new Request('http://evals.do/api/runs/run-123/report', { method: 'GET' })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json() as EvaluationReport
      expect(data.runId).toBe('run-123')
    })

    it('should handle POST /api/reports/compare', async () => {
      const instance = new EvalsDO(ctx, env)
      const request = new Request('http://evals.do/api/reports/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runIds: ['run-1', 'run-2'],
        }),
      })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json() as ComparisonReport
      expect(data.runIds).toEqual(['run-1', 'run-2'])
    })

    it('should handle GET /api/leaderboard', async () => {
      const instance = new EvalsDO(ctx, env)
      const request = new Request('http://evals.do/api/leaderboard', { method: 'GET' })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json() as Leaderboard
      expect(data.entries).toBeInstanceOf(Array)
    })

    it('should handle GET /api/leaderboard with query params', async () => {
      const instance = new EvalsDO(ctx, env)
      const request = new Request('http://evals.do/api/leaderboard?metric=latency&limit=10', {
        method: 'GET',
      })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json() as Leaderboard
      expect(data.metric).toBe('latency')
    })

    it('should handle GET /api/reports/:reportId/export/:format', async () => {
      const instance = new EvalsDO(ctx, env)
      const request = new Request('http://evals.do/api/reports/report-123/export/json', {
        method: 'GET',
      })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should handle GET /api/reports/:reportId/export/csv', async () => {
      const instance = new EvalsDO(ctx, env)
      const request = new Request('http://evals.do/api/reports/report-123/export/csv', {
        method: 'GET',
      })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
    })

    it('should handle GET /api/reports/:reportId/export/markdown', async () => {
      const instance = new EvalsDO(ctx, env)
      const request = new Request('http://evals.do/api/reports/report-123/export/markdown', {
        method: 'GET',
      })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/markdown')
    })
  })
})
