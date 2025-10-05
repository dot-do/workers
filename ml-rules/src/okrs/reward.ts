/**
 * OKR-based Reward Function Calculator
 *
 * Converts business OKRs into reward signals for RL agents
 */

import type { OKR, AgentState, AgentAction, RewardComponents, Constraint } from '../types'

/**
 * Calculate reward from OKR for a state transition
 */
export function calculateOKRReward(okr: OKR, prevState: AgentState, action: AgentAction, nextState: AgentState): RewardComponents {
  // 1. Calculate raw OKR reward (weighted sum of key result improvements)
  let okrReward = 0
  const breakdown: Record<string, number> = {}

  for (const kr of okr.keyResults) {
    const prevValue = prevState.metrics[kr.metric] || 0
    const nextValue = nextState.metrics[kr.metric] || 0

    // Calculate improvement
    const improvement = kr.direction === 'maximize' ? nextValue - prevValue : prevValue - nextValue

    // Normalize by target
    const normalizedImprovement = improvement / kr.target

    // Weight by importance
    const weightedReward = normalizedImprovement * kr.weight

    okrReward += weightedReward
    breakdown[`kr_${kr.metric}`] = weightedReward
  }

  // 2. Calculate constraint penalties
  let constraintPenalty = 0

  for (const constraint of okr.constraints) {
    const value = nextState.metrics[constraint.metric] || 0
    const violated = isConstraintViolated(constraint, value)

    if (violated) {
      const penalty = constraint.penalty * calculateViolationSeverity(constraint, value)
      constraintPenalty += penalty
      breakdown[`penalty_${constraint.metric}`] = -penalty
    }
  }

  // 3. Calculate exploration bonus (encourage trying new actions)
  const explorationBonus = calculateExplorationBonus(action, prevState)
  breakdown['exploration'] = explorationBonus

  // 4. Shape the reward (apply transformations)
  const shapedReward = shapeReward(okrReward - constraintPenalty + explorationBonus, okr)

  return {
    okr_reward: okrReward,
    constraint_penalty: constraintPenalty,
    exploration_bonus: explorationBonus,
    shaped_reward: shapedReward,
    breakdown,
  }
}

/**
 * Check if a constraint is violated
 */
function isConstraintViolated(constraint: Constraint, value: number): boolean {
  switch (constraint.operator) {
    case 'gt':
      return value <= constraint.threshold
    case 'gte':
      return value < constraint.threshold
    case 'lt':
      return value >= constraint.threshold
    case 'lte':
      return value > constraint.threshold
    case 'eq':
      return Math.abs(value - constraint.threshold) > 0.001
    default:
      return false
  }
}

/**
 * Calculate severity of constraint violation
 */
function calculateViolationSeverity(constraint: Constraint, value: number): number {
  const diff = Math.abs(value - constraint.threshold)
  const threshold = Math.abs(constraint.threshold) || 1.0

  // Normalize violation magnitude (0 = no violation, 1 = severe violation)
  return Math.min(diff / threshold, 1.0)
}

/**
 * Calculate exploration bonus for trying novel actions
 */
function calculateExplorationBonus(action: AgentAction, state: AgentState): number {
  // Count how many times this action type has been used
  const actionHistory = state.history.filter(a => a.type === action.type)
  const frequency = actionHistory.length / Math.max(state.history.length, 1)

  // Bonus for less-explored actions (inverse frequency)
  const noveltyBonus = Math.max(0, 0.1 * (1 - frequency))

  // Additional bonus for parameter diversity
  const diversityBonus = calculateParameterDiversity(action, actionHistory)

  return noveltyBonus + diversityBonus
}

/**
 * Calculate diversity of action parameters compared to history
 */
function calculateParameterDiversity(action: AgentAction, history: AgentAction[]): number {
  if (history.length === 0) return 0.1

  // Calculate average parameter difference
  let totalDiff = 0
  let paramCount = 0

  for (const key in action.parameters) {
    const currentValue = action.parameters[key]
    const avgHistoricalValue = history.reduce((sum, a) => sum + (a.parameters[key] || 0), 0) / history.length

    if (typeof currentValue === 'number' && typeof avgHistoricalValue === 'number') {
      totalDiff += Math.abs(currentValue - avgHistoricalValue)
      paramCount++
    }
  }

  return paramCount > 0 ? Math.min(totalDiff / paramCount / 100, 0.05) : 0
}

/**
 * Shape reward to improve learning (optional transformations)
 */
function shapeReward(rawReward: number, okr: OKR): number {
  let shaped = rawReward

  // 1. Clip extreme rewards to prevent instability
  shaped = Math.max(-10, Math.min(10, shaped))

  // 2. Add potential-based shaping (distance to goal)
  const potentialBonus = calculatePotentialShaping(okr)
  shaped += potentialBonus

  // 3. Apply discount for long-term rewards
  // (handled by RL algorithm, not here)

  return shaped
}

/**
 * Calculate potential-based reward shaping
 * (Reward based on how much closer we are to the goal)
 */
function calculatePotentialShaping(okr: OKR): number {
  // Calculate how close we are to achieving all key results
  const overallProgress = okr.keyResults.reduce((sum, kr) => {
    const progress = kr.direction === 'maximize' ? Math.min(kr.current / kr.target, 1.0) : Math.max(1.0 - kr.current / kr.target, 0.0)

    return sum + kr.weight * progress
  }, 0)

  // Small bonus for getting closer to goal (max 0.1)
  return Math.min(overallProgress * 0.1, 0.1)
}

/**
 * Normalize reward to [-1, 1] range for stable learning
 */
export function normalizeReward(reward: number, min: number = -10, max: number = 10): number {
  return 2 * ((reward - min) / (max - min)) - 1
}

/**
 * Calculate cumulative discounted reward (return)
 */
export function calculateReturn(rewards: number[], discountFactor: number = 0.99): number {
  let ret = 0
  let discount = 1

  for (const reward of rewards) {
    ret += discount * reward
    discount *= discountFactor
  }

  return ret
}

/**
 * Calculate advantage (how much better than expected)
 */
export function calculateAdvantage(reward: number, value: number, nextValue: number, discountFactor: number = 0.99): number {
  // TD(0) advantage: A = r + γV(s') - V(s)
  return reward + discountFactor * nextValue - value
}

/**
 * Calculate Generalized Advantage Estimation (GAE)
 */
export function calculateGAE(rewards: number[], values: number[], discountFactor: number = 0.99, gaeParam: number = 0.95): number[] {
  const advantages: number[] = []
  let lastAdvantage = 0

  // Work backwards from the end
  for (let t = rewards.length - 1; t >= 0; t--) {
    const delta = rewards[t] + discountFactor * (values[t + 1] || 0) - values[t]
    lastAdvantage = delta + discountFactor * gaeParam * lastAdvantage
    advantages[t] = lastAdvantage
  }

  return advantages
}

/**
 * Multi-objective reward aggregation
 */
export function aggregateMultiObjectiveRewards(
  rewards: Record<string, number>,
  weights: Record<string, number>,
  method: 'weighted_sum' | 'chebyshev' | 'hypervolume' = 'weighted_sum'
): number {
  if (method === 'weighted_sum') {
    // Simple weighted sum
    return Object.entries(rewards).reduce((sum, [key, value]) => {
      return sum + (weights[key] || 0) * value
    }, 0)
  } else if (method === 'chebyshev') {
    // Chebyshev scalarization (minimize worst-case deviation)
    return Math.min(...Object.entries(rewards).map(([key, value]) => (weights[key] || 0) * value))
  } else {
    // Default to weighted sum
    return Object.entries(rewards).reduce((sum, [key, value]) => {
      return sum + (weights[key] || 0) * value
    }, 0)
  }
}
