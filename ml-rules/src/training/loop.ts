/**
 * RL Training Loop - Orchestrates agent learning from business metrics
 */

import type { Env, OKR, Episode, AgentState, AgentAction, PolicyNetwork, TrainingConfig, TrainingProgress } from '../types'
import { calculateOKRReward, calculateGAE } from '../okrs/reward'
import { sampleAction, evaluatePolicy, updatePolicy, createPolicy } from '../agent/policy'
import type { ActionSpace } from '../agent/policy'

/**
 * Run a single training episode
 */
export async function runEpisode(env: Env, policy: PolicyNetwork, okr: OKR, actionSpace: ActionSpace, maxSteps: number = 100): Promise<Episode> {
  const episodeId = `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const episode: Episode = {
    id: episodeId,
    policy_id: policy.id,
    okr_id: okr.id,
    start_time: Date.now(),
    states: [],
    actions: [],
    rewards: [],
    total_reward: 0,
    status: 'running',
  }

  // Initialize state
  let currentState: AgentState = await getInitialState(env)
  episode.states.push(currentState)

  // Run episode
  for (let step = 0; step < maxSteps; step++) {
    // Sample action from policy
    const action = sampleAction(policy, currentState, actionSpace)
    episode.actions.push(action)

    // Execute action in environment
    const nextState = await executeAction(env, action, currentState)
    episode.states.push(nextState)

    // Calculate reward
    const rewardComponents = calculateOKRReward(okr, currentState, action, nextState)
    const reward = rewardComponents.shaped_reward
    episode.rewards.push(reward)
    episode.total_reward += reward

    // Track metrics
    await trackEpisodeMetrics(env, episodeId, step, action, reward, nextState)

    // Check termination conditions
    if (isTerminal(nextState, okr)) {
      break
    }

    currentState = nextState
  }

  // Mark episode as completed
  episode.end_time = Date.now()
  episode.status = 'completed'

  // Store episode in database
  await storeEpisode(env, episode)

  return episode
}

/**
 * Train policy using collected episodes (PPO algorithm)
 */
export async function trainPolicy(env: Env, policy: PolicyNetwork, episodes: Episode[], config: TrainingConfig): Promise<PolicyNetwork> {
  // Collect all states, actions, rewards from episodes
  const allStates: AgentState[] = []
  const allActions: AgentAction[] = []
  const allRewards: number[] = []
  const allValues: number[] = []

  for (const episode of episodes) {
    allStates.push(...episode.states)
    allActions.push(...episode.actions)
    allRewards.push(...episode.rewards)

    // Compute value estimates for each state
    const values = episode.states.map(state => evaluatePolicy(policy, state))
    allValues.push(...values)
  }

  // Calculate advantages using GAE
  const advantages = calculateGAE(allRewards, allValues, config.discount_factor, 0.95)

  // Update policy using PPO
  const updatedPolicy = updatePolicy(policy, allStates, allActions, allRewards, advantages)

  // Save checkpoint
  await saveCheckpoint(env, updatedPolicy)

  return updatedPolicy
}

/**
 * Run full training loop
 */
export async function runTraining(env: Env, okr: OKR, actionSpace: ActionSpace, config: TrainingConfig): Promise<PolicyNetwork> {
  // Create initial policy
  let policy = createPolicy(`policy_${okr.id}`, config.algorithm, {
    learning_rate: config.learning_rate,
    discount_factor: config.discount_factor,
  })

  const progress: TrainingProgress[] = []

  // Training loop
  for (let episode = 0; episode < config.max_episodes; episode++) {
    // Collect batch of episodes
    const episodes: Episode[] = []

    for (let i = 0; i < config.batch_size; i++) {
      const ep = await runEpisode(env, policy, okr, actionSpace, config.max_steps_per_episode)
      episodes.push(ep)
    }

    // Train on batch
    policy = await trainPolicy(env, policy, episodes, config)

    // Track progress
    const avgReward = episodes.reduce((sum, ep) => sum + ep.total_reward, 0) / episodes.length
    const bestReward = Math.max(...episodes.map(ep => ep.total_reward))

    const progressUpdate: TrainingProgress = {
      episode: episode + 1,
      total_episodes: config.max_episodes,
      avg_reward: avgReward,
      best_reward: bestReward,
      epsilon: policy.hyperparameters.epsilon,
      elapsed_time: Date.now() - policy.created_at,
    }

    progress.push(progressUpdate)

    // Log progress
    console.log(`Episode ${episode + 1}/${config.max_episodes}: Avg Reward = ${avgReward.toFixed(2)}, Best = ${bestReward.toFixed(2)}, ε = ${policy.hyperparameters.epsilon.toFixed(4)}`)

    // Checkpoint periodically
    if ((episode + 1) % config.checkpoint_frequency === 0) {
      await saveCheckpoint(env, policy)
      console.log(`Checkpoint saved at episode ${episode + 1}`)
    }

    // Evaluate periodically
    if ((episode + 1) % config.evaluation_frequency === 0) {
      await evaluatePolicy(policy, await getInitialState(env))
      console.log(`Evaluation completed at episode ${episode + 1}`)
    }
  }

  return policy
}

/**
 * Get initial state from environment
 */
async function getInitialState(env: Env): Promise<AgentState> {
  // Query current business metrics
  const metrics = await getCurrentMetrics(env)

  return {
    timestamp: Date.now(),
    metrics,
    context: {},
    history: [],
  }
}

/**
 * Execute action in environment and observe next state
 */
async function executeAction(env: Env, action: AgentAction, currentState: AgentState): Promise<AgentState> {
  // In real implementation, this would:
  // 1. Apply action to production system (e.g., update pricing)
  // 2. Wait for metrics to update
  // 3. Collect new metrics

  // For POC, we simulate the environment dynamics
  const nextMetrics = simulateEnvironmentDynamics(currentState.metrics, action)

  return {
    timestamp: Date.now(),
    metrics: nextMetrics,
    context: currentState.context,
    history: [...currentState.history, action],
  }
}

/**
 * Simulate environment dynamics (for POC)
 */
function simulateEnvironmentDynamics(currentMetrics: Record<string, number>, action: AgentAction): Record<string, number> {
  const nextMetrics = { ...currentMetrics }

  // Simulate effects of different action types
  if (action.type === 'pricing') {
    const priceChange = (action.parameters.base_price - (currentMetrics.price || 79)) / 79
    nextMetrics.revenue = (currentMetrics.revenue || 0) * (1 + priceChange * 0.5)
    nextMetrics.signups = (currentMetrics.signups || 0) * (1 - priceChange * 0.3)
  } else if (action.type === 'features') {
    const enabledCount = action.parameters.enable?.length || 0
    nextMetrics.engagement = (currentMetrics.engagement || 0) * (1 + enabledCount * 0.1)
    nextMetrics.retention = (currentMetrics.retention || 0) * (1 + enabledCount * 0.05)
  } else if (action.type === 'copy') {
    nextMetrics.conversion_rate = (currentMetrics.conversion_rate || 0) * (1 + Math.random() * 0.1 - 0.05)
  }

  // Add noise
  for (const key in nextMetrics) {
    nextMetrics[key] *= 1 + (Math.random() * 0.1 - 0.05)
  }

  return nextMetrics
}

/**
 * Check if state is terminal
 */
function isTerminal(state: AgentState, okr: OKR): boolean {
  // Terminal if any constraint is severely violated
  for (const constraint of okr.constraints) {
    const value = state.metrics[constraint.metric] || 0
    const threshold = constraint.threshold

    if (constraint.operator === 'lte' && value > threshold * 2) return true
    if (constraint.operator === 'gte' && value < threshold * 0.5) return true
  }

  return false
}

/**
 * Get current business metrics
 */
async function getCurrentMetrics(env: Env): Promise<Record<string, number>> {
  // Query analytics service for latest metrics
  // For POC, return mock data
  return {
    revenue: 80000,
    signups: 950,
    retention: 0.82,
    engagement: 0.65,
    churn: 0.06,
    conversion_rate: 0.04,
    satisfaction: 0.88,
    price: 79,
  }
}

/**
 * Track episode metrics
 */
async function trackEpisodeMetrics(env: Env, episodeId: string, step: number, action: AgentAction, reward: number, state: AgentState): Promise<void> {
  // Write to Analytics Engine
  env.ANALYTICS.writeDataPoint({
    blobs: [episodeId, action.type, String(step)],
    doubles: [reward, state.metrics.revenue || 0, state.metrics.engagement || 0],
    indexes: [episodeId],
  })
}

/**
 * Store episode in database
 */
async function storeEpisode(env: Env, episode: Episode): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO episodes (id, policy_id, okr_id, start_time, end_time, total_reward, status, states, actions, rewards)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(episode.id, episode.policy_id, episode.okr_id, episode.start_time, episode.end_time, episode.total_reward, episode.status, JSON.stringify(episode.states), JSON.stringify(episode.actions), JSON.stringify(episode.rewards))
    .run()
}

/**
 * Save policy checkpoint to R2
 */
async function saveCheckpoint(env: Env, policy: PolicyNetwork): Promise<void> {
  const checkpointKey = `checkpoints/${policy.id}_v${policy.version}.json`

  await env.CHECKPOINTS.put(checkpointKey, JSON.stringify(policy), {
    customMetadata: {
      policy_id: policy.id,
      version: String(policy.version),
      avg_reward: String(policy.performance.avg_reward),
      timestamp: String(Date.now()),
    },
  })

  console.log(`Checkpoint saved: ${checkpointKey}`)
}

/**
 * Load policy checkpoint from R2
 */
export async function loadCheckpoint(env: Env, policyId: string, version?: number): Promise<PolicyNetwork | null> {
  let checkpointKey: string

  if (version) {
    checkpointKey = `checkpoints/${policyId}_v${version}.json`
  } else {
    // Find latest version
    const list = await env.CHECKPOINTS.list({ prefix: `checkpoints/${policyId}_` })
    if (list.objects.length === 0) return null

    // Sort by version (descending)
    const sorted = list.objects.sort((a, b) => {
      const versionA = parseInt(a.customMetadata?.version || '0')
      const versionB = parseInt(b.customMetadata?.version || '0')
      return versionB - versionA
    })

    checkpointKey = sorted[0].key
  }

  const object = await env.CHECKPOINTS.get(checkpointKey)
  if (!object) return null

  const text = await object.text()
  const policy = JSON.parse(text) as PolicyNetwork

  // Reconstruct Float32Array
  policy.parameters = new Float32Array(policy.parameters as any)

  return policy
}
