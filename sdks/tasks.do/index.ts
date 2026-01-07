/**
 * tasks.do - What do you want tasks to .do for you?
 *
 * Intelligent task management for AI and humans.
 * Assign work to the right entity, track progress, ensure completion.
 *
 * @see https://tasks.do
 *
 * @example
 * ```typescript
 * import tasks from 'tasks.do'
 *
 * // Tagged template - describe what you want
 * const task = await tasks.do`
 *   Review the Q4 marketing report and summarize key findings,
 *   then schedule a follow-up meeting with stakeholders
 * `
 *
 * // Create with full control
 * const review = await tasks.create({
 *   title: 'Review Q4 Report',
 *   description: 'Summarize key findings from quarterly marketing data',
 *   assignee: 'ai:analyst',
 *   priority: 'high',
 *   dueAt: new Date('2024-12-31')
 * })
 *
 * // Assign to AI or human
 * await tasks.assign(review.id, { to: 'ai:analyst' })
 * await tasks.assign(review.id, { to: 'user:alice@example.com' })
 *
 * // Track and complete
 * const status = await tasks.get(review.id)
 * await tasks.complete(review.id, { output: { summary: '...' } })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'blocked' | 'review' | 'completed' | 'cancelled'
export type AssigneeType = 'ai' | 'human' | 'team' | 'workflow'

export interface Assignee {
  type: AssigneeType
  id: string
  name?: string
  email?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  assignee?: Assignee
  creator: Assignee
  parentId?: string
  projectId?: string
  labels?: string[]
  dueAt?: Date
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface Assignment {
  id: string
  taskId: string
  assignee: Assignee
  assignedBy: Assignee
  assignedAt: Date
  acceptedAt?: Date
  status: 'pending' | 'accepted' | 'declined' | 'reassigned'
  notes?: string
}

export interface Comment {
  id: string
  taskId: string
  author: Assignee
  content: string
  createdAt: Date
  updatedAt?: Date
  parentId?: string
  reactions?: Record<string, string[]>
}

export interface Subtask {
  id: string
  parentId: string
  title: string
  status: TaskStatus
  assignee?: Assignee
  order: number
  createdAt: Date
  completedAt?: Date
}

export interface Dependency {
  id: string
  taskId: string
  dependsOnId: string
  type: 'blocks' | 'related' | 'parent-child'
  createdAt: Date
}

export interface CreateTaskInput {
  title: string
  description?: string
  priority?: Priority
  assignee?: string | Assignee
  parentId?: string
  projectId?: string
  labels?: string[]
  dueAt?: Date | string
  input?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  assignee?: string | Assignee
  labels?: string[]
  dueAt?: Date | string | null
  metadata?: Record<string, unknown>
}

export interface AssignInput {
  to: string | Assignee
  notes?: string
}

export interface CompleteInput {
  output?: Record<string, unknown>
  notes?: string
}

export interface ListOptions {
  status?: TaskStatus | TaskStatus[]
  priority?: Priority | Priority[]
  assignee?: string
  project?: string
  labels?: string[]
  parentId?: string
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'updatedAt' | 'dueAt' | 'priority'
  order?: 'asc' | 'desc'
}

export interface DoOptions {
  assignee?: string | Assignee
  priority?: Priority
  dueAt?: Date | string
  context?: Record<string, unknown>
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
export interface TasksClient {
  /**
   * Create a task from natural language
   *
   * @example
   * ```typescript
   * const task = await tasks.do`
   *   Review the quarterly report and extract key metrics,
   *   then prepare a summary for the board meeting
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Task>>

  /**
   * Create a new task
   *
   * @example
   * ```typescript
   * const task = await tasks.create({
   *   title: 'Review Q4 Report',
   *   description: 'Extract key metrics from quarterly data',
   *   assignee: 'ai:analyst',
   *   priority: 'high',
   *   dueAt: '2024-12-31'
   * })
   * ```
   */
  create(input: CreateTaskInput): Promise<Task>

  /**
   * Get a task by ID
   */
  get(taskId: string): Promise<Task>

  /**
   * List tasks with optional filters
   *
   * @example
   * ```typescript
   * // Get all high priority tasks
   * const urgent = await tasks.list({ priority: 'high' })
   *
   * // Get tasks assigned to AI
   * const aiTasks = await tasks.list({ assignee: 'ai:*' })
   *
   * // Get pending tasks in a project
   * const pending = await tasks.list({
   *   project: 'proj_123',
   *   status: 'pending'
   * })
   * ```
   */
  list(options?: ListOptions): Promise<Task[]>

  /**
   * Update a task
   *
   * @example
   * ```typescript
   * await tasks.update('task_123', {
   *   priority: 'critical',
   *   dueAt: new Date('2024-12-20')
   * })
   * ```
   */
  update(taskId: string, updates: UpdateTaskInput): Promise<Task>

  /**
   * Delete a task
   */
  delete(taskId: string): Promise<void>

  /**
   * Assign a task to an AI agent or human
   *
   * @example
   * ```typescript
   * // Assign to AI agent
   * await tasks.assign('task_123', { to: 'ai:analyst' })
   *
   * // Assign to human
   * await tasks.assign('task_123', { to: 'user:alice@example.com' })
   *
   * // Assign to team
   * await tasks.assign('task_123', { to: 'team:engineering' })
   * ```
   */
  assign(taskId: string, input: AssignInput): Promise<Assignment>

  /**
   * Mark a task as complete
   *
   * @example
   * ```typescript
   * await tasks.complete('task_123', {
   *   output: {
   *     summary: 'Report analysis complete',
   *     findings: ['Revenue up 15%', 'Costs down 8%']
   *   }
   * })
   * ```
   */
  complete(taskId: string, input?: CompleteInput): Promise<Task>

  /**
   * Add a comment to a task
   *
   * @example
   * ```typescript
   * await tasks.comment('task_123', 'Started analysis of section 3')
   * ```
   */
  comment(taskId: string, content: string): Promise<Comment>

  /**
   * Get or create subtasks for a task
   *
   * @example
   * ```typescript
   * // List subtasks
   * const subtasks = await tasks.subtasks('task_123')
   *
   * // Create subtask
   * const sub = await tasks.subtasks('task_123', {
   *   create: { title: 'Review section 1' }
   * })
   * ```
   */
  subtasks(taskId: string, options?: {
    create?: { title: string; assignee?: string }
  }): Promise<Subtask[]>

  /**
   * Manage task dependencies
   *
   * @example
   * ```typescript
   * // Get dependencies
   * const deps = await tasks.dependencies('task_123')
   *
   * // Add dependency (task_123 is blocked by task_456)
   * await tasks.dependencies('task_123', {
   *   add: { blockedBy: 'task_456' }
   * })
   *
   * // Remove dependency
   * await tasks.dependencies('task_123', {
   *   remove: 'task_456'
   * })
   * ```
   */
  dependencies(taskId: string, options?: {
    add?: { blockedBy: string; type?: Dependency['type'] }
    remove?: string
  }): Promise<Dependency[]>

  /**
   * Get task comments
   */
  comments(taskId: string): Promise<Comment[]>

  /**
   * Get assignment history for a task
   */
  assignments(taskId: string): Promise<Assignment[]>

  /**
   * Start working on a task (sets status to in_progress)
   */
  start(taskId: string): Promise<Task>

  /**
   * Block a task with a reason
   */
  block(taskId: string, reason: string): Promise<Task>

  /**
   * Unblock a task
   */
  unblock(taskId: string): Promise<Task>

  /**
   * Cancel a task
   */
  cancel(taskId: string, reason?: string): Promise<Task>

  /**
   * Reopen a completed or cancelled task
   */
  reopen(taskId: string): Promise<Task>

  /**
   * Get tasks that are ready to work on (no blockers)
   */
  ready(options?: Omit<ListOptions, 'status'>): Promise<Task[]>

  /**
   * Get blocked tasks
   */
  blocked(options?: Omit<ListOptions, 'status'>): Promise<Task[]>

  /**
   * Get overdue tasks
   */
  overdue(options?: Omit<ListOptions, 'status'>): Promise<Task[]>
}

/**
 * Create a configured tasks client
 *
 * @example
 * ```typescript
 * import { Tasks } from 'tasks.do'
 * const tasks = Tasks({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Tasks(options?: ClientOptions): TasksClient {
  return createClient<TasksClient>('tasks', options)
}

/**
 * Default tasks client instance
 *
 * Uses global env from rpc.do/env for authentication.
 * In Workers, import 'rpc.do/env' before using this instance.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import { tasks } from 'tasks.do'
 *
 * await tasks.create({ title: 'Review report', ... })
 * ```
 */
export const tasks: TasksClient = Tasks()

// Named exports
export { Tasks, tasks }

// Default export
export default tasks

export type { ClientOptions } from 'rpc.do'
