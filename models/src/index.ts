import { Hono } from 'hono'
import { ModelRegistry } from './registry/models'
import { LineageTracker } from './lineage/tracker'
import { PerformanceTracker } from './performance/tracker'
import { ComplianceManager } from './governance/compliance'
import { VibeCodingIntegration } from './vibe/integration'
import type { ModelMetadata } from './types/schema'

type Bindings = {
  DB: D1Database
  MODEL_ARTIFACTS: R2Bucket
  MODEL_EMBEDDINGS: Vectorize
  AI: Ai
  ANALYTICS?: AnalyticsEngineDataset
}

const app = new Hono<{ Bindings: Bindings }>()

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'ML Model Registry & Governance POC',
    version: '0.1.0',
    status: 'healthy',
    features: ['registry', 'lineage', 'performance', 'governance', 'vibe-coding']
  })
})

// ============================
// MODEL REGISTRY ENDPOINTS
// ============================

// Register a new model
app.post('/api/models', async (c) => {
  const registry = new ModelRegistry(c.env.DB)
  const body = await c.req.json()

  const { model, version } = await registry.registerModel({
    name: body.name,
    description: body.description,
    metadata: body.metadata as ModelMetadata,
    created_by: body.created_by,
    version: body.version,
    tags: body.tags
  })

  return c.json({ model, version }, 201)
})

// Get model
app.get('/api/models/:id', async (c) => {
  const registry = new ModelRegistry(c.env.DB)
  const model = await registry.getModel(c.req.param('id'))

  if (!model) {
    return c.json({ error: 'Model not found' }, 404)
  }

  return c.json(model)
})

// Get model with versions
app.get('/api/models/:id/versions', async (c) => {
  const registry = new ModelRegistry(c.env.DB)
  const data = await registry.getModelWithVersions(c.req.param('id'))

  return c.json(data)
})

// Create new version
app.post('/api/models/:id/versions', async (c) => {
  const registry = new ModelRegistry(c.env.DB)
  const body = await c.req.json()

  const { model, version } = await registry.createModelVersion(c.req.param('id'), body.version, body.metadata, body.is_production)

  return c.json({ model, version }, 201)
})

// Promote to production
app.post('/api/models/:id/promote/:version', async (c) => {
  const registry = new ModelRegistry(c.env.DB)
  await registry.promoteToProduction(c.req.param('id'), c.req.param('version'))

  return c.json({ success: true })
})

// Search models
app.get('/api/models', async (c) => {
  const registry = new ModelRegistry(c.env.DB)
  const tags = c.req.query('tags')?.split(',')
  const status = c.req.query('status')
  const provider = c.req.query('provider')

  const models = await registry.searchModels({ tags, status, provider })

  return c.json({ models, count: models.length })
})

// ============================
// LINEAGE TRACKING ENDPOINTS
// ============================

// Track dataset usage
app.post('/api/lineage/datasets', async (c) => {
  const tracker = new LineageTracker(c.env.DB)
  const body = await c.req.json()

  const rel = await tracker.trackDataset(body.model_id, body.dataset_id, body.properties)

  return c.json(rel, 201)
})

// Track deployment
app.post('/api/lineage/deployments', async (c) => {
  const tracker = new LineageTracker(c.env.DB)
  const body = await c.req.json()

  const rel = await tracker.trackDeployment(body.model_id, body.deployment_id, body.properties)

  return c.json(rel, 201)
})

// Get full lineage
app.get('/api/lineage/:modelId', async (c) => {
  const tracker = new LineageTracker(c.env.DB)
  const lineage = await tracker.getFullLineage(c.req.param('modelId'))

  return c.json(lineage)
})

// Get impact analysis
app.get('/api/lineage/:modelId/impact', async (c) => {
  const tracker = new LineageTracker(c.env.DB)
  const impact = await tracker.getImpactAnalysis(c.req.param('modelId'))

  return c.json(impact)
})

// Get lineage graph
app.get('/api/lineage/:modelId/graph', async (c) => {
  const tracker = new LineageTracker(c.env.DB)
  const graph = await tracker.getLineageGraph(c.req.param('modelId'))

  return c.json(graph)
})

// ============================
// PERFORMANCE TRACKING ENDPOINTS
// ============================

// Record metric
app.post('/api/performance/metrics', async (c) => {
  const tracker = new PerformanceTracker(c.env.DB, c.env.ANALYTICS)
  const body = await c.req.json()

  const metric = await tracker.recordMetric(body.model_id, body.metric_type, body.metric_value, body.context)

  return c.json(metric, 201)
})

// Get metrics
app.get('/api/performance/:modelId/metrics', async (c) => {
  const tracker = new PerformanceTracker(c.env.DB)
  const metricType = c.req.query('type')
  const startTime = c.req.query('start') ? parseInt(c.req.query('start')!) : undefined
  const endTime = c.req.query('end') ? parseInt(c.req.query('end')!) : undefined

  const metrics = await tracker.getMetrics(c.req.param('modelId'), metricType, startTime, endTime)

  return c.json({ metrics, count: metrics.length })
})

// Get statistics
app.get('/api/performance/:modelId/stats', async (c) => {
  const tracker = new PerformanceTracker(c.env.DB)
  const metricType = c.req.query('type')
  const startTime = c.req.query('start') ? parseInt(c.req.query('start')!) : undefined
  const endTime = c.req.query('end') ? parseInt(c.req.query('end')!) : undefined

  if (!metricType) {
    return c.json({ error: 'metric type required' }, 400)
  }

  const stats = await tracker.getStatistics(c.req.param('modelId'), metricType, startTime, endTime)

  return c.json(stats)
})

// Compare models
app.post('/api/performance/compare', async (c) => {
  const tracker = new PerformanceTracker(c.env.DB)
  const body = await c.req.json()

  const comparison = await tracker.compareModels(body.model_ids, body.metric_type, body.start_time, body.end_time)

  return c.json(comparison)
})

// ============================
// GOVERNANCE ENDPOINTS
// ============================

// Request approval
app.post('/api/governance/approvals', async (c) => {
  const compliance = new ComplianceManager(c.env.DB)
  const body = await c.req.json()

  const approval = await compliance.requestApproval(body.model_id, body.requested_by, body.check_types)

  return c.json(approval, 201)
})

// Review approval
app.post('/api/governance/approvals/:id/review', async (c) => {
  const compliance = new ComplianceManager(c.env.DB)
  const body = await c.req.json()

  const approval = await compliance.reviewApproval(c.req.param('id'), body.reviewed_by, body.approved, body.notes)

  return c.json(approval)
})

// Get pending approvals
app.get('/api/governance/approvals/pending', async (c) => {
  const compliance = new ComplianceManager(c.env.DB)
  const approvals = await compliance.getPendingApprovals()

  return c.json({ approvals, count: approvals.length })
})

// Get governance history
app.get('/api/governance/:modelId/history', async (c) => {
  const compliance = new ComplianceManager(c.env.DB)
  const history = await compliance.getGovernanceHistory(c.req.param('modelId'))

  return c.json({ history, count: history.length })
})

// Run compliance checks
app.post('/api/governance/:modelId/check', async (c) => {
  const compliance = new ComplianceManager(c.env.DB)
  const body = await c.req.json()

  const checks = await compliance.runComplianceChecks(c.req.param('modelId'), body.check_types)

  return c.json({ checks })
})

// ============================
// VIBE CODING INTEGRATION ENDPOINTS
// ============================

// Track AI request (from AI Gateway)
app.post('/api/vibe/track', async (c) => {
  const vibe = new VibeCodingIntegration(c.env.DB)
  const body = await c.req.json()

  await vibe.trackAIRequest(body)

  return c.json({ success: true })
})

// Get cost summary
app.get('/api/vibe/:modelId/costs', async (c) => {
  const vibe = new VibeCodingIntegration(c.env.DB)
  const startTime = c.req.query('start') ? parseInt(c.req.query('start')!) : undefined
  const endTime = c.req.query('end') ? parseInt(c.req.query('end')!) : undefined

  const summary = await vibe.getCostSummary(c.req.param('modelId'), startTime, endTime)

  return c.json(summary)
})

// Compare models (A/B testing)
app.post('/api/vibe/compare', async (c) => {
  const vibe = new VibeCodingIntegration(c.env.DB)
  const body = await c.req.json()

  const comparison = await vibe.compareModels(body.experiment_id, body.model_ids, body.start_time, body.end_time)

  return c.json(comparison)
})

// Get cost trends
app.get('/api/vibe/:modelId/trends', async (c) => {
  const vibe = new VibeCodingIntegration(c.env.DB)
  const granularity = (c.req.query('granularity') as 'hour' | 'day' | 'week') || 'day'

  const trends = await vibe.getCostTrends(c.req.param('modelId'), granularity)

  return c.json({ trends, count: trends.length })
})

// Get ROI analysis
app.get('/api/vibe/:modelId/roi', async (c) => {
  const vibe = new VibeCodingIntegration(c.env.DB)
  const startTime = c.req.query('start') ? parseInt(c.req.query('start')!) : undefined
  const endTime = c.req.query('end') ? parseInt(c.req.query('end')!) : undefined

  const roi = await vibe.getROI(c.req.param('modelId'), startTime, endTime)

  return c.json(roi)
})

export default app
