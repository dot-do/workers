/**
 * plans.do - What do you want plans to .do for you?
 *
 * Strategic planning and roadmapping that executes itself.
 *
 * @see https://plans.do
 *
 * @example
 * ```typescript
 * import plans from 'plans.do'
 *
 * // Tagged template - describe what you want
 * const roadmap = await plans.do`
 *   Launch MVP by Q1, scale to 1000 users by Q2,
 *   achieve profitability by Q4
 * `
 *
 * // Create with full control
 * const productPlan = await plans.create({
 *   name: 'Product Launch 2025',
 *   objectives: [
 *     { name: 'Market Validation', keyResults: ['100 interviews', '50 signups'] },
 *     { name: 'MVP Launch', keyResults: ['Core features live', '10 paying customers'] }
 *   ],
 *   milestones: [
 *     { name: 'Alpha Release', target: '2025-03-01' },
 *     { name: 'Public Launch', target: '2025-06-01' }
 *   ]
 * })
 *
 * // Track progress
 * await plans.milestones.complete('alpha-release')
 * const progress = await plans.timeline('product-launch-2025')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Objective {
  id: string
  name: string
  description?: string
  keyResults: KeyResult[]
  progress: number // 0-100
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed'
  owner?: string
  dueDate?: Date
}

export interface KeyResult {
  id: string
  name: string
  target: string | number
  current?: string | number
  progress: number // 0-100
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed'
}

export interface Milestone {
  id: string
  name: string
  description?: string
  target: Date | string
  completedAt?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'missed'
  dependencies?: string[] // milestone IDs
  deliverables?: string[]
  owner?: string
}

export interface Timeline {
  id: string
  planId: string
  milestones: Milestone[]
  startDate: Date
  endDate: Date
  progress: number // 0-100
  criticalPath: string[] // milestone IDs on critical path
}

export interface Plan {
  id: string
  name: string
  description?: string
  vision?: string
  objectives: Objective[]
  milestones: Milestone[]
  timeline?: Timeline
  status: 'draft' | 'active' | 'completed' | 'archived'
  owner?: string
  collaborators?: string[]
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface PlanVersion {
  id: string
  planId: string
  version: number
  snapshot: Plan
  changedBy?: string
  changeNote?: string
  createdAt: Date
}

export interface PlanShare {
  id: string
  planId: string
  shareType: 'view' | 'edit' | 'comment'
  shareWith: string // email or team ID
  expiresAt?: Date
  createdAt: Date
}

export interface DoOptions {
  context?: Record<string, unknown>
  template?: 'okr' | 'roadmap' | 'sprint' | 'strategic'
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

// Milestones sub-client
export interface MilestonesClient {
  /**
   * Get a milestone by ID
   */
  get(milestoneId: string): Promise<Milestone>

  /**
   * List milestones for a plan
   */
  list(planId: string): Promise<Milestone[]>

  /**
   * Add a milestone to a plan
   */
  add(planId: string, milestone: Omit<Milestone, 'id' | 'status'>): Promise<Milestone>

  /**
   * Update a milestone
   */
  update(milestoneId: string, updates: Partial<Milestone>): Promise<Milestone>

  /**
   * Mark a milestone as complete
   */
  complete(milestoneId: string): Promise<Milestone>

  /**
   * Remove a milestone
   */
  remove(milestoneId: string): Promise<void>

  /**
   * Get milestones due soon
   */
  upcoming(options?: { days?: number; planId?: string }): Promise<Milestone[]>

  /**
   * Get overdue milestones
   */
  overdue(planId?: string): Promise<Milestone[]>
}

// Client interface
export interface PlansClient {
  /**
   * Create a plan from natural language
   *
   * @example
   * ```typescript
   * const plan = await plans.do`
   *   Launch SaaS product: validate market in Q1,
   *   build MVP in Q2, acquire 100 customers in Q3
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Plan>>

  /**
   * Create a new plan
   *
   * @example
   * ```typescript
   * const plan = await plans.create({
   *   name: '2025 Growth Strategy',
   *   vision: 'Become market leader in our segment',
   *   objectives: [
   *     { name: 'Revenue Growth', keyResults: ['$1M ARR', '500 customers'] }
   *   ]
   * })
   * ```
   */
  create(plan: Omit<Plan, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Plan>

  /**
   * Get a plan by ID or name
   */
  get(nameOrId: string): Promise<Plan>

  /**
   * List all plans
   */
  list(options?: {
    status?: Plan['status']
    owner?: string
    tag?: string
    limit?: number
  }): Promise<Plan[]>

  /**
   * Update a plan
   */
  update(nameOrId: string, updates: Partial<Plan>): Promise<Plan>

  /**
   * Delete a plan
   */
  delete(nameOrId: string): Promise<void>

  /**
   * Milestone management
   */
  milestones: MilestonesClient

  /**
   * Get timeline view for a plan
   *
   * @example
   * ```typescript
   * const timeline = await plans.timeline('2025-roadmap')
   * console.log(timeline.criticalPath)
   * console.log(timeline.progress)
   * ```
   */
  timeline(planId: string): Promise<Timeline>

  /**
   * Share a plan with others
   *
   * @example
   * ```typescript
   * await plans.share('2025-roadmap', {
   *   shareWith: 'team@company.com',
   *   shareType: 'edit'
   * })
   * ```
   */
  share(planId: string, options: {
    shareWith: string
    shareType: 'view' | 'edit' | 'comment'
    expiresAt?: Date
  }): Promise<PlanShare>

  /**
   * Get plan version history
   */
  versions(planId: string): Promise<PlanVersion[]>

  /**
   * Restore a plan to a previous version
   */
  restore(planId: string, versionId: string): Promise<Plan>

  /**
   * Duplicate a plan
   */
  duplicate(planId: string, options?: { name?: string }): Promise<Plan>

  /**
   * Archive a plan
   */
  archive(planId: string): Promise<Plan>

  /**
   * Calculate plan progress
   */
  progress(planId: string): Promise<{
    overall: number
    objectives: number
    milestones: number
    onTrack: boolean
  }>

  /**
   * Get plan analytics
   */
  analytics(planId: string): Promise<{
    completionRate: number
    avgMilestoneDelay: number
    objectiveProgress: Record<string, number>
    riskAreas: string[]
  }>

  /**
   * Sync plan with external tools (Notion, Linear, etc.)
   */
  sync(planId: string, integration: {
    type: 'notion' | 'linear' | 'jira' | 'asana'
    config: Record<string, unknown>
  }): Promise<void>
}

/**
 * Create a configured plans client
 */
export function Plans(options?: ClientOptions): PlansClient {
  return createClient<PlansClient>('https://plans.do', options)
}

/**
 * Default plans client
 */
export const plans: PlansClient = Plans({
  apiKey: typeof process !== 'undefined' ? (process.env?.PLANS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

export default plans

export type { ClientOptions } from 'rpc.do'
