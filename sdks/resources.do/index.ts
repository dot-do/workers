/**
 * resources.do - What do you want resources to .do for you?
 *
 * Intelligent resource management with auto-optimization.
 * Allocate, schedule, and optimize resources automatically.
 *
 * @see https://resources.do
 *
 * @example
 * ```typescript
 * import resources from 'resources.do'
 *
 * // Tagged template - describe what you want
 * const pool = await resources.do`
 *   Meeting rooms with video conferencing,
 *   max 10 people, available 9am-6pm
 * `
 *
 * // Create a resource
 * const room = await resources.create({
 *   name: 'Conference Room A',
 *   type: 'meeting-room',
 *   capacity: { seats: 10 },
 *   availability: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], hours: '09:00-18:00' }
 * })
 *
 * // Allocate resources
 * const allocation = await resources.allocate({
 *   resourceId: room.id,
 *   start: new Date('2024-03-15T10:00:00'),
 *   end: new Date('2024-03-15T11:00:00'),
 *   requestedBy: 'user_123'
 * })
 *
 * // Find availability
 * const slots = await resources.availability('meeting-room', {
 *   date: '2024-03-15',
 *   duration: '1h'
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Resource {
  id: string
  name: string
  type: string
  description?: string
  /** Resource capacity (e.g., seats, bandwidth, storage) */
  capacity: Record<string, number>
  /** Availability windows */
  availability?: AvailabilityWindow
  /** Resource attributes for filtering/matching */
  attributes?: Record<string, unknown>
  /** Current status */
  status: 'available' | 'partially_available' | 'unavailable' | 'maintenance'
  /** Location or zone */
  location?: string
  /** Cost per unit time (optional) */
  cost?: { amount: number; currency: string; per: string }
  /** Tags for organization */
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface AvailabilityWindow {
  /** Days of week: ['Mon', 'Tue', ...] */
  days?: string[]
  /** Hours in format 'HH:MM-HH:MM' */
  hours?: string
  /** Timezone */
  timezone?: string
  /** Specific date ranges */
  ranges?: Array<{ start: Date; end: Date }>
  /** Blackout dates */
  blackouts?: Array<{ start: Date; end: Date; reason?: string }>
}

export interface Allocation {
  id: string
  resourceId: string
  resourceName: string
  /** Who requested the allocation */
  requestedBy: string
  /** Start time */
  start: Date
  /** End time */
  end: Date
  /** Allocation status */
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  /** Purpose or description */
  purpose?: string
  /** Quantity of capacity used */
  quantity?: Record<string, number>
  /** Priority level (1-5, 1 is highest) */
  priority?: number
  /** Whether this allocation can be preempted */
  preemptible?: boolean
  /** Recurring schedule */
  recurrence?: RecurrenceRule
  /** Notes or metadata */
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval?: number
  until?: Date
  count?: number
  byDay?: string[]
}

export interface Capacity {
  resourceId: string
  resourceName: string
  /** Total capacity */
  total: Record<string, number>
  /** Currently allocated */
  allocated: Record<string, number>
  /** Available capacity */
  available: Record<string, number>
  /** Utilization percentage */
  utilization: number
  /** Time period for this snapshot */
  period?: { start: Date; end: Date }
}

export interface Availability {
  resourceId: string
  resourceName: string
  /** Available time slots */
  slots: AvailabilitySlot[]
  /** Next available time */
  nextAvailable?: Date
}

export interface AvailabilitySlot {
  start: Date
  end: Date
  /** Available capacity during this slot */
  capacity: Record<string, number>
}

export interface Conflict {
  id: string
  /** Conflicting allocations */
  allocations: Array<{
    id: string
    resourceId: string
    requestedBy: string
    start: Date
    end: Date
    priority?: number
  }>
  /** Type of conflict */
  type: 'overlap' | 'overcapacity' | 'unavailable' | 'blackout'
  /** Severity */
  severity: 'warning' | 'error' | 'critical'
  /** Suggested resolutions */
  resolutions?: ConflictResolution[]
  detectedAt: Date
}

export interface ConflictResolution {
  type: 'reschedule' | 'relocate' | 'split' | 'cancel' | 'preempt'
  description: string
  /** Affected allocation IDs */
  affectedAllocations: string[]
  /** Suggested new values */
  suggestion?: {
    resourceId?: string
    start?: Date
    end?: Date
  }
}

export interface OptimizationResult {
  /** Original allocations */
  original: Allocation[]
  /** Optimized allocations */
  optimized: Allocation[]
  /** Changes made */
  changes: Array<{
    allocationId: string
    change: 'moved' | 'resized' | 'reassigned' | 'removed'
    before: Partial<Allocation>
    after: Partial<Allocation>
  }>
  /** Improvement metrics */
  metrics: {
    utilizationBefore: number
    utilizationAfter: number
    conflictsResolved: number
    costSavings?: number
  }
}

export interface DoOptions {
  context?: Record<string, unknown>
  constraints?: ResourceConstraints
}

export interface ResourceConstraints {
  /** Minimum capacity requirements */
  minCapacity?: Record<string, number>
  /** Maximum cost */
  maxCost?: { amount: number; currency: string }
  /** Required attributes */
  requiredAttributes?: Record<string, unknown>
  /** Preferred time windows */
  preferredTimes?: Array<{ start: string; end: string }>
  /** Location constraints */
  location?: string | string[]
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
export interface ResourcesClient {
  /**
   * Create resources from natural language
   *
   * @example
   * ```typescript
   * const pool = await resources.do`
   *   GPU cluster with 8 NVIDIA A100s,
   *   available 24/7, preemptible for batch jobs
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Resource>>

  /**
   * Create a new resource
   *
   * @example
   * ```typescript
   * const room = await resources.create({
   *   name: 'Conference Room A',
   *   type: 'meeting-room',
   *   capacity: { seats: 10 }
   * })
   * ```
   */
  create(resource: {
    name: string
    type: string
    description?: string
    capacity: Record<string, number>
    availability?: AvailabilityWindow
    attributes?: Record<string, unknown>
    location?: string
    cost?: { amount: number; currency: string; per: string }
    tags?: string[]
  }): Promise<Resource>

  /**
   * Get a resource by ID
   */
  get(id: string): Promise<Resource>

  /**
   * List resources with optional filters
   */
  list(options?: {
    type?: string
    status?: Resource['status']
    location?: string
    tags?: string[]
    limit?: number
  }): Promise<Resource[]>

  /**
   * Update a resource
   */
  update(id: string, updates: Partial<Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Resource>

  /**
   * Delete a resource
   */
  delete(id: string): Promise<void>

  // Allocation methods

  /**
   * Allocate a resource
   *
   * @example
   * ```typescript
   * const allocation = await resources.allocate({
   *   resourceId: 'room_123',
   *   start: new Date('2024-03-15T10:00:00'),
   *   end: new Date('2024-03-15T11:00:00'),
   *   requestedBy: 'user_456'
   * })
   * ```
   */
  allocate(request: {
    resourceId: string
    start: Date
    end: Date
    requestedBy: string
    purpose?: string
    quantity?: Record<string, number>
    priority?: number
    preemptible?: boolean
    recurrence?: RecurrenceRule
    metadata?: Record<string, unknown>
  }): Promise<Allocation>

  /**
   * Release an allocation
   */
  release(allocationId: string): Promise<void>

  /**
   * Get availability for a resource type
   *
   * @example
   * ```typescript
   * const slots = await resources.availability('meeting-room', {
   *   date: '2024-03-15',
   *   duration: '1h',
   *   capacity: { seats: 5 }
   * })
   * ```
   */
  availability(resourceType: string, options?: {
    resourceId?: string
    date?: string
    start?: Date
    end?: Date
    duration?: string
    capacity?: Record<string, number>
  }): Promise<Availability[]>

  /**
   * Get capacity information
   */
  capacity(resourceId: string, options?: {
    start?: Date
    end?: Date
  }): Promise<Capacity>

  /**
   * Detect conflicts in allocations
   */
  conflicts(options?: {
    resourceId?: string
    start?: Date
    end?: Date
  }): Promise<Conflict[]>

  /**
   * Optimize resource allocations
   *
   * @example
   * ```typescript
   * const result = await resources.optimize({
   *   resourceType: 'meeting-room',
   *   goals: ['maximize_utilization', 'minimize_conflicts'],
   *   constraints: { preservePriority: true }
   * })
   * ```
   */
  optimize(options: {
    resourceType?: string
    resourceIds?: string[]
    start?: Date
    end?: Date
    goals?: Array<'maximize_utilization' | 'minimize_conflicts' | 'minimize_cost' | 'balance_load'>
    constraints?: {
      preservePriority?: boolean
      preserveConfirmed?: boolean
      maxChanges?: number
    }
  }): Promise<OptimizationResult>

  // Allocation management

  /**
   * List allocations
   */
  allocations(options?: {
    resourceId?: string
    requestedBy?: string
    status?: Allocation['status']
    start?: Date
    end?: Date
    limit?: number
  }): Promise<Allocation[]>

  /**
   * Get an allocation by ID
   */
  getAllocation(id: string): Promise<Allocation>

  /**
   * Update an allocation
   */
  updateAllocation(id: string, updates: Partial<Omit<Allocation, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Allocation>

  /**
   * Cancel an allocation
   */
  cancelAllocation(id: string): Promise<void>

  /**
   * Confirm a pending allocation
   */
  confirmAllocation(id: string): Promise<Allocation>
}

/**
 * Create a configured resources client
 */
export function Resources(options?: ClientOptions): ResourcesClient {
  return createClient<ResourcesClient>('https://resources.do', options)
}

/**
 * Default resources client
 */
export const resources: ResourcesClient = Resources({
  apiKey: typeof process !== 'undefined' ? (process.env?.RESOURCES_API_KEY || process.env?.DO_API_KEY) : undefined,
})

export default resources

export type { ClientOptions } from 'rpc.do'
