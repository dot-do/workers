/**
 * projects.do - What do you want projects to .do for you?
 *
 * AI-native project management for autonomous teams.
 * Projects that run themselves with human oversight.
 *
 * @see https://projects.do
 *
 * @example
 * ```typescript
 * import projects from 'projects.do'
 *
 * // Tagged template - describe your project
 * const project = await projects.do`
 *   Launch new mobile app with 3 phases:
 *   Discovery (2 weeks), Development (8 weeks), Launch (2 weeks)
 * `
 *
 * // Create with full control
 * const launch = await projects.create({
 *   name: 'Mobile App Launch',
 *   description: 'Launch v2.0 of our mobile application',
 *   phases: [
 *     { name: 'Discovery', duration: '2 weeks' },
 *     { name: 'Development', duration: '8 weeks' },
 *     { name: 'Launch', duration: '2 weeks' }
 *   ]
 * })
 *
 * // Assign resources
 * await projects.team.assign(launch.id, { role: 'lead', member: 'alice@example.com' })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Project {
  id: string
  name: string
  description?: string
  status: 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  startDate?: Date
  endDate?: Date
  targetDate?: Date
  phases?: Phase[]
  team?: TeamMember[]
  budget?: Budget
  risks?: Risk[]
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface Phase {
  id: string
  projectId: string
  name: string
  description?: string
  status: 'pending' | 'active' | 'completed' | 'blocked'
  order: number
  duration?: string
  startDate?: Date
  endDate?: Date
  deliverables?: Deliverable[]
  dependencies?: string[] // Phase IDs
  progress: number // 0-100
}

export interface Deliverable {
  id: string
  phaseId: string
  name: string
  description?: string
  status: 'pending' | 'in_progress' | 'review' | 'completed'
  assignee?: string
  dueDate?: Date
  completedAt?: Date
}

export interface TeamMember {
  id: string
  projectId: string
  memberId: string
  email: string
  name?: string
  role: 'owner' | 'lead' | 'member' | 'reviewer' | 'stakeholder'
  allocation: number // Percentage 0-100
  skills?: string[]
  joinedAt: Date
}

export interface Resource {
  id: string
  projectId: string
  type: 'human' | 'budget' | 'tool' | 'infrastructure'
  name: string
  quantity: number
  unit?: string
  cost?: number
  allocated: number
  available: number
  startDate?: Date
  endDate?: Date
}

export interface Budget {
  id: string
  projectId: string
  total: number
  currency: string
  allocated: number
  spent: number
  remaining: number
  categories?: BudgetCategory[]
}

export interface BudgetCategory {
  name: string
  allocated: number
  spent: number
}

export interface Risk {
  id: string
  projectId: string
  name: string
  description?: string
  probability: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high' | 'critical'
  status: 'identified' | 'mitigated' | 'occurred' | 'resolved'
  mitigation?: string
  owner?: string
  identifiedAt: Date
  resolvedAt?: Date
}

export interface Timeline {
  projectId: string
  startDate: Date
  endDate: Date
  milestones: Milestone[]
  criticalPath: string[] // Phase IDs in order
  slippage?: number // Days behind schedule
}

export interface Milestone {
  id: string
  name: string
  date: Date
  status: 'upcoming' | 'achieved' | 'missed'
  phaseId?: string
}

export interface ProjectAnalytics {
  projectId: string
  progress: number
  healthScore: number // 0-100
  velocity: number
  burndown: { date: Date; remaining: number }[]
  teamUtilization: number
  budgetUtilization: number
  riskScore: number
  predictedCompletion?: Date
}

export interface DoOptions {
  context?: Record<string, unknown>
  template?: string
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
export interface ProjectsClient {
  /**
   * Create a project from natural language
   *
   * @example
   * ```typescript
   * const project = await projects.do`
   *   Launch mobile app with discovery, development, and launch phases.
   *   Budget $50k, timeline 12 weeks, need 2 developers and 1 designer.
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Project>>

  /**
   * Create a new project
   */
  create(project: {
    name: string
    description?: string
    priority?: Project['priority']
    startDate?: Date
    targetDate?: Date
    phases?: Array<{ name: string; duration?: string; description?: string }>
    budget?: { total: number; currency?: string }
    tags?: string[]
    metadata?: Record<string, unknown>
  }): Promise<Project>

  /**
   * Get a project by ID or name
   */
  get(idOrName: string): Promise<Project>

  /**
   * List all projects
   */
  list(options?: {
    status?: Project['status']
    priority?: Project['priority']
    tag?: string
    limit?: number
  }): Promise<Project[]>

  /**
   * Update a project
   */
  update(idOrName: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Project>

  /**
   * Delete a project
   */
  delete(idOrName: string): Promise<void>

  /**
   * Phase management
   */
  phases: {
    /**
     * List phases for a project
     */
    list(projectId: string): Promise<Phase[]>

    /**
     * Add a phase to a project
     */
    add(projectId: string, phase: {
      name: string
      description?: string
      duration?: string
      order?: number
      dependencies?: string[]
    }): Promise<Phase>

    /**
     * Update a phase
     */
    update(phaseId: string, updates: Partial<Omit<Phase, 'id' | 'projectId'>>): Promise<Phase>

    /**
     * Complete a phase
     */
    complete(phaseId: string): Promise<Phase>

    /**
     * Add deliverable to a phase
     */
    addDeliverable(phaseId: string, deliverable: {
      name: string
      description?: string
      assignee?: string
      dueDate?: Date
    }): Promise<Deliverable>
  }

  /**
   * Team management
   */
  team: {
    /**
     * List team members
     */
    list(projectId: string): Promise<TeamMember[]>

    /**
     * Assign a team member
     */
    assign(projectId: string, member: {
      email: string
      name?: string
      role: TeamMember['role']
      allocation?: number
      skills?: string[]
    }): Promise<TeamMember>

    /**
     * Update team member
     */
    update(memberId: string, updates: Partial<Omit<TeamMember, 'id' | 'projectId'>>): Promise<TeamMember>

    /**
     * Remove team member
     */
    remove(memberId: string): Promise<void>

    /**
     * Get team availability
     */
    availability(projectId: string): Promise<Array<{ memberId: string; available: number; allocated: number }>>
  }

  /**
   * Resource management
   */
  resources: {
    /**
     * List resources
     */
    list(projectId: string): Promise<Resource[]>

    /**
     * Allocate a resource
     */
    allocate(projectId: string, resource: {
      type: Resource['type']
      name: string
      quantity: number
      unit?: string
      cost?: number
      startDate?: Date
      endDate?: Date
    }): Promise<Resource>

    /**
     * Update resource allocation
     */
    update(resourceId: string, updates: Partial<Omit<Resource, 'id' | 'projectId'>>): Promise<Resource>

    /**
     * Release a resource
     */
    release(resourceId: string): Promise<void>

    /**
     * Check resource conflicts
     */
    conflicts(projectId: string): Promise<Array<{ resource: Resource; conflictsWith: string[] }>>
  }

  /**
   * Risk management
   */
  risks: {
    /**
     * List risks
     */
    list(projectId: string): Promise<Risk[]>

    /**
     * Identify a risk
     */
    identify(projectId: string, risk: {
      name: string
      description?: string
      probability: Risk['probability']
      impact: Risk['impact']
      mitigation?: string
      owner?: string
    }): Promise<Risk>

    /**
     * Update risk status
     */
    update(riskId: string, updates: Partial<Omit<Risk, 'id' | 'projectId'>>): Promise<Risk>

    /**
     * Mitigate a risk
     */
    mitigate(riskId: string, mitigation: string): Promise<Risk>

    /**
     * Resolve a risk
     */
    resolve(riskId: string): Promise<Risk>

    /**
     * Get risk assessment
     */
    assess(projectId: string): Promise<{ score: number; topRisks: Risk[]; recommendations: string[] }>
  }

  /**
   * Budget management
   */
  budget: {
    /**
     * Get budget details
     */
    get(projectId: string): Promise<Budget>

    /**
     * Set project budget
     */
    set(projectId: string, budget: {
      total: number
      currency?: string
      categories?: Array<{ name: string; allocated: number }>
    }): Promise<Budget>

    /**
     * Record expense
     */
    spend(projectId: string, expense: {
      amount: number
      category?: string
      description?: string
      date?: Date
    }): Promise<Budget>

    /**
     * Get budget forecast
     */
    forecast(projectId: string): Promise<{
      projectedTotal: number
      variance: number
      burnRate: number
      runwayDays: number
    }>
  }

  /**
   * Timeline management
   */
  timeline: {
    /**
     * Get project timeline
     */
    get(projectId: string): Promise<Timeline>

    /**
     * Add milestone
     */
    addMilestone(projectId: string, milestone: {
      name: string
      date: Date
      phaseId?: string
    }): Promise<Milestone>

    /**
     * Update milestone
     */
    updateMilestone(milestoneId: string, updates: Partial<Omit<Milestone, 'id'>>): Promise<Milestone>

    /**
     * Get critical path
     */
    criticalPath(projectId: string): Promise<Phase[]>

    /**
     * Adjust timeline
     */
    adjust(projectId: string, adjustment: {
      startDate?: Date
      endDate?: Date
      shiftDays?: number
    }): Promise<Timeline>
  }

  /**
   * Get project analytics
   */
  analytics(projectId: string): Promise<ProjectAnalytics>

  /**
   * Get project health
   */
  health(projectId: string): Promise<{
    score: number
    status: 'healthy' | 'at_risk' | 'critical'
    issues: string[]
    recommendations: string[]
  }>

  /**
   * Generate project report
   */
  report(projectId: string, options?: {
    format?: 'summary' | 'detailed' | 'executive'
    includeAnalytics?: boolean
    includeBudget?: boolean
    includeRisks?: boolean
  }): Promise<{
    project: Project
    summary: string
    analytics?: ProjectAnalytics
    recommendations?: string[]
  }>
}

/**
 * Create a configured projects client
 */
export function Projects(options?: ClientOptions): ProjectsClient {
  return createClient<ProjectsClient>('https://projects.do', options)
}

/**
 * Default projects client
 */
export const projects: ProjectsClient = Projects({
  apiKey: typeof process !== 'undefined' ? (process.env?.PROJECTS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

export default projects

export type { ClientOptions } from 'rpc.do'
