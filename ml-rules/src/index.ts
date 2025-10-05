/**
 * Business-as-Code Reinforcement Learning Platform
 *
 * Main API Worker with Hono Routes
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, OKR, VibeExperiment, TrainingConfig } from './types'
import { createOKR, exampleOKRs, validateOKR, calculateOKRProgress } from './okrs/dsl'
import { runTraining, runEpisode, loadCheckpoint } from './training/loop'
import { createPolicy } from './agent/policy'
import type { ActionSpace } from './agent/policy'
import { generateCodeVariants, createVibeExperiment, runVibeExperiment, selectBestVariant } from './vibe/generator'

const app = new Hono<{ Bindings: Env }>()

// CORS
app.use('/*', cors())

/**
 * Health Check
 */
app.get('/health', c => {
  return c.json({
    status: 'healthy',
    service: 'business-rl',
    timestamp: Date.now(),
    features: ['okrs', 'rl-training', 'vibe-coding', 'metrics'],
  })
})

// ===== OKR API =====

/**
 * List all OKRs
 */
app.get('/api/okrs', async c => {
  const result = await c.env.DB.prepare('SELECT * FROM okrs ORDER BY created_at DESC').all()

  return c.json({ okrs: result.results })
})

/**
 * Get OKR by ID
 */
app.get('/api/okrs/:id', async c => {
  const id = c.req.param('id')
  const okr = await c.env.DB.prepare('SELECT * FROM okrs WHERE id = ?').bind(id).first<any>()

  if (!okr) {
    return c.json({ error: 'OKR not found' }, 404)
  }

  // Parse JSON fields
  const parsed: OKR = {
    ...okr,
    keyResults: JSON.parse(okr.keyResults),
    constraints: JSON.parse(okr.constraints),
    northStar: okr.northStar ? JSON.parse(okr.northStar) : undefined,
  }

  // Calculate progress
  const progress = calculateOKRProgress(parsed)

  return c.json({ okr: parsed, progress })
})

/**
 * Create OKR
 */
app.post('/api/okrs', async c => {
  const body = (await c.req.json()) as OKR

  // Validate
  const validation = validateOKR(body)
  if (!validation.valid) {
    return c.json({ error: 'Invalid OKR', errors: validation.errors }, 400)
  }

  // Store
  await c.env.DB.prepare('INSERT INTO okrs (id, objective, keyResults, constraints, northStar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(body.id, body.objective, JSON.stringify(body.keyResults), JSON.stringify(body.constraints), body.northStar ? JSON.stringify(body.northStar) : null, body.created_at, body.updated_at)
    .run()

  return c.json({ okr: body }, 201)
})

/**
 * Get example OKRs
 */
app.get('/api/okrs/examples', c => {
  return c.json({ examples: exampleOKRs })
})

// ===== RL Agent API =====

/**
 * List policies
 */
app.get('/api/policies', async c => {
  const result = await c.env.DB.prepare('SELECT * FROM policies ORDER BY created_at DESC').all()

  return c.json({ policies: result.results })
})

/**
 * Get policy by ID
 */
app.get('/api/policies/:id', async c => {
  const id = c.req.param('id')
  const version = c.req.query('version') ? parseInt(c.req.query('version')!) : undefined

  const policy = await loadCheckpoint(c.env, id, version)

  if (!policy) {
    return c.json({ error: 'Policy not found' }, 404)
  }

  return c.json({ policy })
})

/**
 * Create new policy
 */
app.post('/api/policies', async c => {
  const body = (await c.req.json()) as { id: string; architecture?: 'ppo' | 'a3c' | 'dqn' | 'sac'; hyperparameters?: any }

  const policy = createPolicy(body.id, body.architecture, body.hyperparameters)

  // Store in database
  await c.env.DB.prepare('INSERT INTO policies (id, version, architecture, hyperparameters, performance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(policy.id, policy.version, policy.architecture, JSON.stringify(policy.hyperparameters), JSON.stringify(policy.performance), policy.created_at, policy.updated_at)
    .run()

  return c.json({ policy }, 201)
})

/**
 * Start training
 */
app.post('/api/training/start', async c => {
  const body = (await c.req.json()) as {
    okr_id: string
    action_space: ActionSpace
    config: TrainingConfig
  }

  // Get OKR
  const okrRow = await c.env.DB.prepare('SELECT * FROM okrs WHERE id = ?').bind(body.okr_id).first<any>()

  if (!okrRow) {
    return c.json({ error: 'OKR not found' }, 404)
  }

  const okr: OKR = {
    ...okrRow,
    keyResults: JSON.parse(okrRow.keyResults),
    constraints: JSON.parse(okrRow.constraints),
    northStar: okrRow.northStar ? JSON.parse(okrRow.northStar) : undefined,
  }

  // Start training (async)
  c.executionCtx.waitUntil(
    runTraining(c.env, okr, body.action_space, body.config).then(policy => {
      console.log(`Training completed for OKR ${okr.id}. Final avg reward: ${policy.performance.avg_reward}`)
    })
  )

  return c.json({
    message: 'Training started',
    okr_id: body.okr_id,
    config: body.config,
  })
})

/**
 * List episodes
 */
app.get('/api/episodes', async c => {
  const policyId = c.req.query('policy_id')
  const okrId = c.req.query('okr_id')

  let query = 'SELECT * FROM episodes ORDER BY start_time DESC LIMIT 100'
  const bindings: string[] = []

  if (policyId) {
    query = 'SELECT * FROM episodes WHERE policy_id = ? ORDER BY start_time DESC LIMIT 100'
    bindings.push(policyId)
  } else if (okrId) {
    query = 'SELECT * FROM episodes WHERE okr_id = ? ORDER BY start_time DESC LIMIT 100'
    bindings.push(okrId)
  }

  const result = await c.env.DB.prepare(query).bind(...bindings).all()

  return c.json({ episodes: result.results })
})

// ===== Vibe Coding API =====

/**
 * Generate code variants
 */
app.post('/api/vibe/generate', async c => {
  const body = (await c.req.json()) as {
    prompt: string
    models?: string[]
    config?: any
  }

  const variants = await generateCodeVariants(c.env, body.prompt, {
    models: body.models,
    ...body.config,
  })

  return c.json({ variants, count: variants.length })
})

/**
 * Create Vibe experiment
 */
app.post('/api/vibe/experiments', async c => {
  const body = (await c.req.json()) as {
    description: string
    prompt: string
    models?: string[]
  }

  const experiment = await createVibeExperiment(c.env, body.description, body.prompt, body.models)

  return c.json({ experiment }, 201)
})

/**
 * Run Vibe experiment
 */
app.post('/api/vibe/experiments/:id/run', async c => {
  const id = c.req.param('id')

  const experiment = await runVibeExperiment(c.env, id)

  return c.json({ experiment })
})

/**
 * List Vibe experiments
 */
app.get('/api/vibe/experiments', async c => {
  const result = await c.env.DB.prepare('SELECT * FROM vibe_experiments ORDER BY created_at DESC').all()

  return c.json({ experiments: result.results })
})

/**
 * Get Vibe experiment by ID
 */
app.get('/api/vibe/experiments/:id', async c => {
  const id = c.req.param('id')

  const expRow = await c.env.DB.prepare('SELECT * FROM vibe_experiments WHERE id = ?').bind(id).first<any>()

  if (!expRow) {
    return c.json({ error: 'Experiment not found' }, 404)
  }

  const variantsResult = await c.env.DB.prepare('SELECT * FROM code_variants WHERE experiment_id = ?').bind(id).all()

  const experiment: VibeExperiment = {
    ...expRow,
    models: JSON.parse(expRow.models),
    variants: variantsResult.results as any,
  }

  return c.json({ experiment })
})

// ===== Metrics API =====

/**
 * Track business metric
 */
app.post('/api/metrics/track', async c => {
  const body = (await c.req.json()) as {
    metric: string
    value: number
    dimensions?: Record<string, string>
  }

  // Write to Analytics Engine
  c.env.ANALYTICS.writeDataPoint({
    blobs: [body.metric],
    doubles: [body.value],
    indexes: [body.metric],
  })

  return c.json({ success: true })
})

/**
 * Query metrics
 */
app.get('/api/metrics/query', async c => {
  const metric = c.req.query('metric')
  const startDate = c.req.query('start_date')
  const endDate = c.req.query('end_date')

  // Query Analytics Engine (SQL query)
  const query = `
    SELECT
      blob1 as metric,
      avg(double1) as avg_value,
      sum(double1) as total_value,
      count() as count
    FROM analytics
    WHERE blob1 = ?
    AND timestamp >= ?
    AND timestamp <= ?
    GROUP BY blob1
  `

  // Note: Actual Analytics Engine query syntax may differ
  // This is a conceptual example

  return c.json({
    metric,
    period: { start: startDate, end: endDate },
    data: {
      avg_value: 0,
      total_value: 0,
      count: 0,
    },
  })
})

// ===== Dashboard & Docs =====

/**
 * Get dashboard data
 */
app.get('/api/dashboard', async c => {
  // Get latest OKRs with progress
  const okrsResult = await c.env.DB.prepare('SELECT * FROM okrs ORDER BY created_at DESC LIMIT 5').all()

  const okrs = okrsResult.results.map((row: any) => {
    const okr: OKR = {
      ...row,
      keyResults: JSON.parse(row.keyResults),
      constraints: JSON.parse(row.constraints),
      northStar: row.northStar ? JSON.parse(row.northStar) : undefined,
    }
    return {
      okr,
      progress: calculateOKRProgress(okr),
    }
  })

  // Get latest policies
  const policiesResult = await c.env.DB.prepare('SELECT * FROM policies ORDER BY updated_at DESC LIMIT 5').all()

  // Get recent episodes
  const episodesResult = await c.env.DB.prepare('SELECT * FROM episodes ORDER BY start_time DESC LIMIT 10').all()

  return c.json({
    okrs,
    policies: policiesResult.results,
    episodes: episodesResult.results,
    timestamp: Date.now(),
  })
})

/**
 * API Documentation
 */
app.get('/api/docs', c => {
  return c.json({
    service: 'Business-as-Code RL Platform',
    version: '1.0.0',
    description: 'Reinforcement Learning platform that uses business OKRs as reward functions',
    endpoints: {
      okrs: {
        list: 'GET /api/okrs',
        get: 'GET /api/okrs/:id',
        create: 'POST /api/okrs',
        examples: 'GET /api/okrs/examples',
      },
      policies: {
        list: 'GET /api/policies',
        get: 'GET /api/policies/:id',
        create: 'POST /api/policies',
      },
      training: {
        start: 'POST /api/training/start',
      },
      episodes: {
        list: 'GET /api/episodes',
      },
      vibe: {
        generate: 'POST /api/vibe/generate',
        createExperiment: 'POST /api/vibe/experiments',
        runExperiment: 'POST /api/vibe/experiments/:id/run',
        listExperiments: 'GET /api/vibe/experiments',
        getExperiment: 'GET /api/vibe/experiments/:id',
      },
      metrics: {
        track: 'POST /api/metrics/track',
        query: 'GET /api/metrics/query',
      },
      dashboard: {
        get: 'GET /api/dashboard',
      },
    },
  })
})

/**
 * Root route
 */
app.get('/', c => {
  return c.json({
    service: 'Business-as-Code RL Platform',
    tagline: 'Optimize your business with AI agents that learn from OKRs',
    docs: '/api/docs',
    dashboard: '/api/dashboard',
  })
})

export default app
