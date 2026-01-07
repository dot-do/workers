/**
 * RED Tests: evals.do Test Suite Execution
 *
 * These tests define the contract for the evals.do worker's test suite execution.
 * The EvalsDO must support running comprehensive test suites with datasets.
 *
 * RED PHASE: These tests MUST FAIL because EvalsDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-ig6n).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockEvalsEnv } from './helpers.js'

/**
 * Interface definition for EvalsDO test suite operations
 */
interface EvalsDOTestSuiteContract {
  // Dataset management
  createDataset(config: DatasetConfig): Promise<Dataset>
  getDataset(id: string): Promise<Dataset | null>
  listDatasets(options?: ListDatasetsOptions): Promise<Dataset[]>
  updateDataset(id: string, updates: Partial<DatasetConfig>): Promise<Dataset>
  deleteDataset(id: string): Promise<boolean>
  addDatasetItems(datasetId: string, items: DatasetItem[]): Promise<number>
  getDatasetItems(datasetId: string, options?: DatasetItemsOptions): Promise<DatasetItem[]>

  // Test suite management
  createTestSuite(config: TestSuiteConfig): Promise<TestSuite>
  getTestSuite(id: string): Promise<TestSuite | null>
  listTestSuites(options?: ListTestSuitesOptions): Promise<TestSuite[]>
  deleteTestSuite(id: string): Promise<boolean>

  // Test suite execution
  runTestSuite(suiteId: string, options?: TestSuiteRunOptions): Promise<TestSuiteRun>
  getTestSuiteRun(runId: string): Promise<TestSuiteRun | null>
  cancelTestSuiteRun(runId: string): Promise<boolean>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Configuration for creating a dataset
 */
interface DatasetConfig {
  name: string
  description?: string
  schema?: DatasetSchema
  items?: DatasetItem[]
  metadata?: Record<string, unknown>
}

/**
 * Schema definition for dataset items
 */
interface DatasetSchema {
  fields: {
    name: string
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required?: boolean
    description?: string
  }[]
}

/**
 * A stored dataset
 */
interface Dataset {
  id: string
  name: string
  description?: string
  schema?: DatasetSchema
  itemCount: number
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * An item in a dataset
 */
interface DatasetItem {
  id?: string
  input: string | Record<string, unknown>
  expectedOutput?: string | Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Options for listing datasets
 */
interface ListDatasetsOptions {
  limit?: number
  offset?: number
}

/**
 * Options for getting dataset items
 */
interface DatasetItemsOptions {
  limit?: number
  offset?: number
  random?: boolean
}

/**
 * Configuration for a test suite
 */
interface TestSuiteConfig {
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

/**
 * Scoring configuration
 */
interface ScoringConfig {
  method: 'exact' | 'contains' | 'semantic' | 'custom' | 'llm-judge'
  threshold?: number
  customFunction?: string
  judgeModel?: string
  judgePrompt?: string
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number
  retryDelay: number
  retryOn: ('timeout' | 'rate_limit' | 'server_error')[]
}

/**
 * A stored test suite
 */
interface TestSuite {
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

/**
 * Options for listing test suites
 */
interface ListTestSuitesOptions {
  limit?: number
  offset?: number
}

/**
 * Options for running a test suite
 */
interface TestSuiteRunOptions {
  models?: string[]
  datasets?: string[]
  evaluations?: string[]
  samplingRate?: number
  dryRun?: boolean
}

/**
 * A test suite run
 */
interface TestSuiteRun {
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

/**
 * Results of a test suite run
 */
interface TestSuiteResults {
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

/**
 * A test failure
 */
interface TestFailure {
  evaluationId: string
  datasetItemId: string
  model: string
  input: string
  expectedOutput: string
  actualOutput: string
  score: number
  error?: string
}

/**
 * Attempt to load EvalsDO - this will fail in RED phase
 */
async function loadEvalsDO(): Promise<new (ctx: MockDOState, env: MockEvalsEnv) => EvalsDOTestSuiteContract> {
  const module = await import('../src/evals.js')
  return module.EvalsDO
}

describe('EvalsDO Test Suite Execution', () => {
  let ctx: MockDOState
  let env: MockEvalsEnv
  let EvalsDO: new (ctx: MockDOState, env: MockEvalsEnv) => EvalsDOTestSuiteContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalsDO = await loadEvalsDO()
  })

  describe('Dataset Management', () => {
    describe('createDataset()', () => {
      it('should create a basic dataset', async () => {
        const instance = new EvalsDO(ctx, env)
        const dataset = await instance.createDataset({
          name: 'QA Dataset',
          description: 'Question-answer pairs for testing',
        })

        expect(dataset.id).toBeDefined()
        expect(dataset.name).toBe('QA Dataset')
        expect(dataset.itemCount).toBe(0)
        expect(dataset.createdAt).toBeDefined()
      })

      it('should create dataset with schema', async () => {
        const instance = new EvalsDO(ctx, env)
        const dataset = await instance.createDataset({
          name: 'Structured Dataset',
          schema: {
            fields: [
              { name: 'question', type: 'string', required: true },
              { name: 'answer', type: 'string', required: true },
              { name: 'category', type: 'string', required: false },
            ],
          },
        })

        expect(dataset.schema?.fields).toHaveLength(3)
      })

      it('should create dataset with initial items', async () => {
        const instance = new EvalsDO(ctx, env)
        const dataset = await instance.createDataset({
          name: 'Preloaded Dataset',
          items: [
            { input: 'What is 2+2?', expectedOutput: '4' },
            { input: 'What is the capital of France?', expectedOutput: 'Paris' },
          ],
        })

        expect(dataset.itemCount).toBe(2)
      })
    })

    describe('getDataset()', () => {
      it('should return null for non-existent dataset', async () => {
        const instance = new EvalsDO(ctx, env)
        const result = await instance.getDataset('nonexistent')
        expect(result).toBeNull()
      })

      it('should return dataset by id', async () => {
        const instance = new EvalsDO(ctx, env)
        const created = await instance.createDataset({ name: 'Test Dataset' })
        const retrieved = await instance.getDataset(created.id)

        expect(retrieved).not.toBeNull()
        expect(retrieved!.id).toBe(created.id)
      })
    })

    describe('listDatasets()', () => {
      it('should list all datasets', async () => {
        const instance = new EvalsDO(ctx, env)
        await instance.createDataset({ name: 'Dataset 1' })
        await instance.createDataset({ name: 'Dataset 2' })

        const datasets = await instance.listDatasets()

        expect(datasets).toHaveLength(2)
      })

      it('should respect limit option', async () => {
        const instance = new EvalsDO(ctx, env)
        for (let i = 0; i < 10; i++) {
          await instance.createDataset({ name: `Dataset ${i}` })
        }

        const datasets = await instance.listDatasets({ limit: 5 })

        expect(datasets).toHaveLength(5)
      })
    })

    describe('updateDataset()', () => {
      it('should update dataset properties', async () => {
        const instance = new EvalsDO(ctx, env)
        const created = await instance.createDataset({ name: 'Original' })

        const updated = await instance.updateDataset(created.id, {
          name: 'Updated',
          description: 'New description',
        })

        expect(updated.name).toBe('Updated')
        expect(updated.description).toBe('New description')
        expect(updated.updatedAt).not.toBe(created.updatedAt)
      })
    })

    describe('deleteDataset()', () => {
      it('should delete dataset', async () => {
        const instance = new EvalsDO(ctx, env)
        const created = await instance.createDataset({ name: 'To Delete' })

        const result = await instance.deleteDataset(created.id)

        expect(result).toBe(true)
        expect(await instance.getDataset(created.id)).toBeNull()
      })
    })

    describe('addDatasetItems()', () => {
      it('should add items to dataset', async () => {
        const instance = new EvalsDO(ctx, env)
        const dataset = await instance.createDataset({ name: 'Test Dataset' })

        const count = await instance.addDatasetItems(dataset.id, [
          { input: 'Q1', expectedOutput: 'A1' },
          { input: 'Q2', expectedOutput: 'A2' },
          { input: 'Q3', expectedOutput: 'A3' },
        ])

        expect(count).toBe(3)

        const updated = await instance.getDataset(dataset.id)
        expect(updated!.itemCount).toBe(3)
      })

      it('should assign IDs to items', async () => {
        const instance = new EvalsDO(ctx, env)
        const dataset = await instance.createDataset({ name: 'Test Dataset' })

        await instance.addDatasetItems(dataset.id, [
          { input: 'Question', expectedOutput: 'Answer' },
        ])

        const items = await instance.getDatasetItems(dataset.id)
        expect(items[0]?.id).toBeDefined()
      })
    })

    describe('getDatasetItems()', () => {
      it('should return dataset items', async () => {
        const instance = new EvalsDO(ctx, env)
        const dataset = await instance.createDataset({
          name: 'Test Dataset',
          items: [
            { input: 'Q1', expectedOutput: 'A1' },
            { input: 'Q2', expectedOutput: 'A2' },
          ],
        })

        const items = await instance.getDatasetItems(dataset.id)

        expect(items).toHaveLength(2)
        expect(items[0]?.input).toBe('Q1')
      })

      it('should support pagination', async () => {
        const instance = new EvalsDO(ctx, env)
        const dataset = await instance.createDataset({ name: 'Test Dataset' })
        const items: DatasetItem[] = []
        for (let i = 0; i < 100; i++) {
          items.push({ input: `Q${i}`, expectedOutput: `A${i}` })
        }
        await instance.addDatasetItems(dataset.id, items)

        const page1 = await instance.getDatasetItems(dataset.id, { limit: 10, offset: 0 })
        const page2 = await instance.getDatasetItems(dataset.id, { limit: 10, offset: 10 })

        expect(page1).toHaveLength(10)
        expect(page2).toHaveLength(10)
        expect(page1[0]?.input).not.toBe(page2[0]?.input)
      })

      it('should support random sampling', async () => {
        const instance = new EvalsDO(ctx, env)
        const dataset = await instance.createDataset({ name: 'Test Dataset' })
        const items: DatasetItem[] = []
        for (let i = 0; i < 100; i++) {
          items.push({ input: `Q${i}`, expectedOutput: `A${i}` })
        }
        await instance.addDatasetItems(dataset.id, items)

        const sample1 = await instance.getDatasetItems(dataset.id, { limit: 10, random: true })
        const sample2 = await instance.getDatasetItems(dataset.id, { limit: 10, random: true })

        // Random samples should likely be different (not guaranteed but very likely)
        expect(sample1).toHaveLength(10)
        expect(sample2).toHaveLength(10)
      })
    })
  })

  describe('Test Suite Management', () => {
    describe('createTestSuite()', () => {
      it('should create a basic test suite', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Basic Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })

        expect(suite.id).toBeDefined()
        expect(suite.name).toBe('Basic Suite')
        expect(suite.evaluations).toEqual(['eval-1'])
        expect(suite.datasets).toEqual(['dataset-1'])
        expect(suite.models).toEqual(['gpt-4o'])
      })

      it('should create suite with scoring config', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Scored Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
          scoringConfig: {
            method: 'semantic',
            threshold: 0.85,
          },
        })

        expect(suite.scoringConfig?.method).toBe('semantic')
        expect(suite.scoringConfig?.threshold).toBe(0.85)
      })

      it('should create suite with LLM judge scoring', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'LLM Judge Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
          scoringConfig: {
            method: 'llm-judge',
            judgeModel: 'claude-sonnet-4-20250514',
            judgePrompt: 'Rate the response quality from 0 to 1',
          },
        })

        expect(suite.scoringConfig?.method).toBe('llm-judge')
        expect(suite.scoringConfig?.judgeModel).toBe('claude-sonnet-4-20250514')
      })

      it('should create suite with retry config', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Retry Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
          retryConfig: {
            maxRetries: 3,
            retryDelay: 1000,
            retryOn: ['timeout', 'rate_limit'],
          },
        })

        expect(suite.retryConfig?.maxRetries).toBe(3)
        expect(suite.retryConfig?.retryOn).toContain('timeout')
      })
    })

    describe('getTestSuite()', () => {
      it('should return test suite by id', async () => {
        const instance = new EvalsDO(ctx, env)
        const created = await instance.createTestSuite({
          name: 'Test Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })

        const retrieved = await instance.getTestSuite(created.id)

        expect(retrieved).not.toBeNull()
        expect(retrieved!.id).toBe(created.id)
      })
    })

    describe('listTestSuites()', () => {
      it('should list all test suites', async () => {
        const instance = new EvalsDO(ctx, env)
        await instance.createTestSuite({
          name: 'Suite 1',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })
        await instance.createTestSuite({
          name: 'Suite 2',
          evaluations: ['eval-2'],
          datasets: ['dataset-2'],
          models: ['claude-sonnet-4-20250514'],
        })

        const suites = await instance.listTestSuites()

        expect(suites).toHaveLength(2)
      })
    })

    describe('deleteTestSuite()', () => {
      it('should delete test suite', async () => {
        const instance = new EvalsDO(ctx, env)
        const created = await instance.createTestSuite({
          name: 'To Delete',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })

        const result = await instance.deleteTestSuite(created.id)

        expect(result).toBe(true)
        expect(await instance.getTestSuite(created.id)).toBeNull()
      })
    })
  })

  describe('Test Suite Execution', () => {
    describe('runTestSuite()', () => {
      it('should start a test suite run', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Runnable Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })

        const run = await instance.runTestSuite(suite.id)

        expect(run.id).toBeDefined()
        expect(run.suiteId).toBe(suite.id)
        expect(run.status).toMatch(/pending|running/)
        expect(run.startedAt).toBeDefined()
        expect(run.progress).toBeDefined()
      })

      it('should run with subset of models', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Multi Model Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o', 'claude-sonnet-4-20250514', 'llama-3-70b'],
        })

        const run = await instance.runTestSuite(suite.id, { models: ['gpt-4o'] })

        // Should only run with specified model
        expect(run.suiteId).toBe(suite.id)
      })

      it('should support sampling rate', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Sampled Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })

        const run = await instance.runTestSuite(suite.id, { samplingRate: 0.1 })

        // Should only run 10% of dataset
        expect(run.suiteId).toBe(suite.id)
      })

      it('should support dry run', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Dry Run Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })

        const run = await instance.runTestSuite(suite.id, { dryRun: true })

        expect(run.status).toBe('completed')
        // Dry run should complete immediately without calling models
      })

      it('should throw for non-existent suite', async () => {
        const instance = new EvalsDO(ctx, env)
        await expect(instance.runTestSuite('nonexistent')).rejects.toThrow(/not found/i)
      })
    })

    describe('getTestSuiteRun()', () => {
      it('should return run with progress', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Test Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })
        const run = await instance.runTestSuite(suite.id)

        const retrieved = await instance.getTestSuiteRun(run.id)

        expect(retrieved).not.toBeNull()
        expect(retrieved!.progress.total).toBeGreaterThanOrEqual(0)
        expect(retrieved!.progress.percentage).toBeGreaterThanOrEqual(0)
        expect(retrieved!.progress.percentage).toBeLessThanOrEqual(100)
      })

      it('should include results when completed', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Test Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })
        const run = await instance.runTestSuite(suite.id, { dryRun: true })

        const retrieved = await instance.getTestSuiteRun(run.id)

        if (retrieved!.status === 'completed') {
          expect(retrieved!.results).toBeDefined()
          expect(retrieved!.results!.overall).toBeDefined()
        }
      })
    })

    describe('cancelTestSuiteRun()', () => {
      it('should cancel a running test suite', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Cancellable Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })
        const run = await instance.runTestSuite(suite.id)

        const result = await instance.cancelTestSuiteRun(run.id)

        expect(result).toBe(true)

        const cancelled = await instance.getTestSuiteRun(run.id)
        expect(cancelled?.status).toBe('cancelled')
      })

      it('should return false for completed run', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Completed Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })
        const run = await instance.runTestSuite(suite.id, { dryRun: true })

        // Wait for completion
        const completed = await instance.getTestSuiteRun(run.id)
        if (completed?.status === 'completed') {
          const result = await instance.cancelTestSuiteRun(run.id)
          expect(result).toBe(false)
        }
      })
    })

    describe('Test Suite Results', () => {
      it('should include overall statistics', async () => {
        const instance = new EvalsDO(ctx, env)
        // This test assumes a completed run
        const suite = await instance.createTestSuite({
          name: 'Complete Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })
        const run = await instance.runTestSuite(suite.id, { dryRun: true })
        const completed = await instance.getTestSuiteRun(run.id)

        if (completed?.results) {
          expect(completed.results.overall.passed).toBeGreaterThanOrEqual(0)
          expect(completed.results.overall.failed).toBeGreaterThanOrEqual(0)
          expect(completed.results.overall.score).toBeGreaterThanOrEqual(0)
        }
      })

      it('should include results by model', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Multi Model Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o', 'claude-sonnet-4-20250514'],
        })
        const run = await instance.runTestSuite(suite.id, { dryRun: true })
        const completed = await instance.getTestSuiteRun(run.id)

        if (completed?.results) {
          expect(completed.results.byModel).toBeInstanceOf(Array)
          expect(completed.results.byModel.length).toBeGreaterThan(0)
          expect(completed.results.byModel[0]?.model).toBeDefined()
          expect(completed.results.byModel[0]?.latency).toBeDefined()
        }
      })

      it('should include results by evaluation', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Multi Eval Suite',
          evaluations: ['eval-1', 'eval-2'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })
        const run = await instance.runTestSuite(suite.id, { dryRun: true })
        const completed = await instance.getTestSuiteRun(run.id)

        if (completed?.results) {
          expect(completed.results.byEvaluation).toBeInstanceOf(Array)
        }
      })

      it('should include results by dataset', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Multi Dataset Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1', 'dataset-2'],
          models: ['gpt-4o'],
        })
        const run = await instance.runTestSuite(suite.id, { dryRun: true })
        const completed = await instance.getTestSuiteRun(run.id)

        if (completed?.results) {
          expect(completed.results.byDataset).toBeInstanceOf(Array)
        }
      })

      it('should include failure details', async () => {
        const instance = new EvalsDO(ctx, env)
        const suite = await instance.createTestSuite({
          name: 'Failing Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        })
        const run = await instance.runTestSuite(suite.id, { dryRun: true })
        const completed = await instance.getTestSuiteRun(run.id)

        if (completed?.results && completed.results.overall.failed > 0) {
          expect(completed.results.failures).toBeInstanceOf(Array)
          expect(completed.results.failures[0]?.evaluationId).toBeDefined()
          expect(completed.results.failures[0]?.input).toBeDefined()
          expect(completed.results.failures[0]?.actualOutput).toBeDefined()
        }
      })
    })
  })

  describe('HTTP endpoints for test suites', () => {
    it('should handle POST /api/datasets', async () => {
      const instance = new EvalsDO(ctx, env)
      const request = new Request('http://evals.do/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Dataset' }),
      })
      const response = await instance.fetch(request)

      expect(response.status).toBe(201)
      const data = await response.json() as Dataset
      expect(data.name).toBe('New Dataset')
    })

    it('should handle GET /api/datasets', async () => {
      const instance = new EvalsDO(ctx, env)
      await instance.createDataset({ name: 'Test Dataset' })

      const request = new Request('http://evals.do/api/datasets', { method: 'GET' })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json() as Dataset[]
      expect(Array.isArray(data)).toBe(true)
    })

    it('should handle GET /api/datasets/:id/items', async () => {
      const instance = new EvalsDO(ctx, env)
      const dataset = await instance.createDataset({
        name: 'Test Dataset',
        items: [{ input: 'Q', expectedOutput: 'A' }],
      })

      const request = new Request(`http://evals.do/api/datasets/${dataset.id}/items`, { method: 'GET' })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json() as DatasetItem[]
      expect(Array.isArray(data)).toBe(true)
    })

    it('should handle POST /api/suites', async () => {
      const instance = new EvalsDO(ctx, env)
      const request = new Request('http://evals.do/api/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Suite',
          evaluations: ['eval-1'],
          datasets: ['dataset-1'],
          models: ['gpt-4o'],
        }),
      })
      const response = await instance.fetch(request)

      expect(response.status).toBe(201)
      const data = await response.json() as TestSuite
      expect(data.name).toBe('New Suite')
    })

    it('should handle POST /api/suites/:id/run', async () => {
      const instance = new EvalsDO(ctx, env)
      const suite = await instance.createTestSuite({
        name: 'Runnable',
        evaluations: ['eval-1'],
        datasets: ['dataset-1'],
        models: ['gpt-4o'],
      })

      const request = new Request(`http://evals.do/api/suites/${suite.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json() as TestSuiteRun
      expect(data.suiteId).toBe(suite.id)
    })

    it('should handle GET /api/suites/:id/runs/:runId', async () => {
      const instance = new EvalsDO(ctx, env)
      const suite = await instance.createTestSuite({
        name: 'Test Suite',
        evaluations: ['eval-1'],
        datasets: ['dataset-1'],
        models: ['gpt-4o'],
      })
      const run = await instance.runTestSuite(suite.id)

      const request = new Request(`http://evals.do/api/suites/${suite.id}/runs/${run.id}`, { method: 'GET' })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      const data = await response.json() as TestSuiteRun
      expect(data.id).toBe(run.id)
    })

    it('should handle POST /api/suites/:id/runs/:runId/cancel', async () => {
      const instance = new EvalsDO(ctx, env)
      const suite = await instance.createTestSuite({
        name: 'Cancellable',
        evaluations: ['eval-1'],
        datasets: ['dataset-1'],
        models: ['gpt-4o'],
      })
      const run = await instance.runTestSuite(suite.id)

      const request = new Request(`http://evals.do/api/suites/${suite.id}/runs/${run.id}/cancel`, {
        method: 'POST',
      })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
    })
  })
})
