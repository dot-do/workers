/**
 * Experiment Worker
 * Advanced experimentation engine with multi-armed bandits and Bayesian A/B testing
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type {
  Experiment,
  ExperimentConfig,
  ExperimentStatus,
  ExperimentType,
  Variant,
  VariantConfig,
  Assignment,
  AssignmentContext,
  Observation,
  ExperimentResults,
  TestResult,
} from './types'
import { selectVariantThompsonSampling, updateThompsonSamplingStats, calculateProbabilityToBeBest, getExpectedValue, getCredibleInterval } from './algorithms/thompson-sampling'
import { selectVariantUCB, updateUCBStats } from './algorithms/ucb'
import { selectVariantEpsilonGreedy, updateEpsilonGreedyStats } from './algorithms/epsilon-greedy'
import { runBayesianABTest, shouldStopEarly, calculateExpectedLoss } from './algorithms/bayesian'
import type { SearchAdVariantConfig, SearchAdContext, SearchAdMetrics } from './search-ads'
import {
  createSearchAdExperiment,
  createHeadlineTest,
  createDescriptionTest,
  createKeywordTest,
  createBidTest,
  createLandingPageTest,
  createMatchTypeTest,
  createExtensionTest,
  calculateSearchAdMetrics,
  validateSearchAdVariant,
} from './search-ads'

/**
 * Environment bindings
 */
export interface Env {
  EXPERIMENT_KV: KVNamespace
  EXPERIMENT_DB: D1Database
  EXPERIMENT_QUEUE: Queue
  EXPERIMENT_ANALYTICS: AnalyticsEngineDataset
  DB?: any // Service binding to main db worker
  ANALYTICS?: any // Service binding to analytics worker
}

/**
 * Experiment Service (RPC Interface)
 */
export class ExperimentService extends WorkerEntrypoint<Env> {
  /**
   * Create new experiment
   */
  async createExperiment(config: ExperimentConfig, variants: VariantConfig[]): Promise<Experiment> {
    const experimentId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Create variants
    const experimentVariants: Variant[] = variants.map((v, index) => ({
      id: crypto.randomUUID(),
      experimentId,
      name: v.name,
      description: v.description,
      isControl: v.isControl || index === 0,
      weight: v.weight || 1 / variants.length,
      config: v.config,
      stats: {
        assignments: 0,
        observations: 0,
        successes: 0,
        failures: 0,
        sum: 0,
        sumSquares: 0,
        mean: 0,
        variance: 0,
        alpha: 1,
        beta: 1,
      },
    }))

    const experiment: Experiment = {
      id: experimentId,
      config,
      variants: experimentVariants,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }

    // Store in D1
    await this.env.EXPERIMENT_DB.prepare(
      `INSERT INTO experiments (id, name, type, status, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(experimentId, config.name, config.type, experiment.status, JSON.stringify(experiment), now, now)
      .run()

    // Store variants
    for (const variant of experimentVariants) {
      await this.env.EXPERIMENT_DB.prepare(
        `INSERT INTO experiment_variants (id, experiment_id, name, is_control, weight, config, stats)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(variant.id, experimentId, variant.name, variant.isControl ? 1 : 0, variant.weight, JSON.stringify(variant.config), JSON.stringify(variant.stats))
        .run()
    }

    // Cache in KV
    await this.env.EXPERIMENT_KV.put(`experiment:${experimentId}`, JSON.stringify(experiment), { expirationTtl: 3600 })

    // Track in Analytics
    this.env.EXPERIMENT_ANALYTICS.writeDataPoint({
      blobs: ['experiment_created', config.type, config.primaryMetric],
      doubles: [variants.length],
      indexes: [experimentId],
    })

    return experiment
  }

  /**
   * Start experiment (change status to running)
   */
  async startExperiment(experimentId: string): Promise<Experiment> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`)
    }

    experiment.status = 'running'
    experiment.startedAt = new Date().toISOString()
    experiment.updatedAt = new Date().toISOString()

    await this.env.EXPERIMENT_DB.prepare(`UPDATE experiments SET status = ?, started_at = ?, updated_at = ?, config = ? WHERE id = ?`)
      .bind(experiment.status, experiment.startedAt, experiment.updatedAt, JSON.stringify(experiment), experimentId)
      .run()

    await this.env.EXPERIMENT_KV.put(`experiment:${experimentId}`, JSON.stringify(experiment), { expirationTtl: 3600 })

    return experiment
  }

  /**
   * Assign user to variant
   * Core method called by ads worker for every impression
   */
  async assignVariant(experimentId: string, context: AssignmentContext): Promise<Assignment> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`)
    }

    if (experiment.status !== 'running') {
      throw new Error(`Experiment ${experimentId} is not running (status: ${experiment.status})`)
    }

    // Check if user already assigned (consistency)
    const existingAssignment = await this.getExistingAssignment(experimentId, context.userId)
    if (existingAssignment) {
      return existingAssignment
    }

    // Select variant based on experiment type
    let selectedVariant: Variant

    switch (experiment.config.type) {
      case 'thompson_sampling':
        selectedVariant = selectVariantThompsonSampling(experiment.variants, experiment.config.parameters)
        break

      case 'ucb':
        selectedVariant = selectVariantUCB(experiment.variants, experiment.config.parameters)
        break

      case 'epsilon_greedy':
        selectedVariant = selectVariantEpsilonGreedy(experiment.variants, experiment.config.parameters)
        break

      case 'ab_test':
      case 'bayesian_ab':
        // Fixed allocation based on weights
        selectedVariant = selectVariantByWeight(experiment.variants)
        break

      case 'contextual_bandit':
        // TODO: Implement contextual bandit with LinUCB
        selectedVariant = selectVariantThompsonSampling(experiment.variants)
        break

      default:
        selectedVariant = selectVariantByWeight(experiment.variants)
    }

    // Create assignment
    const assignmentId = crypto.randomUUID()
    const now = new Date().toISOString()

    const assignment: Assignment = {
      id: assignmentId,
      experimentId,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      userId: context.userId,
      sessionId: context.sessionId,
      context,
      assignedAt: now,
      config: selectedVariant.config,
    }

    // Store assignment
    await this.env.EXPERIMENT_DB.prepare(
      `INSERT INTO experiment_assignments (id, experiment_id, variant_id, user_id, session_id, context, assigned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(assignmentId, experimentId, selectedVariant.id, context.userId, context.sessionId, JSON.stringify(context), now)
      .run()

    // Update variant stats (increment assignments)
    await this.incrementVariantAssignments(experimentId, selectedVariant.id)

    // Cache assignment for consistency
    await this.env.EXPERIMENT_KV.put(`assignment:${experimentId}:${context.userId}`, JSON.stringify(assignment), { expirationTtl: 86400 })

    // Track in Analytics
    this.env.EXPERIMENT_ANALYTICS.writeDataPoint({
      blobs: ['variant_assigned', experiment.config.type, selectedVariant.name],
      doubles: [1],
      indexes: [experimentId, selectedVariant.id],
    })

    return assignment
  }

  /**
   * Record observation (metric value)
   */
  async recordObservation(assignmentId: string, metric: string, value: number, metadata?: Record<string, any>): Promise<void> {
    const observationId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Get assignment
    const assignment = await this.getAssignment(assignmentId)
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`)
    }

    // Store observation
    await this.env.EXPERIMENT_DB.prepare(
      `INSERT INTO experiment_observations (id, assignment_id, experiment_id, variant_id, metric, value, metadata, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(observationId, assignmentId, assignment.experimentId, assignment.variantId, metric, value, JSON.stringify(metadata || {}), now)
      .run()

    // Update variant stats
    await this.updateVariantStats(assignment.experimentId, assignment.variantId, metric, value)

    // Track in Analytics
    this.env.EXPERIMENT_ANALYTICS.writeDataPoint({
      blobs: ['observation_recorded', metric],
      doubles: [value],
      indexes: [assignment.experimentId, assignment.variantId],
    })

    // Queue for async processing (e.g., check if we should stop early)
    await this.env.EXPERIMENT_QUEUE.send({
      type: 'observation_recorded',
      experimentId: assignment.experimentId,
      variantId: assignment.variantId,
      metric,
      value,
    })
  }

  /**
   * Get experiment statistics
   */
  async getExperimentStats(experimentId: string): Promise<ExperimentResults> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`)
    }

    // Refresh variant stats from database
    const variants = await this.getVariants(experimentId)

    const totalAssignments = variants.reduce((sum, v) => sum + v.stats.assignments, 0)
    const totalObservations = variants.reduce((sum, v) => sum + v.stats.observations, 0)

    // Run statistical tests
    const testResults: TestResult[] = []

    if (experiment.config.type === 'bayesian_ab' || experiment.config.type === 'ab_test') {
      const control = variants.find((v) => v.isControl)
      if (control) {
        for (const treatment of variants.filter((v) => !v.isControl)) {
          const result = runBayesianABTest(control, treatment, experiment.config.parameters)
          testResults.push(result)
        }
      }
    }

    // Determine winner
    let winner: Variant | undefined
    let confidence = 0

    if (testResults.length > 0) {
      // Find variant with highest probability to be best
      const bestResult = testResults.reduce((best, current) => {
        const currentProb = current.probabilityToBeBest || 0
        const bestProb = best.probabilityToBeBest || 0
        return currentProb > bestProb ? current : best
      })

      if (bestResult.probabilityToBeBest && bestResult.probabilityToBeBest > (experiment.config.significanceThreshold || 0.95)) {
        winner = variants.find((v) => v.id === bestResult.treatmentVariantId)
        confidence = bestResult.probabilityToBeBest
      }
    }

    // Calculate duration
    const duration = experiment.startedAt ? Date.now() - new Date(experiment.startedAt).getTime() : 0

    // Recommended action
    let recommendedAction: 'continue' | 'conclude_winner' | 'conclude_no_winner' = 'continue'

    if (winner && confidence > (experiment.config.significanceThreshold || 0.95)) {
      recommendedAction = 'conclude_winner'
    } else if (totalAssignments >= (experiment.config.minSampleSize || 1000) * variants.length) {
      // Sufficient sample size, but no clear winner
      recommendedAction = 'conclude_no_winner'
    }

    return {
      experimentId,
      status: experiment.status,
      variants,
      winner,
      testResults,
      totalAssignments,
      totalObservations,
      duration,
      confidence,
      recommendedAction,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Conclude experiment (promote winner)
   */
  async concludeExperiment(experimentId: string, winnerVariantId?: string): Promise<Experiment> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`)
    }

    experiment.status = 'concluded'
    experiment.concludedAt = new Date().toISOString()
    experiment.updatedAt = new Date().toISOString()

    if (winnerVariantId) {
      experiment.winnerVariantId = winnerVariantId
    }

    await this.env.EXPERIMENT_DB.prepare(`UPDATE experiments SET status = ?, winner_variant_id = ?, concluded_at = ?, updated_at = ?, config = ? WHERE id = ?`)
      .bind(experiment.status, experiment.winnerVariantId || null, experiment.concludedAt, experiment.updatedAt, JSON.stringify(experiment), experimentId)
      .run()

    await this.env.EXPERIMENT_KV.put(`experiment:${experimentId}`, JSON.stringify(experiment), { expirationTtl: 3600 })

    this.env.EXPERIMENT_ANALYTICS.writeDataPoint({
      blobs: ['experiment_concluded', experiment.status],
      indexes: [experimentId],
    })

    return experiment
  }

  // ========================================
  // Search Ad Experimentation Methods
  // ========================================

  /**
   * Create search ad experiment with validated variants
   */
  async createSearchAdExperiment(
    name: string,
    variantType: string,
    variants: SearchAdVariantConfig[],
    options?: {
      experimentType?: ExperimentType
      primaryMetric?: string
      trafficAllocation?: number
      minSampleSize?: number
      autoPromoteWinner?: boolean
    }
  ): Promise<Experiment> {
    // Validate all variants
    for (const variant of variants) {
      const validation = validateSearchAdVariant(variant)
      if (!validation.valid) {
        throw new Error(`Invalid variant: ${validation.errors.join(', ')}`)
      }
    }

    // Create experiment using helper
    const { config, variants: variantConfigs } = createSearchAdExperiment(name, variantType as any, variants, options)

    // Create experiment via base method
    return this.createExperiment(config, variantConfigs)
  }

  /**
   * Create headline test (convenience method)
   */
  async createHeadlineTest(
    name: string,
    headlines: Array<{ headline1: string; headline2: string; headline3?: string }>,
    options?: { trafficAllocation?: number; minSampleSize?: number }
  ): Promise<Experiment> {
    const { config, variants } = createHeadlineTest(name, headlines, options)
    return this.createExperiment(config, variants)
  }

  /**
   * Create description test (convenience method)
   */
  async createDescriptionTest(
    name: string,
    descriptions: Array<{ description1: string; description2?: string }>,
    options?: { trafficAllocation?: number; minSampleSize?: number }
  ): Promise<Experiment> {
    const { config, variants } = createDescriptionTest(name, descriptions, options)
    return this.createExperiment(config, variants)
  }

  /**
   * Create keyword test (convenience method)
   */
  async createKeywordTest(
    name: string,
    keywordGroups: Array<Array<{ keyword: string; matchType: 'exact' | 'phrase' | 'broad'; bid?: number }>>,
    options?: { trafficAllocation?: number; minSampleSize?: number }
  ): Promise<Experiment> {
    const { config, variants } = createKeywordTest(name, keywordGroups, options)
    return this.createExperiment(config, variants)
  }

  /**
   * Create bid test (convenience method)
   */
  async createBidTest(name: string, bids: number[], options?: { trafficAllocation?: number; minSampleSize?: number }): Promise<Experiment> {
    const { config, variants } = createBidTest(name, bids, options)
    return this.createExperiment(config, variants)
  }

  /**
   * Create landing page test (convenience method)
   */
  async createLandingPageTest(
    name: string,
    landingPages: Array<{ url: string; path1?: string; path2?: string }>,
    options?: { trafficAllocation?: number; minSampleSize?: number }
  ): Promise<Experiment> {
    const { config, variants } = createLandingPageTest(name, landingPages, options)
    return this.createExperiment(config, variants)
  }

  /**
   * Create match type test (convenience method)
   */
  async createMatchTypeTest(
    name: string,
    keyword: string,
    matchTypes: Array<'exact' | 'phrase' | 'broad'>,
    options?: { trafficAllocation?: number; minSampleSize?: number }
  ): Promise<Experiment> {
    const { config, variants } = createMatchTypeTest(name, keyword, matchTypes, options)
    return this.createExperiment(config, variants)
  }

  /**
   * Create ad extension test (convenience method)
   */
  async createExtensionTest(
    name: string,
    extensionConfigs: Array<Array<{ type: string; config: Record<string, any> }>>,
    options?: { trafficAllocation?: number; minSampleSize?: number }
  ): Promise<Experiment> {
    const { config, variants } = createExtensionTest(name, extensionConfigs as any, options)
    return this.createExperiment(config, variants)
  }

  /**
   * Calculate search ad metrics from raw data
   */
  calculateSearchAdMetrics(raw: {
    impressions: number
    clicks: number
    conversions: number
    spend: number
    revenue: number
    qualityScore?: number
    averagePosition?: number
  }): SearchAdMetrics {
    return calculateSearchAdMetrics(raw)
  }

  /**
   * Get experiment by ID (helper)
   */
  private async getExperiment(experimentId: string): Promise<Experiment | null> {
    // Check cache
    const cached = await this.env.EXPERIMENT_KV.get(`experiment:${experimentId}`)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from D1
    const result = await this.env.EXPERIMENT_DB.prepare(`SELECT * FROM experiments WHERE id = ?`).bind(experimentId).first()

    if (!result) {
      return null
    }

    const experiment = JSON.parse(result.config as string) as Experiment

    // Fetch variants
    experiment.variants = await this.getVariants(experimentId)

    // Cache
    await this.env.EXPERIMENT_KV.put(`experiment:${experimentId}`, JSON.stringify(experiment), { expirationTtl: 3600 })

    return experiment
  }

  /**
   * Get variants for experiment
   */
  private async getVariants(experimentId: string): Promise<Variant[]> {
    const results = await this.env.EXPERIMENT_DB.prepare(`SELECT * FROM experiment_variants WHERE experiment_id = ?`).bind(experimentId).all()

    return results.results.map((row: any) => ({
      id: row.id,
      experimentId: row.experiment_id,
      name: row.name,
      description: row.description,
      isControl: row.is_control === 1,
      weight: row.weight,
      config: JSON.parse(row.config),
      stats: JSON.parse(row.stats),
    }))
  }

  /**
   * Get existing assignment for user consistency
   */
  private async getExistingAssignment(experimentId: string, userId: string): Promise<Assignment | null> {
    const cached = await this.env.EXPERIMENT_KV.get(`assignment:${experimentId}:${userId}`)
    if (cached) {
      return JSON.parse(cached)
    }

    const result = await this.env.EXPERIMENT_DB.prepare(`SELECT * FROM experiment_assignments WHERE experiment_id = ? AND user_id = ? ORDER BY assigned_at DESC LIMIT 1`)
      .bind(experimentId, userId)
      .first()

    if (!result) {
      return null
    }

    const assignment: Assignment = {
      id: result.id as string,
      experimentId: result.experiment_id as string,
      variantId: result.variant_id as string,
      variantName: '', // Will be filled from variant lookup
      userId: result.user_id as string,
      sessionId: result.session_id as string,
      context: JSON.parse(result.context as string),
      assignedAt: result.assigned_at as string,
      config: {},
    }

    return assignment
  }

  /**
   * Get assignment by ID
   */
  private async getAssignment(assignmentId: string): Promise<Assignment | null> {
    const result = await this.env.EXPERIMENT_DB.prepare(`SELECT * FROM experiment_assignments WHERE id = ?`).bind(assignmentId).first()

    if (!result) {
      return null
    }

    return {
      id: result.id as string,
      experimentId: result.experiment_id as string,
      variantId: result.variant_id as string,
      variantName: '',
      userId: result.user_id as string,
      sessionId: result.session_id as string,
      context: JSON.parse(result.context as string),
      assignedAt: result.assigned_at as string,
      config: {},
    }
  }

  /**
   * Increment variant assignment count
   */
  private async incrementVariantAssignments(experimentId: string, variantId: string): Promise<void> {
    await this.env.EXPERIMENT_DB.prepare(`UPDATE experiment_variants SET stats = json_set(stats, '$.assignments', COALESCE(json_extract(stats, '$.assignments'), 0) + 1) WHERE id = ?`)
      .bind(variantId)
      .run()
  }

  /**
   * Update variant stats after observation
   */
  private async updateVariantStats(experimentId: string, variantId: string, metric: string, value: number): Promise<void> {
    // Get current variant stats
    const result = await this.env.EXPERIMENT_DB.prepare(`SELECT stats FROM experiment_variants WHERE id = ?`).bind(variantId).first()

    if (!result) {
      return
    }

    const stats = JSON.parse(result.stats as string)

    // Update stats based on metric type
    if (metric === 'click' || metric === 'conversion') {
      // Binary metric
      stats.observations = (stats.observations || 0) + 1
      if (value > 0) {
        stats.successes = (stats.successes || 0) + 1
      } else {
        stats.failures = (stats.failures || 0) + 1
      }
      stats.alpha = 1 + (stats.successes || 0)
      stats.beta = 1 + (stats.failures || 0)
    } else {
      // Continuous metric
      const n = (stats.observations || 0) + 1
      const oldMean = stats.mean || 0
      const newMean = oldMean + (value - oldMean) / n

      stats.observations = n
      stats.mean = newMean
      stats.sum = (stats.sum || 0) + value
      stats.sumSquares = (stats.sumSquares || 0) + value * value

      if (n > 1) {
        const meanSquare = stats.sumSquares / n
        const squareMean = newMean * newMean
        stats.variance = meanSquare - squareMean
      }
    }

    // Save updated stats
    await this.env.EXPERIMENT_DB.prepare(`UPDATE experiment_variants SET stats = ? WHERE id = ?`).bind(JSON.stringify(stats), variantId).run()
  }
}

/**
 * Select variant by weight (for fixed allocation experiments)
 */
function selectVariantByWeight(variants: Variant[]): Variant {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
  let random = Math.random() * totalWeight

  for (const variant of variants) {
    random -= variant.weight
    if (random <= 0) {
      return variant
    }
  }

  return variants[variants.length - 1]
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'experiment', timestamp: new Date().toISOString() })
})

// Create experiment
app.post('/experiments', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  const experiment = await service.createExperiment(body.config, body.variants)
  return c.json({ success: true, data: experiment })
})

// Start experiment
app.post('/experiments/:id/start', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const experiment = await service.startExperiment(c.req.param('id'))
  return c.json({ success: true, data: experiment })
})

// Assign variant
app.post('/experiments/:id/assign', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const context = await c.req.json()
  const assignment = await service.assignVariant(c.req.param('id'), context)
  return c.json({ success: true, data: assignment })
})

// Record observation
app.post('/observations', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  await service.recordObservation(body.assignmentId, body.metric, body.value, body.metadata)
  return c.json({ success: true })
})

// Get experiment stats
app.get('/experiments/:id/stats', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const stats = await service.getExperimentStats(c.req.param('id'))
  return c.json({ success: true, data: stats })
})

// Conclude experiment
app.post('/experiments/:id/conclude', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  const experiment = await service.concludeExperiment(c.req.param('id'), body.winnerVariantId)
  return c.json({ success: true, data: experiment })
})

// Search ad experiment endpoints
app.post('/experiments/search/headline', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  const experiment = await service.createHeadlineTest(body.name, body.headlines, body.options)
  return c.json({ success: true, data: experiment })
})

app.post('/experiments/search/description', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  const experiment = await service.createDescriptionTest(body.name, body.descriptions, body.options)
  return c.json({ success: true, data: experiment })
})

app.post('/experiments/search/keyword', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  const experiment = await service.createKeywordTest(body.name, body.keywordGroups, body.options)
  return c.json({ success: true, data: experiment })
})

app.post('/experiments/search/bid', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  const experiment = await service.createBidTest(body.name, body.bids, body.options)
  return c.json({ success: true, data: experiment })
})

app.post('/experiments/search/landing-page', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  const experiment = await service.createLandingPageTest(body.name, body.landingPages, body.options)
  return c.json({ success: true, data: experiment })
})

app.post('/experiments/search/match-type', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  const experiment = await service.createMatchTypeTest(body.name, body.keyword, body.matchTypes, body.options)
  return c.json({ success: true, data: experiment })
})

app.post('/experiments/search/extension', async (c) => {
  const service = new ExperimentService({} as any, c.env)
  const body = await c.req.json()
  const experiment = await service.createExtensionTest(body.name, body.extensionConfigs, body.options)
  return c.json({ success: true, data: experiment })
})

// Export search ad types
export * from './search-ads'

export default {
  fetch: app.fetch,
}
