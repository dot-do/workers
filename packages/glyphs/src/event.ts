/**
 * 巛 (event/on) glyph - Event Emission
 *
 * A visual programming glyph for event emission and subscription.
 * The 巛 character represents flowing water/river - events flowing through the system.
 *
 * Usage:
 *   // Emit via tagged template
 *   await 巛`user.created ${userData}`
 *
 *   // Subscribe with exact name
 *   巛.on('user.created', (event) => console.log(event))
 *
 *   // Subscribe with pattern
 *   巛.on('user.*', (event) => console.log(event))
 *
 *   // One-time subscription
 *   巛.once('app.ready', () => console.log('Ready!'))
 *
 *   // Programmatic emission
 *   await 巛.emit('order.placed', orderData)
 *
 * ASCII alias: on
 */

/**
 * Event data structure passed to handlers
 */
export interface EventData<T = unknown> {
  /** Event name (e.g., 'user.created') */
  name: string
  /** Event payload */
  data: T
  /** Timestamp when event was emitted */
  timestamp: number
  /** Unique event ID */
  id: string
}

/**
 * Options for event subscription
 */
export interface EventOptions {
  /** Fire handler only once then auto-unsubscribe */
  once?: boolean
  /** Higher priority handlers run first (default: 0) */
  priority?: number
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: EventData<T>) => void | Promise<void>

/**
 * Internal handler registration
 */
interface HandlerEntry {
  handler: EventHandler
  once: boolean
  priority: number
}

/**
 * Event bus interface - callable as tagged template literal with methods
 */
export interface EventBus {
  /** Emit event via tagged template */
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<void>

  /** Subscribe to event pattern */
  on(pattern: string, handler: EventHandler, options?: EventOptions): () => void

  /** Subscribe to event pattern, fire once then auto-unsubscribe */
  once(pattern: string, handler: EventHandler): () => void

  /** Unsubscribe handler(s) from pattern */
  off(pattern: string, handler?: EventHandler): void

  /** Emit event programmatically */
  emit(eventName: string, data?: unknown): Promise<void>

  /** Test if pattern matches event name */
  matches(pattern: string, eventName: string): boolean

  /** Get count of listeners for a pattern */
  listenerCount(pattern: string): number

  /** Get all registered event patterns */
  eventNames(): string[]

  /** Remove all listeners, optionally for a specific pattern */
  removeAllListeners(pattern?: string): void
}

/**
 * Generate a unique event ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Test if a pattern matches an event name
 *
 * Patterns:
 * - 'user.created' - exact match
 * - 'user.*' - matches any single segment after 'user.'
 * - '*.created' - matches any single segment before '.created'
 * - 'user.*.completed' - matches any single segment in the middle
 * - '**' - matches everything
 */
function matchesPattern(pattern: string, eventName: string): boolean {
  // Double wildcard matches everything
  if (pattern === '**') {
    return true
  }

  // Exact match
  if (pattern === eventName) {
    return true
  }

  // Check for wildcard patterns
  if (!pattern.includes('*')) {
    return false
  }

  // Split into segments
  const patternParts = pattern.split('.')
  const eventParts = eventName.split('.')

  // Must have same number of segments for single wildcard matching
  if (patternParts.length !== eventParts.length) {
    return false
  }

  // Match each segment
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const eventPart = eventParts[i]

    // Single wildcard matches any non-empty segment
    if (patternPart === '*') {
      if (!eventPart || eventPart.length === 0) {
        return false
      }
      continue
    }

    // Exact segment match required
    if (patternPart !== eventPart) {
      return false
    }
  }

  return true
}

/**
 * Create the event bus instance
 */
function createEventBus(): EventBus {
  // Map of pattern -> array of handler entries
  const handlers = new Map<string, HandlerEntry[]>()

  /**
   * Get all matching handlers for an event name, sorted by priority
   */
  function getMatchingHandlers(eventName: string): { pattern: string; entry: HandlerEntry }[] {
    const matched: { pattern: string; entry: HandlerEntry }[] = []

    for (const [pattern, entries] of handlers) {
      if (matchesPattern(pattern, eventName)) {
        for (const entry of entries) {
          matched.push({ pattern, entry })
        }
      }
    }

    // Sort by priority descending (higher priority first)
    matched.sort((a, b) => b.entry.priority - a.entry.priority)

    return matched
  }

  /**
   * Internal emit implementation
   */
  async function emitEvent(eventName: string, data: unknown): Promise<void> {
    const eventData: EventData = {
      name: eventName,
      data,
      timestamp: Date.now(),
      id: generateId(),
    }

    const matchedHandlers = getMatchingHandlers(eventName)
    const toRemove: { pattern: string; handler: EventHandler }[] = []

    // Execute handlers sequentially in priority order
    for (const { pattern, entry } of matchedHandlers) {
      try {
        await entry.handler(eventData)
      } catch {
        // Error isolation - one handler failing doesn't break others
        // Silently continue to next handler
      }

      // Track once handlers for removal
      if (entry.once) {
        toRemove.push({ pattern, handler: entry.handler })
      }
    }

    // Remove once handlers after all have run
    for (const { pattern, handler } of toRemove) {
      removeHandler(pattern, handler)
    }
  }

  /**
   * Remove a specific handler from a pattern
   */
  function removeHandler(pattern: string, handler: EventHandler): void {
    const entries = handlers.get(pattern)
    if (entries) {
      const index = entries.findIndex((e) => e.handler === handler)
      if (index !== -1) {
        entries.splice(index, 1)
        if (entries.length === 0) {
          handlers.delete(pattern)
        }
      }
    }
  }

  /**
   * Tagged template literal handler
   */
  const taggedTemplate = async function (strings: TemplateStringsArray, ...values: unknown[]): Promise<void> {
    // Parse event name from template
    // Format: 巛`event.name ${data}` or 巛`event.name ${v1} ${v2}`
    const eventName = strings[0].trim()

    // Determine data based on interpolated values
    let data: unknown
    if (values.length === 0) {
      data = undefined
    } else if (values.length === 1) {
      data = values[0]
    } else {
      data = { values }
    }

    await emitEvent(eventName, data)
  }

  // Create the callable function with methods
  const eventBus = taggedTemplate as unknown as EventBus

  /**
   * Subscribe to event pattern
   */
  eventBus.on = function (pattern: string, handler: EventHandler, options?: EventOptions): () => void {
    const entry: HandlerEntry = {
      handler,
      once: options?.once ?? false,
      priority: options?.priority ?? 0,
    }

    if (!handlers.has(pattern)) {
      handlers.set(pattern, [])
    }
    handlers.get(pattern)!.push(entry)

    // Return unsubscribe function
    return () => {
      removeHandler(pattern, handler)
    }
  }

  /**
   * Subscribe to event pattern, fire once then auto-unsubscribe
   */
  eventBus.once = function (pattern: string, handler: EventHandler): () => void {
    return eventBus.on(pattern, handler, { once: true })
  }

  /**
   * Unsubscribe handler(s) from pattern
   */
  eventBus.off = function (pattern: string, handler?: EventHandler): void {
    if (handler) {
      removeHandler(pattern, handler)
    } else {
      // Remove all handlers for pattern
      handlers.delete(pattern)
    }
  }

  /**
   * Emit event programmatically
   */
  eventBus.emit = async function (eventName: string, data?: unknown): Promise<void> {
    await emitEvent(eventName, data)
  }

  /**
   * Test if pattern matches event name
   */
  eventBus.matches = function (pattern: string, eventName: string): boolean {
    return matchesPattern(pattern, eventName)
  }

  /**
   * Get count of listeners for a specific pattern
   */
  eventBus.listenerCount = function (pattern: string): number {
    const entries = handlers.get(pattern)
    return entries ? entries.length : 0
  }

  /**
   * Get all registered event patterns
   */
  eventBus.eventNames = function (): string[] {
    return Array.from(handlers.keys())
  }

  /**
   * Remove all listeners, optionally for a specific pattern
   */
  eventBus.removeAllListeners = function (pattern?: string): void {
    if (pattern) {
      handlers.delete(pattern)
    } else {
      handlers.clear()
    }
  }

  return eventBus
}

/**
 * The 巛 glyph - Event emission and subscription
 *
 * Visual metaphor: 巛 looks like flowing water/river - events flowing through the system
 */
export const 巛: EventBus = createEventBus()

/**
 * ASCII alias for 巛
 */
export const on: EventBus = 巛
