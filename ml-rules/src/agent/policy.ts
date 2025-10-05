/**
 * Policy Network for Business RL Agent
 *
 * Implements PPO (Proximal Policy Optimization) algorithm
 */

import type { AgentState, AgentAction, PolicyNetwork } from '../types'

/**
 * Action space definition
 */
export interface ActionSpace {
  pricing: {
    base_price: [number, number] // [min, max]
    discount: [number, number] // [0, 1]
    trial_period: [number, number] // days
  }
  features: {
    enable: string[] // Feature IDs to enable
    disable: string[] // Feature IDs to disable
    priority: [number, number] // Priority score
  }
  copy: {
    headline: string[]
    cta_text: string[]
    tone: ('friendly' | 'professional' | 'casual' | 'urgent')[]
  }
  layout: {
    hero_position: ('top' | 'center' | 'split')[]
    color_scheme: string[] // Color palette IDs
    cta_placement: ('header' | 'footer' | 'floating' | 'inline')[]
  }
  recommendation: {
    algorithm: ('collaborative' | 'content_based' | 'hybrid')[]
    diversity: [number, number] // [0, 1]
    novelty: [number, number] // [0, 1]
  }
}

/**
 * Sample action from policy (epsilon-greedy exploration)
 */
export function sampleAction(policy: PolicyNetwork, state: AgentState, actionSpace: ActionSpace, epsilon?: number): AgentAction {
  const eps = epsilon ?? policy.hyperparameters.epsilon

  // Epsilon-greedy: explore with probability epsilon
  if (Math.random() < eps) {
    return sampleRandomAction(actionSpace)
  } else {
    return sampleGreedyAction(policy, state, actionSpace)
  }
}

/**
 * Sample random action (exploration)
 */
function sampleRandomAction(actionSpace: ActionSpace): AgentAction {
  const actionTypes = ['pricing', 'features', 'copy', 'layout', 'recommendation'] as const
  const type = actionTypes[Math.floor(Math.random() * actionTypes.length)]

  switch (type) {
    case 'pricing':
      return {
        type: 'pricing',
        parameters: {
          base_price: randomInRange(actionSpace.pricing.base_price),
          discount: randomInRange(actionSpace.pricing.discount),
          trial_period: Math.floor(randomInRange(actionSpace.pricing.trial_period)),
        },
      }

    case 'features':
      return {
        type: 'features',
        parameters: {
          enable: randomSample(actionSpace.features.enable, Math.floor(Math.random() * 3)),
          disable: randomSample(actionSpace.features.disable, Math.floor(Math.random() * 2)),
          priority: randomInRange(actionSpace.features.priority),
        },
      }

    case 'copy':
      return {
        type: 'copy',
        parameters: {
          headline: randomChoice(actionSpace.copy.headline),
          cta_text: randomChoice(actionSpace.copy.cta_text),
          tone: randomChoice(actionSpace.copy.tone),
        },
      }

    case 'layout':
      return {
        type: 'layout',
        parameters: {
          hero_position: randomChoice(actionSpace.layout.hero_position),
          color_scheme: randomChoice(actionSpace.layout.color_scheme),
          cta_placement: randomChoice(actionSpace.layout.cta_placement),
        },
      }

    case 'recommendation':
      return {
        type: 'recommendation',
        parameters: {
          algorithm: randomChoice(actionSpace.recommendation.algorithm),
          diversity: randomInRange(actionSpace.recommendation.diversity),
          novelty: randomInRange(actionSpace.recommendation.novelty),
        },
      }
  }
}

/**
 * Sample greedy action (exploitation using policy network)
 */
function sampleGreedyAction(policy: PolicyNetwork, state: AgentState, actionSpace: ActionSpace): AgentAction {
  // In a real implementation, this would use the neural network
  // For POC, we use a simple heuristic based on current metrics

  // Choose action type based on what needs improvement
  const metrics = state.metrics

  if ((metrics.revenue || 0) < (metrics.revenue_target || Infinity)) {
    // Focus on revenue: pricing optimization
    return {
      type: 'pricing',
      parameters: {
        base_price: optimizePrice(metrics),
        discount: optimizeDiscount(metrics),
        trial_period: optimizeTrialPeriod(metrics),
      },
    }
  } else if ((metrics.engagement || 0) < (metrics.engagement_target || Infinity)) {
    // Focus on engagement: feature rollout
    return {
      type: 'features',
      parameters: {
        enable: selectBestFeatures(metrics, 2),
        disable: [],
        priority: 0.8,
      },
    }
  } else {
    // Default: optimize conversion with better copy
    return {
      type: 'copy',
      parameters: {
        headline: selectBestHeadline(metrics),
        cta_text: selectBestCTA(metrics),
        tone: selectBestTone(metrics),
      },
    }
  }
}

/**
 * Update policy network (simplified PPO update)
 */
export function updatePolicy(
  policy: PolicyNetwork,
  states: AgentState[],
  actions: AgentAction[],
  rewards: number[],
  advantages: number[]
): PolicyNetwork {
  // In a real implementation, this would:
  // 1. Compute action probabilities under old policy
  // 2. Compute action probabilities under new policy
  // 3. Calculate importance sampling ratio
  // 4. Clip ratio to prevent large policy changes
  // 5. Compute policy gradient loss
  // 6. Update network parameters via gradient descent

  // For POC, we simulate the update
  const avgReward = rewards.reduce((a, b) => a + b, 0) / rewards.length
  const totalEpisodes = policy.performance.episodes + 1

  return {
    ...policy,
    version: policy.version + 1,
    performance: {
      episodes: totalEpisodes,
      total_reward: policy.performance.total_reward + rewards.reduce((a, b) => a + b, 0),
      avg_reward: (policy.performance.avg_reward * policy.performance.episodes + avgReward) / totalEpisodes,
      best_reward: Math.max(policy.performance.best_reward, Math.max(...rewards)),
    },
    hyperparameters: {
      ...policy.hyperparameters,
      // Decay epsilon (exploration rate)
      epsilon: Math.max(0.01, policy.hyperparameters.epsilon * 0.995),
    },
    updated_at: Date.now(),
  }
}

/**
 * Evaluate policy on state (get value estimate)
 */
export function evaluatePolicy(policy: PolicyNetwork, state: AgentState): number {
  // In a real implementation, this would run the value network
  // For POC, we estimate value based on current metrics

  const metrics = state.metrics
  let value = 0

  // Simple heuristic value function
  value += (metrics.revenue || 0) / 100000 // Normalize revenue
  value += (metrics.retention || 0) * 2 // Weight retention highly
  value += (metrics.engagement || 0) * 0.5
  value -= (metrics.churn || 0) * 3 // Penalize churn

  return value
}

/**
 * Create a new policy network
 */
export function createPolicy(
  id: string,
  architecture: 'ppo' | 'a3c' | 'dqn' | 'sac' = 'ppo',
  hyperparameters?: Partial<PolicyNetwork['hyperparameters']>
): PolicyNetwork {
  return {
    id,
    version: 1,
    architecture,
    parameters: new Float32Array(1000), // Placeholder parameter vector
    hyperparameters: {
      learning_rate: hyperparameters?.learning_rate || 0.001,
      discount_factor: hyperparameters?.discount_factor || 0.99,
      epsilon: hyperparameters?.epsilon || 0.1,
      entropy_coefficient: hyperparameters?.entropy_coefficient || 0.01,
      value_coefficient: hyperparameters?.value_coefficient || 0.5,
    },
    performance: {
      episodes: 0,
      total_reward: 0,
      avg_reward: 0,
      best_reward: -Infinity,
    },
    created_at: Date.now(),
    updated_at: Date.now(),
  }
}

// ===== Helper Functions =====

function randomInRange([min, max]: [number, number]): number {
  return min + Math.random() * (max - min)
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomSample<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function optimizePrice(metrics: Record<string, number>): number {
  // Simple heuristic: increase price if demand is high
  const demand = metrics.signups || 0
  const target = metrics.signup_target || 1000
  return demand > target ? 99 : 79
}

function optimizeDiscount(metrics: Record<string, number>): number {
  // Offer discount if conversion is low
  const conversion = metrics.conversion_rate || 0
  return conversion < 0.03 ? 0.2 : 0.1
}

function optimizeTrialPeriod(metrics: Record<string, number>): number {
  // Longer trial if activation rate is low
  const activation = metrics.activation_rate || 0
  return activation < 0.5 ? 14 : 7
}

function selectBestFeatures(metrics: Record<string, number>, count: number): string[] {
  // In real implementation, would analyze feature engagement
  return ['feature_1', 'feature_2'].slice(0, count)
}

function selectBestHeadline(metrics: Record<string, number>): string {
  return metrics.engagement > 0.5 ? 'Transform your business today' : 'Get started in minutes'
}

function selectBestCTA(metrics: Record<string, number>): string {
  return metrics.conversion_rate > 0.05 ? 'Start free trial' : 'Try it free'
}

function selectBestTone(metrics: Record<string, number>): 'friendly' | 'professional' | 'casual' | 'urgent' {
  const satisfaction = metrics.satisfaction || 0
  return satisfaction > 0.8 ? 'friendly' : 'professional'
}
