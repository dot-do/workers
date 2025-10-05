/**
 * Core Types for Business-as-Code RL Platform
 */

import type { Ai } from '@cloudflare/workers-types'

export interface Env {
  AI: Ai
  DB: D1Database
  CHECKPOINTS: R2Bucket
  ANALYTICS: AnalyticsEngineDataset
  KV: KVNamespace
  TRAINING_WORKFLOW: Workflow
  AI_SERVICE: any
  CODE_EXEC: any
  ANALYTICS_SERVICE: any

  // Environment variables
  ENVIRONMENT: string
  MAX_EPISODE_LENGTH: string
  LEARNING_RATE: string
  DISCOUNT_FACTOR: string
  EXPLORATION_RATE: string
}

// ===== OKR Types =====

export interface OKR {
  id: string
  objective: string
  keyResults: KeyResult[]
  constraints: Constraint[]
  northStar?: NorthStarMetric
  created_at: number
  updated_at: number
}

export interface KeyResult {
  id: string
  description: string
  metric: string
  target: number
  current: number
  weight: number // Importance weight (0-1)
  direction: 'maximize' | 'minimize'
  unit?: string
}

export interface Constraint {
  id: string
  description: string
  metric: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  threshold: number
  penalty: number // Penalty weight if violated
}

export interface NorthStarMetric {
  metric: string
  description: string
  formula?: string // Optional formula combining multiple metrics
}

// ===== Agent Types =====

export interface AgentAction {
  type: 'pricing' | 'feature' | 'copy' | 'layout' | 'recommendation' | 'custom'
  parameters: Record<string, any>
  metadata?: Record<string, any>
}

export interface AgentState {
  timestamp: number
  metrics: Record<string, number>
  context: Record<string, any>
  history: AgentAction[]
}

export interface PolicyNetwork {
  id: string
  version: number
  architecture: 'ppo' | 'a3c' | 'dqn' | 'sac'
  parameters: Float32Array
  hyperparameters: {
    learning_rate: number
    discount_factor: number
    epsilon: number // Exploration rate
    entropy_coefficient?: number
    value_coefficient?: number
  }
  performance: {
    episodes: number
    total_reward: number
    avg_reward: number
    best_reward: number
  }
  created_at: number
  updated_at: number
}

export interface Episode {
  id: string
  policy_id: string
  okr_id: string
  start_time: number
  end_time?: number
  states: AgentState[]
  actions: AgentAction[]
  rewards: number[]
  total_reward: number
  status: 'running' | 'completed' | 'failed'
}

// ===== Vibe Coding Types =====

export interface CodeVariant {
  id: string
  experiment_id: string
  code: string
  language: 'javascript' | 'typescript'
  model: string // LLM used to generate
  prompt: string
  success: boolean
  error?: string
  performance?: {
    latency: number
    tokens_used: number
    cost: number
  }
  created_at: number
}

export interface VibeExperiment {
  id: string
  description: string
  prompt: string
  models: string[] // Models to try
  variants: CodeVariant[]
  best_variant_id?: string
  status: 'pending' | 'running' | 'completed'
  created_at: number
  completed_at?: number
}

// ===== Metrics Types =====

export interface BusinessMetric {
  name: string
  value: number
  timestamp: number
  dimensions?: Record<string, string>
}

export interface MetricWindow {
  metric: string
  window: '1h' | '1d' | '7d' | '30d'
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  value: number
}

// ===== Reward Function Types =====

export interface RewardFunction {
  okr_id: string
  calculate: (state: AgentState, action: AgentAction, nextState: AgentState) => number
  normalize: (reward: number) => number
  shape: (rawReward: number, constraints: Constraint[]) => number
}

export interface RewardComponents {
  okr_reward: number // Main OKR-based reward
  constraint_penalty: number // Penalty for constraint violations
  exploration_bonus: number // Bonus for exploration
  shaped_reward: number // Final shaped reward
  breakdown: Record<string, number> // Detailed breakdown
}

// ===== Training Types =====

export interface TrainingConfig {
  algorithm: 'ppo' | 'a3c' | 'dqn' | 'sac'
  max_episodes: number
  max_steps_per_episode: number
  batch_size: number
  learning_rate: number
  discount_factor: number
  exploration_strategy: 'epsilon-greedy' | 'ucb' | 'thompson-sampling'
  checkpoint_frequency: number
  evaluation_frequency: number
}

export interface TrainingProgress {
  episode: number
  total_episodes: number
  avg_reward: number
  best_reward: number
  epsilon: number
  loss?: number
  elapsed_time: number
}

// ===== API Response Types =====

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: number
    duration?: number
    [key: string]: any
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}
