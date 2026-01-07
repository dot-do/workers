/**
 * goals.do - What do you want goals to .do for you?
 *
 * Goals that track themselves with automatic progress updates.
 *
 * @see https://goals.do
 *
 * @example
 * ```typescript
 * import goals from 'goals.do'
 *
 * // Tagged template - describe what you want
 * const goal = await goals.do`
 *   Increase monthly revenue to $100k
 *   by tracking Stripe payments
 * `
 *
 * // Connect data sources
 * await goals.connect('revenue-goal', {
 *   source: 'stripe.payments',
 *   metric: 'sum(amount)',
 *   period: 'monthly'
 * })
 *
 * // Check progress anytime
 * const status = await goals.progress('revenue-goal')
 * // { current: 78000, target: 100000, percentage: 78 }
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Goal {
  id: string
  name: string
  description?: string
  target: Target
  timeframe: TimeFrame
  status: GoalStatus
  progress: Progress
  milestones?: Milestone[]
  parentId?: string // For cascading goals
  alignedTo?: string[] // Goals this aligns with
  dataSources?: DataSource[]
  owner?: string
  team?: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

export type GoalStatus = 'draft' | 'active' | 'on_track' | 'at_risk' | 'behind' | 'completed' | 'cancelled'

export interface Target {
  metric: string
  value: number
  unit?: string
  direction: 'increase' | 'decrease' | 'maintain'
  baseline?: number
}

export interface Progress {
  current: number
  target: number
  percentage: number
  trend: 'improving' | 'stable' | 'declining'
  velocity?: number // Rate of change
  projectedCompletion?: Date
  lastUpdated: Date
}

export interface Milestone {
  id: string
  name: string
  target: number
  dueDate?: Date
  status: 'pending' | 'reached' | 'missed'
  reachedAt?: Date
}

export interface TimeFrame {
  start: Date
  end: Date
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
}

export interface DataSource {
  id: string
  type: string // 'stripe', 'analytics', 'database', 'webhook', 'api'
  config: Record<string, unknown>
  metric: string
  aggregation?: 'sum' | 'count' | 'average' | 'min' | 'max' | 'latest'
  filter?: string
  lastSync?: Date
}

export interface GoalUpdate {
  timestamp: Date
  type: 'progress' | 'status' | 'milestone' | 'manual'
  previousValue?: number
  newValue: number
  source?: string
  note?: string
}

export interface CascadeOptions {
  parentId: string
  contribution?: number // How much this goal contributes to parent (0-100%)
  autoRollup?: boolean
}

export interface AlignmentOptions {
  goalId: string
  relationship: 'supports' | 'blocks' | 'related'
  weight?: number
}

export interface DoOptions {
  context?: Record<string, unknown>
  timeframe?: Partial<TimeFrame>
  owner?: string
  team?: string
}

// Tagged template helper
type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

function tagged<T>(fn: (prompt: string, options?: DoOptions) => T): TaggedTemplate<T> {
  return function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      return fn(stringsOrPrompt, values[0] as DoOptions | undefined)
    }
    const prompt = stringsOrPrompt.reduce((acc, str, i) =>
      acc + str + (values[i] !== undefined ? String(values[i]) : ''), ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

// Client interface
export interface GoalsClient {
  /**
   * Create a goal from natural language
   *
   * @example
   * ```typescript
   * const goal = await goals.do`
   *   Increase monthly revenue to $100k
   *   by end of Q2
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Goal>>

  /**
   * Create a new goal
   */
  create(goal: {
    name: string
    description?: string
    target: Target
    timeframe: TimeFrame
    milestones?: Omit<Milestone, 'id' | 'status'>[]
    parentId?: string
    owner?: string
    team?: string
    tags?: string[]
  }): Promise<Goal>

  /**
   * Get a goal by ID or name
   */
  get(idOrName: string): Promise<Goal>

  /**
   * List all goals
   */
  list(options?: {
    status?: GoalStatus
    owner?: string
    team?: string
    tags?: string[]
    parentId?: string
    period?: TimeFrame['period']
    limit?: number
  }): Promise<Goal[]>

  /**
   * Update a goal
   */
  update(idOrName: string, updates: Partial<Omit<Goal, 'id' | 'createdAt' | 'progress'>>): Promise<Goal>

  /**
   * Delete a goal
   */
  delete(idOrName: string): Promise<void>

  // Progress tracking

  /**
   * Get current progress for a goal
   */
  progress(idOrName: string): Promise<Progress>

  /**
   * Manually record progress
   */
  record(idOrName: string, value: number, options?: { note?: string; source?: string }): Promise<Progress>

  /**
   * Connect a data source for automatic progress tracking
   */
  connect(idOrName: string, source: Omit<DataSource, 'id' | 'lastSync'>): Promise<DataSource>

  /**
   * Disconnect a data source
   */
  disconnect(idOrName: string, sourceId: string): Promise<void>

  /**
   * Force sync from data sources
   */
  sync(idOrName: string): Promise<Progress>

  /**
   * Get progress history
   */
  history(idOrName: string, options?: { from?: Date; to?: Date; limit?: number }): Promise<GoalUpdate[]>

  // Milestones

  /**
   * Get milestones for a goal
   */
  milestones(idOrName: string): Promise<Milestone[]>

  /**
   * Add a milestone to a goal
   */
  addMilestone(idOrName: string, milestone: { name: string; target: number; dueDate?: Date }): Promise<Milestone>

  /**
   * Remove a milestone
   */
  removeMilestone(idOrName: string, milestoneId: string): Promise<void>

  // Goal hierarchy

  /**
   * Cascade a goal under a parent goal
   */
  cascade(idOrName: string, options: CascadeOptions): Promise<Goal>

  /**
   * Get child goals that roll up to a parent
   */
  children(idOrName: string): Promise<Goal[]>

  /**
   * Align a goal with other goals
   */
  align(idOrName: string, options: AlignmentOptions): Promise<Goal>

  /**
   * Get aligned goals
   */
  alignments(idOrName: string): Promise<Array<{ goal: Goal; relationship: AlignmentOptions['relationship'] }>>

  // Analytics

  /**
   * Get goal analytics and forecasts
   */
  analyze(idOrName: string): Promise<{
    goal: Goal
    forecast: {
      projectedValue: number
      projectedDate: Date
      confidence: number
      scenarios: Array<{ name: string; value: number; probability: number }>
    }
    insights: string[]
    recommendations: string[]
  }>

  /**
   * Stream progress updates in real-time
   */
  stream(idOrName: string): AsyncIterable<GoalUpdate>
}

/**
 * Create a configured goals client
 *
 * @example
 * ```typescript
 * import { Goals } from 'goals.do'
 * const goals = Goals({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Goals(options?: ClientOptions): GoalsClient {
  return createClient<GoalsClient>('goals', options)
}

/**
 * Default goals client instance
 *
 * Uses global env from rpc.do/env for authentication.
 * In Workers, import 'rpc.do/env' before using this instance.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import { goals } from 'goals.do'
 *
 * await goals.create({ name: 'Q2 Revenue', ... })
 * ```
 */
export const goals: GoalsClient = Goals()

// Named exports
export { Goals, goals }

// Default export
export default goals

export type { ClientOptions } from 'rpc.do'
