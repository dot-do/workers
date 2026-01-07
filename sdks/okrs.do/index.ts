/**
 * okrs.do - What do you want OKRs to .do for you?
 *
 * Objectives and Key Results with automatic scoring.
 * Connect your goals to real metrics and let them score themselves.
 *
 * @see https://okrs.do
 *
 * @example
 * ```typescript
 * import okrs from 'okrs.do'
 *
 * // Tagged template - describe what you want to achieve
 * const objective = await okrs.do`
 *   Increase customer retention by improving onboarding experience.
 *   Track completion rate, time-to-value, and NPS scores.
 * `
 *
 * // Create with full control
 * const okr = await okrs.create({
 *   objective: 'Double revenue from enterprise customers',
 *   keyResults: [
 *     { metric: 'enterprise_revenue', target: 2000000, baseline: 1000000 },
 *     { metric: 'enterprise_customers', target: 50, baseline: 25 },
 *     { metric: 'avg_deal_size', target: 80000, baseline: 40000 }
 *   ],
 *   cycle: 'Q1-2025'
 * })
 *
 * // Check current score
 * const score = await okrs.score(okr.id)
 * console.log(`Progress: ${score.overall}%`)
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types
export interface KeyResult {
  id: string
  name: string
  metric: string
  baseline: number
  target: number
  current: number
  score: number // 0-1
  unit?: string
  direction?: 'increase' | 'decrease' | 'maintain'
  source?: string // Integration source for auto-tracking
  lastUpdated: Date
}

export interface Objective {
  id: string
  name: string
  description?: string
  keyResults: KeyResult[]
  score: number // 0-1, computed from key results
  owner?: string
  team?: string
  parentId?: string // For cascading OKRs
  cycleId: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

export interface OKR extends Objective {
  /** Aligned OKRs (children) */
  aligned?: Objective[]
  /** Parent OKR (if this is a team/individual OKR aligned to company) */
  parent?: Objective
}

export interface Score {
  objectiveId: string
  overall: number // 0-100 percentage
  keyResults: Array<{
    id: string
    name: string
    score: number // 0-100
    current: number
    target: number
    progress: 'on-track' | 'at-risk' | 'behind'
  }>
  trend: 'improving' | 'stable' | 'declining'
  lastCalculated: Date
}

export interface Cycle {
  id: string
  name: string // e.g., 'Q1-2025', 'H1-2025', '2025'
  startDate: Date
  endDate: Date
  status: 'planning' | 'active' | 'review' | 'closed'
  objectives: number
  avgScore: number
  createdAt: Date
}

export interface CheckIn {
  id: string
  objectiveId: string
  keyResultId?: string
  value?: number
  note: string
  confidence: 'high' | 'medium' | 'low'
  blockers?: string[]
  createdBy: string
  createdAt: Date
}

export interface AlignmentOptions {
  /** Parent objective ID */
  parentId: string
  /** How this OKR contributes to the parent */
  contribution?: string
}

export interface CascadeOptions {
  /** Teams or individuals to cascade to */
  to: string[]
  /** Auto-generate key results */
  autoGenerate?: boolean
}

export interface CreateObjectiveInput {
  objective: string
  description?: string
  keyResults: Array<{
    name?: string
    metric: string
    target: number
    baseline?: number
    unit?: string
    direction?: 'increase' | 'decrease' | 'maintain'
    source?: string
  }>
  owner?: string
  team?: string
  cycle?: string
  parentId?: string
}

// Client interface
export interface OKRsClient {
  /**
   * Create an OKR from natural language
   *
   * @example
   * ```typescript
   * const okr = await okrs.do`
   *   Become the market leader in developer tools.
   *   Track monthly active users (target: 100k),
   *   GitHub stars (target: 10k),
   *   and NPS score (target: 50)
   * `
   * ```
   */
  do: TaggedTemplate<Promise<OKR>>

  /**
   * Create an OKR with full control
   *
   * @example
   * ```typescript
   * const okr = await okrs.create({
   *   objective: 'Improve customer satisfaction',
   *   keyResults: [
   *     { metric: 'nps_score', target: 60, baseline: 40 },
   *     { metric: 'support_response_time', target: 1, baseline: 4, unit: 'hours' },
   *     { metric: 'churn_rate', target: 2, baseline: 5, direction: 'decrease' }
   *   ],
   *   cycle: 'Q2-2025'
   * })
   * ```
   */
  create(input: CreateObjectiveInput): Promise<OKR>

  /**
   * Get an OKR by ID
   */
  get(id: string): Promise<OKR>

  /**
   * List OKRs with optional filters
   */
  list(options?: {
    cycle?: string
    team?: string
    owner?: string
    status?: Objective['status']
    parentId?: string
  }): Promise<OKR[]>

  /**
   * Update an OKR
   */
  update(id: string, updates: Partial<CreateObjectiveInput>): Promise<OKR>

  /**
   * Delete an OKR
   */
  delete(id: string): Promise<void>

  // Scoring

  /**
   * Get current score for an OKR
   *
   * @example
   * ```typescript
   * const score = await okrs.score('okr_123')
   * console.log(`Overall: ${score.overall}%`)
   * score.keyResults.forEach(kr => {
   *   console.log(`${kr.name}: ${kr.score}% (${kr.progress})`)
   * })
   * ```
   */
  score(id: string): Promise<Score>

  /**
   * Update a key result value manually
   */
  updateKeyResult(okrId: string, keyResultId: string, value: number): Promise<KeyResult>

  // Check-ins

  /**
   * Record a check-in for an OKR
   *
   * @example
   * ```typescript
   * await okrs.checkIn('okr_123', {
   *   note: 'Launched new onboarding flow, expecting 20% improvement',
   *   confidence: 'high',
   *   keyResultUpdates: [
   *     { id: 'kr_1', value: 75 }
   *   ]
   * })
   * ```
   */
  checkIn(id: string, data: {
    note: string
    confidence?: 'high' | 'medium' | 'low'
    blockers?: string[]
    keyResultUpdates?: Array<{ id: string; value: number }>
  }): Promise<CheckIn>

  /**
   * List check-ins for an OKR
   */
  checkIns(okrId: string): Promise<CheckIn[]>

  // Alignment

  /**
   * Align an OKR to a parent OKR
   *
   * @example
   * ```typescript
   * // Align team OKR to company OKR
   * await okrs.align('team_okr_123', { parentId: 'company_okr_456' })
   * ```
   */
  align(id: string, options: AlignmentOptions): Promise<OKR>

  /**
   * Cascade an OKR down to teams or individuals
   *
   * @example
   * ```typescript
   * // Create aligned OKRs for teams
   * const teamOkrs = await okrs.cascade('company_okr_123', {
   *   to: ['engineering', 'sales', 'product'],
   *   autoGenerate: true
   * })
   * ```
   */
  cascade(id: string, options: CascadeOptions): Promise<OKR[]>

  /**
   * Get alignment tree (parent and children)
   */
  tree(id: string): Promise<{
    root: OKR
    children: OKR[]
    depth: number
  }>

  // Cycles

  /**
   * Create a new OKR cycle
   *
   * @example
   * ```typescript
   * const cycle = await okrs.cycle.create({
   *   name: 'Q1-2025',
   *   startDate: new Date('2025-01-01'),
   *   endDate: new Date('2025-03-31')
   * })
   * ```
   */
  cycle: {
    create(input: { name: string; startDate: Date; endDate: Date }): Promise<Cycle>
    get(id: string): Promise<Cycle>
    list(): Promise<Cycle[]>
    current(): Promise<Cycle>
    activate(id: string): Promise<Cycle>
    close(id: string): Promise<Cycle>
  }

  // Analytics

  /**
   * Get score history for an OKR
   */
  history(id: string, options?: { from?: Date; to?: Date }): Promise<Array<{
    date: Date
    score: number
    keyResults: Array<{ id: string; score: number }>
  }>>

  /**
   * Get OKR analytics for a cycle
   */
  analytics(cycleId: string): Promise<{
    totalObjectives: number
    avgScore: number
    distribution: { green: number; yellow: number; red: number }
    topPerformers: OKR[]
    atRisk: OKR[]
  }>
}

/**
 * Create a configured OKRs client
 *
 * @example
 * ```typescript
 * import { OKRs } from 'okrs.do'
 * const okrs = OKRs({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function OKRs(options?: ClientOptions): OKRsClient {
  return createClient<OKRsClient>('https://okrs.do', options)
}

/**
 * Default OKRs client instance
 *
 * For Workers environment, import 'rpc.do/env' first to configure API keys
 * from environment variables automatically.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import { okrs } from 'okrs.do'
 *
 * await okrs.score('objective-1')
 * ```
 */
export const okrs: OKRsClient = OKRs()

// Named exports
export { OKRs, okrs }

// Default export = camelCase instance
export default okrs

export type { ClientOptions } from 'rpc.do'
