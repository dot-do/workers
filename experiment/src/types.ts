/**
 * Experiment Types
 * Core types for advanced experimentation engine
 */

/**
 * Experiment type - algorithm used for variant selection
 */
export enum ExperimentType {
  /** A/B test with fixed traffic split */
  ABTest = 'ab_test',
  /** Multi-armed bandit with Thompson Sampling */
  ThompsonSampling = 'thompson_sampling',
  /** Multi-armed bandit with Upper Confidence Bound */
  UCB = 'ucb',
  /** Multi-armed bandit with Epsilon-Greedy */
  EpsilonGreedy = 'epsilon_greedy',
  /** Contextual bandit with LinUCB */
  ContextualBandit = 'contextual_bandit',
  /** Bayesian A/B test */
  BayesianAB = 'bayesian_ab',
  /** Multi-variate test */
  MVT = 'mvt',
}

/**
 * Experiment status
 */
export enum ExperimentStatus {
  Draft = 'draft',
  Running = 'running',
  Paused = 'paused',
  Concluded = 'concluded',
}

/**
 * Metric type for tracking
 */
export enum MetricType {
  Binary = 'binary', // Click/no-click, convert/not-convert
  Continuous = 'continuous', // Revenue, time-on-site
  Count = 'count', // Number of actions
}

/**
 * Experiment configuration
 */
export interface ExperimentConfig {
  name: string
  type: ExperimentType
  hypothesis?: string
  description?: string

  /** Goal metrics */
  primaryMetric: string
  secondaryMetrics?: string[]

  /** Traffic allocation (0-1) */
  trafficAllocation: number

  /** Minimum sample size per variant */
  minSampleSize?: number

  /** Significance threshold (0-1, default 0.95) */
  significanceThreshold?: number

  /** Algorithm-specific parameters */
  parameters?: Record<string, any>

  /** Auto-conclude when winner is clear */
  autoPromoteWinner?: boolean

  /** Start/end dates */
  startDate?: string
  endDate?: string

  /** Metadata */
  metadata?: Record<string, any>
}

/**
 * Experiment variant configuration
 */
export interface VariantConfig {
  name: string
  description?: string
  isControl?: boolean

  /** Initial weight (for fixed allocation) */
  weight?: number

  /** Variant-specific config (e.g., ad creative ID, pricing) */
  config: Record<string, any>
}

/**
 * Full experiment definition
 */
export interface Experiment {
  id: string
  config: ExperimentConfig
  variants: Variant[]
  status: ExperimentStatus
  createdAt: string
  updatedAt: string
  startedAt?: string
  concludedAt?: string
  winnerVariantId?: string
}

/**
 * Experiment variant
 */
export interface Variant {
  id: string
  experimentId: string
  name: string
  description?: string
  isControl: boolean
  weight: number
  config: Record<string, any>

  /** Running statistics */
  stats: VariantStats
}

/**
 * Variant statistics
 */
export interface VariantStats {
  assignments: number
  observations: number

  /** For binary metrics (CTR, CVR) */
  successes?: number
  failures?: number

  /** For continuous metrics (revenue) */
  sum?: number
  sumSquares?: number
  mean?: number
  variance?: number

  /** Bayesian parameters */
  alpha?: number // Beta distribution parameter
  beta?: number // Beta distribution parameter

  /** Contextual bandit */
  features?: number[][] // Feature matrix
  rewards?: number[] // Reward history
}

/**
 * Assignment context - used for contextual bandits
 */
export interface AssignmentContext {
  userId: string
  sessionId: string
  timestamp: number

  /** Device, location, etc. */
  device?: 'mobile' | 'desktop' | 'tablet'
  location?: string

  /** Custom features for contextual bandits */
  features?: Record<string, number>
}

/**
 * Variant assignment result
 */
export interface Assignment {
  id: string
  experimentId: string
  variantId: string
  variantName: string
  userId: string
  sessionId: string
  context: AssignmentContext
  assignedAt: string

  /** Variant configuration */
  config: Record<string, any>
}

/**
 * Observation (metric value)
 */
export interface Observation {
  id: string
  assignmentId: string
  experimentId: string
  variantId: string
  metric: string
  value: number
  timestamp: string
  metadata?: Record<string, any>
}

/**
 * Statistical test result
 */
export interface TestResult {
  experimentId: string
  controlVariantId: string
  treatmentVariantId: string
  metric: string

  /** Test statistics */
  pValue: number
  zScore?: number
  tStatistic?: number

  /** Effect size */
  absoluteDifference: number
  relativeLift: number

  /** Confidence intervals */
  controlMean: number
  controlCI: [number, number]
  treatmentMean: number
  treatmentCI: [number, number]

  /** Bayesian */
  probabilityToBeBest?: number
  credibleInterval?: [number, number]

  /** Conclusion */
  isSignificant: boolean
  recommendedAction: 'continue' | 'conclude' | 'stop'
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  experimentId: string
  status: ExperimentStatus
  variants: Variant[]
  winner?: Variant
  testResults: TestResult[]

  /** Overall statistics */
  totalAssignments: number
  totalObservations: number
  duration: number // milliseconds

  /** Recommendations */
  confidence: number
  recommendedAction: 'continue' | 'conclude_winner' | 'conclude_no_winner'

  updatedAt: string
}

/**
 * Algorithm-specific parameters
 */

/** Thompson Sampling parameters */
export interface ThompsonSamplingParams {
  /** Prior alpha (default: 1) */
  priorAlpha?: number
  /** Prior beta (default: 1) */
  priorBeta?: number
}

/** UCB parameters */
export interface UCBParams {
  /** Exploration parameter (default: 2) */
  c?: number
}

/** Epsilon-Greedy parameters */
export interface EpsilonGreedyParams {
  /** Exploration rate (default: 0.1) */
  epsilon?: number
  /** Decay epsilon over time */
  decay?: boolean
}

/** Contextual Bandit parameters */
export interface ContextualBanditParams {
  /** Regularization parameter (default: 1.0) */
  lambda?: number
  /** Exploration parameter (default: 1.0) */
  alpha?: number
}

/** Bayesian A/B test parameters */
export interface BayesianABParams {
  /** Prior alpha (default: 1) */
  priorAlpha?: number
  /** Prior beta (default: 1) */
  priorBeta?: number
  /** Minimum credible interval (default: 0.95) */
  credibleInterval?: number
  /** Stop early if probability to be best > threshold */
  earlyStoppingThreshold?: number
}
